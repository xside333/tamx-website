import { pool } from '../utils/dbClient.js';

/**
 * Округлить объём двигателя: 1900 → 1.9, 1950 → 2.0
 */
function ccToLiters(cc) {
  if (!cc || cc <= 0) return null;
  return Math.round(cc / 100) / 10;
}

/**
 * Построить WHERE-условия для запроса к auto_models_agg.
 *
 * Агрегированная таблица не содержит: transmission, bodyType, driveType,
 * noDamage, generation, type — эти фильтры не поддерживаются в режиме моделей.
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
    brand, model,
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

  if (model) {
    conditions.push(`model = $${idx++}`);
    params.push(model);
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
    const fuels = fuelType.split(',').map(v => v.trim()).filter(Boolean);
    if (fuels.length > 0) {
      const placeholders = fuels.map(() => `$${idx++}`).join(',');
      conditions.push(`fuel_type IN (${placeholders})`);
      params.push(...fuels);
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
 * GET /catalog/models
 * Возвращает агрегированный список моделей, читая из auto_models_agg.
 * Фото prevew хранятся прямо в таблице — отдельный запрос к auto_webcatalog не нужен.
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

  const { conditions, params } = buildAggFilters(req.query);
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // В агрег. таблице одна модель может иметь несколько строк (разные source/fuel_type/color_filter).
  // Агрегируем по (brand, model): суммируем ads_count, берём MIN/MAX по числовым полям,
  // объединяем fuel_types. photos_preview одинаковы для всех строк модели —
  // получаем через LATERAL подзапрос (первый непустой массив).
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

  try {
    const client = await pool.connect();

    const [aggResult, countResult] = await Promise.all([
      client.query(aggregationQuery, params),
      client.query(countQuery, params),
    ]);

    client.release();

    const totalModels = parseInt(countResult.rows[0].total_models, 10);
    const totalAds = parseInt(countResult.rows[0].total_ads, 10);
    const totalPages = Math.ceil(totalModels / limit);

    const items = aggResult.rows.map(row => ({
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
  }
}
