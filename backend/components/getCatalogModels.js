import { pool } from '../utils/dbClient.js';

/**
 * Округлить объём двигателя: 1900 → 1.9, 1950 → 2.0
 */
function ccToLiters(cc) {
  if (!cc || cc <= 0) return null;
  return Math.round(cc / 100) / 10;
}

/**
 * Перевести технический код fuel_filter в читабельное название топлива.
 * Совпадает с нормализацией в updateModelsAgg.js.
 */
const FUEL_FILTER_MAP = {
  gasoline: 'Бензин',
  diesel: 'Дизель',
  electric: 'Электро',
  gasoline_electric: 'Гибрид',
  diesel_electric: 'Гибрид',
  gas_electric: 'Гибрид',
  gas_general: 'Газ',
  gasoline_gas: 'Газ',
  CNG: 'Газ',
  '가솔린+CNG': 'Газ',
  hydrogen: 'Водород',
};

function normalizeFuelFilter(code) {
  return FUEL_FILTER_MAP[code] ?? null;
}

/**
 * Построить WHERE-условия для запроса к auto_models_agg.
 *
 * Семантика диапазонных фильтров:
 *   priceFrom  → price_max  >= X  (модель имеет хотя бы одно объявление дороже X)
 *   priceTo    → price_min  <= X  (модель имеет хотя бы одно объявление дешевле X)
 *   yearFrom   → year_max   >= X
 *   yearTo     → year_min   <= X
 *   mileageFrom → mileage_max >= X
 *   mileageTo  → mileage_min <= X
 *   hpFrom     → hp_max     >= X
 *   hpTo       → hp_min     <= X
 */
function buildAggFilters(query) {
  const {
    source,
    brand,
    yearFrom, yearTo,
    priceFrom, priceTo,
    mileageFrom, mileageTo,
    hpFrom, hpTo,
    fuelType, bodyColor,
  } = query;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (source && (source === 'K' || source === 'C')) {
    conditions.push(`source = $${idx++}`);
    params.push(source);
  }

  if (brand) {
    conditions.push(`brand = $${idx++}`);
    params.push(brand);
  }

  if (yearFrom) {
    conditions.push(`year_max >= $${idx++}`);
    params.push(parseInt(yearFrom, 10));
  }
  if (yearTo) {
    conditions.push(`year_min <= $${idx++}`);
    params.push(parseInt(yearTo, 10));
  }

  if (priceFrom) {
    conditions.push(`price_max >= $${idx++}`);
    params.push(parseInt(priceFrom, 10));
  }
  if (priceTo) {
    conditions.push(`price_min <= $${idx++}`);
    params.push(parseInt(priceTo, 10));
  }

  if (mileageFrom) {
    conditions.push(`mileage_max >= $${idx++}`);
    params.push(parseInt(mileageFrom, 10));
  }
  if (mileageTo) {
    conditions.push(`mileage_min <= $${idx++}`);
    params.push(parseInt(mileageTo, 10));
  }

  if (hpFrom) {
    conditions.push(`hp_max >= $${idx++}`);
    params.push(parseInt(hpFrom, 10));
  }
  if (hpTo) {
    conditions.push(`hp_min <= $${idx++}`);
    params.push(parseInt(hpTo, 10));
  }

  if (fuelType) {
    // Фронтенд шлёт технические коды (gasoline, diesel...), а в auto_models_agg
    // хранятся нормализованные русские значения → конвертируем и дедуплицируем
    const fuelCodes = fuelType.split(',').map(v => v.trim()).filter(Boolean);
    const russianFuels = [...new Set(fuelCodes.map(normalizeFuelFilter).filter(Boolean))];
    if (russianFuels.length > 0) {
      const placeholders = russianFuels.map(() => `$${idx++}`).join(',');
      conditions.push(`fuel_type IN (${placeholders})`);
      params.push(...russianFuels);
    }
  }

  if (bodyColor) {
    const colors = bodyColor.split(',').map(v => v.trim()).filter(Boolean);
    if (colors.length > 0) {
      const placeholders = colors.map(() => `$${idx++}`).join(',');
      conditions.push(`color_filter IN (${placeholders})`);
      params.push(...colors);
    }
  }

  return { conditions, params };
}

/**
 * Построить WHERE-условия для запроса к auto_webcatalog (точный пересчёт агрегатов).
 * Параметры идентичны фронту — те же поля что в /catalog.
 */
function buildWebcatalogFilters(query, startIdx = 1) {
  const {
    source,
    brand,
    yearFrom, monthFrom, yearTo, monthTo,
    priceFrom, priceTo,
    mileageFrom, mileageTo,
    hpFrom, hpTo,
    fuelType, bodyColor,
    driveType, noDamage, category,
  } = query;

  const conditions = [];
  const params = [];
  let idx = startIdx;

  if (source && (source === 'K' || source === 'C')) {
    conditions.push(`w.source = $${idx++}`);
    params.push(source);
  }

  if (brand) {
    conditions.push(`w.brand = $${idx++}`);
    params.push(brand);
  }

  if (yearFrom) {
    const ymFrom = `${yearFrom}${monthFrom ? monthFrom.padStart(2, '0') : '01'}`;
    conditions.push(`w.yearmonth_raw >= $${idx++}`);
    params.push(ymFrom);
  }
  if (yearTo) {
    const ymTo = `${yearTo}${monthTo ? monthTo.padStart(2, '0') : '12'}`;
    conditions.push(`w.yearmonth_raw <= $${idx++}`);
    params.push(ymTo);
  }

  if (priceFrom) {
    conditions.push(`w.totalprice_rub >= $${idx++}`);
    params.push(parseInt(priceFrom, 10));
  }
  if (priceTo) {
    conditions.push(`w.totalprice_rub <= $${idx++}`);
    params.push(parseInt(priceTo, 10));
  }

  if (mileageFrom) {
    conditions.push(`w.mileage >= $${idx++}`);
    params.push(parseInt(mileageFrom, 10));
  }
  if (mileageTo) {
    conditions.push(`w.mileage <= $${idx++}`);
    params.push(parseInt(mileageTo, 10));
  }

  if (hpFrom) {
    conditions.push(`w.hp > 0 AND w.hp >= $${idx++}`);
    params.push(parseInt(hpFrom, 10));
  }
  if (hpTo) {
    conditions.push(`w.hp > 0 AND w.hp <= $${idx++}`);
    params.push(parseInt(hpTo, 10));
  }

  if (fuelType) {
    const fuels = fuelType.split(',').map(v => v.trim()).filter(Boolean);
    if (fuels.length > 0) {
      const placeholders = fuels.map(() => `$${idx++}`).join(',');
      conditions.push(`w.fuel_filter IN (${placeholders})`);
      params.push(...fuels);
    }
  }

  if (bodyColor) {
    const colors = bodyColor.split(',').map(v => v.trim()).filter(Boolean);
    if (colors.length > 0) {
      const placeholders = colors.map(() => `$${idx++}`).join(',');
      conditions.push(`w.color_filter IN (${placeholders})`);
      params.push(...colors);
    }
  }

  if (driveType) {
    const drives = driveType.split(',').map(v => v.trim()).filter(Boolean);
    if (drives.length > 0) {
      const placeholders = drives.map(() => `$${idx++}`).join(',');
      conditions.push(`w.drive_type IN (${placeholders})`);
      params.push(...drives);
    }
  }

  if (noDamage === 'true') {
    conditions.push(`(w.accident_count = 0 OR w.accident_count IS NULL) AND (w.accident_cost = 0 OR w.accident_cost IS NULL)`);
  }

  if (category) {
    const categories = category.split(',').map(v => v.trim()).filter(Boolean);
    if (categories.length > 0) {
      const placeholders = categories.map(() => `$${idx++}`).join(',');
      conditions.push(`w.category IN (${placeholders})`);
      params.push(...categories);
    }
  }

  return { conditions, params, nextIdx: idx };
}

/**
 * Проверяем, есть ли активные фильтры (кроме бренда и источника),
 * которые влияют на агрегаты внутри модели.
 */
function hasRangeOrTypeFilters(query) {
  return !!(
    query.yearFrom || query.yearTo ||
    query.monthFrom || query.monthTo ||
    query.priceFrom || query.priceTo ||
    query.mileageFrom || query.mileageTo ||
    query.hpFrom || query.hpTo ||
    query.fuelType || query.bodyColor ||
    query.driveType || query.noDamage || query.category
  );
}

/**
 * GET /catalog/models
 *
 * Режимы работы:
 * 1. Без range-фильтров — всё из auto_models_agg (~50 мс)
 * 2. С range-фильтрами — гибрид:
 *    - auto_models_agg: ранжирование по ads_count, пагинация, totalModels/totalAds
 *    - auto_webcatalog: точные агрегаты (year/price/hp/displacement/fuel) для топ-N страницы
 *    - фото: всегда из auto_models_agg (предрассчитаны)
 */
export async function getCatalogModels(req, res) {
  const { generation, type, model, page, pageSize } = req.query;

  if (generation || type || model) {
    return res.status(400).json({
      mode: 'models',
      error: 'generation/type/model filters are not supported in models mode',
    });
  }

  const currentPage = Math.max(1, page ? parseInt(page, 10) : 1);
  const limit = pageSize ? Math.max(1, parseInt(pageSize, 10)) : 12;
  const offset = (currentPage - 1) * limit;

  const needsRecalc = hasRangeOrTypeFilters(req.query);

  const client = await pool.connect();
  try {
    let items, totalModels, totalAds, totalPages;

    if (!needsRecalc) {
      // ── Быстрый путь: всё из auto_models_agg ──────────────────────────────
      const { conditions, params } = buildAggFilters(req.query);
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const aggregationQuery = `
        SELECT
          agg.brand,
          agg.model,
          SUM(agg.ads_count)          AS ads_count,
          MIN(agg.year_min)           AS year_min,
          MAX(agg.year_max)           AS year_max,
          MIN(agg.price_min)          AS price_min,
          MAX(agg.price_max)          AS price_max,
          MIN(agg.displacement_min)   AS displacement_min,
          MAX(agg.displacement_max)   AS displacement_max,
          MIN(agg.hp_min)             AS hp_min,
          MAX(agg.hp_max)             AS hp_max,
          array_agg(DISTINCT NULLIF(agg.fuel_type, '')) FILTER (WHERE NULLIF(agg.fuel_type, '') IS NOT NULL) AS fuel_types,
          ph.photos_preview
        FROM auto_models_agg agg
        LEFT JOIN LATERAL (
          SELECT photos_preview
          FROM auto_models_agg
          WHERE brand = agg.brand AND model = agg.model
            AND array_length(photos_preview, 1) > 0
          LIMIT 1
        ) ph ON true
        ${whereClause}
        GROUP BY agg.brand, agg.model, ph.photos_preview
        ORDER BY ads_count DESC
        LIMIT ${limit} OFFSET ${offset};
      `;

      const countQuery = `
        SELECT
          COUNT(DISTINCT (brand, model)) AS total_models,
          SUM(ads_count)                 AS total_ads
        FROM auto_models_agg
        ${whereClause};
      `;

      const [aggResult, countResult] = await Promise.all([
        client.query(aggregationQuery, params),
        client.query(countQuery, params),
      ]);

      totalModels = parseInt(countResult.rows[0].total_models, 10);
      totalAds = parseInt(countResult.rows[0].total_ads, 10);
      totalPages = Math.ceil(totalModels / limit);

      items = aggResult.rows.map(row => ({
        brand: row.brand,
        model: row.model,
        ads_count: parseInt(row.ads_count, 10),
        photos_preview: row.photos_preview || [],
        year_min: row.year_min ? parseInt(row.year_min) : null,
        year_max: row.year_max ? parseInt(row.year_max) : null,
        price_min: row.price_min ? parseInt(row.price_min) : null,
        price_max: row.price_max ? parseInt(row.price_max) : null,
        displacement_min: ccToLiters(row.displacement_min),
        displacement_max: ccToLiters(row.displacement_max),
        fuel_types: row.fuel_types || [],
        hp_min: row.hp_min ? parseInt(row.hp_min) : null,
        hp_max: row.hp_max ? parseInt(row.hp_max) : null,
      }));

    } else {
      // ── Точный путь: агрегация из auto_webcatalog с правильной сортировкой ─
      const { conditions: wcConds, params: wcParams } = buildWebcatalogFilters(req.query, 1);
      const wcWhereClause = wcConds.length ? `WHERE ${wcConds.join(' AND ')}` : '';
      const wcAndClause = wcConds.length ? `AND ${wcConds.join(' AND ')}` : '';

      const aggQuery = `
        SELECT
          w.brand,
          w.model,
          COUNT(*)                                              AS ads_count,
          MIN(w.year)                                           AS year_min,
          MAX(w.year)                                           AS year_max,
          MIN(w.totalprice_rub)                                 AS price_min,
          MAX(w.totalprice_rub)                                 AS price_max,
          MIN(w.displacement) FILTER (WHERE w.displacement > 0) AS displacement_min,
          MAX(w.displacement) FILTER (WHERE w.displacement > 0) AS displacement_max,
          MIN(w.hp) FILTER (WHERE w.hp > 0)                    AS hp_min,
          MAX(w.hp)                                             AS hp_max,
          array_agg(DISTINCT w.fuel_filter) FILTER (WHERE w.fuel_filter IS NOT NULL) AS fuel_filters
        FROM auto_webcatalog w
        ${wcWhereClause}
        GROUP BY w.brand, w.model
        ORDER BY ads_count DESC
        LIMIT ${limit} OFFSET ${offset};
      `;

      const countQuery = `
        SELECT
          COUNT(*)  AS total_models,
          SUM(cnt)  AS total_ads
        FROM (
          SELECT brand, model, COUNT(*) AS cnt
          FROM auto_webcatalog w
          ${wcWhereClause}
          GROUP BY brand, model
        ) sub;
      `;

      const [aggResult, countResult] = await Promise.all([
        client.query(aggQuery, wcParams),
        client.query(countQuery, wcParams),
      ]);

      totalModels = parseInt(countResult.rows[0].total_models, 10) || 0;
      totalAds = parseInt(countResult.rows[0].total_ads, 10) || 0;
      totalPages = Math.ceil(totalModels / limit);

      const topPairs = aggResult.rows.map(r => ({ brand: r.brand, model: r.model }));

      if (topPairs.length === 0) {
        return res.json({
          mode: 'models',
          page: currentPage,
          pageSize: limit,
          totalAds,
          totalModels,
          totalPages,
          items: [],
        });
      }

      // Фото из webcatalog для страницы результатов
      const valuesEntries = topPairs
        .map((_, i) => `($${wcParams.length + i * 2 + 1}::text, $${wcParams.length + i * 2 + 2}::text)`)
        .join(', ');
      const pairParams = topPairs.flatMap(p => [p.brand, p.model]);

      const photosQuery = `
        WITH filtered_photos AS (
          SELECT
            w.brand, w.model,
            CASE
              WHEN w.source = 'K' THEN 'https://ci.encar.com' || (
                SELECT p->>'path'
                FROM jsonb_array_elements(w.photos) p
                WHERE p->>'code' = '001'
                LIMIT 1
              )
              WHEN w.source = 'C' THEN (w.photos->>0)
            END AS photo_url,
            ROW_NUMBER() OVER (PARTITION BY w.brand, w.model ORDER BY w.id) AS rn
          FROM auto_webcatalog w
          JOIN (VALUES ${valuesEntries}) AS pairs(brand, model)
            ON w.brand = pairs.brand AND w.model = pairs.model
          WHERE w.photos IS NOT NULL
            AND jsonb_array_length(w.photos) > 0
            ${wcAndClause}
        )
        SELECT brand, model,
          array_agg(photo_url ORDER BY rn) FILTER (WHERE rn <= 4 AND photo_url IS NOT NULL) AS photos_preview
        FROM filtered_photos
        WHERE rn <= 4 AND photo_url IS NOT NULL
        GROUP BY brand, model;
      `;

      const photosResult = await client.query(photosQuery, [...wcParams, ...pairParams]);

      const photosMap = new Map(
        photosResult.rows.map(r => [`${r.brand}::${r.model}`, r.photos_preview])
      );

      items = aggResult.rows.map(row => {
        const fuelTypes = [...new Set(
          (row.fuel_filters || [])
            .map(normalizeFuelFilter)
            .filter(Boolean)
        )];

        return {
          brand: row.brand,
          model: row.model,
          ads_count: parseInt(row.ads_count, 10),
          photos_preview: photosMap.get(`${row.brand}::${row.model}`) || [],
          year_min: row.year_min ? parseInt(row.year_min) : null,
          year_max: row.year_max ? parseInt(row.year_max) : null,
          price_min: row.price_min ? parseInt(row.price_min) : null,
          price_max: row.price_max ? parseInt(row.price_max) : null,
          displacement_min: ccToLiters(row.displacement_min),
          displacement_max: ccToLiters(row.displacement_max),
          fuel_types: fuelTypes,
          hp_min: row.hp_min ? parseInt(row.hp_min) : null,
          hp_max: row.hp_max ? parseInt(row.hp_max) : null,
        };
      });
    }

    res.json({
      mode: 'models',
      page: currentPage,
      pageSize: limit,
      totalAds,
      totalModels,
      totalPages,
      items,
    });
  } catch (error) {
    console.error('Ошибка при получении списка моделей:', error);
    res.status(500).json({ error: 'Ошибка сервера.' });
  } finally {
    client.release();
  }
}
