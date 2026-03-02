import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Единый endpoint для фильтрации авто из auto_webcatalog
 * Поддерживает оба источника: Корея (K) и Китай (C)
 */
export async function getFilteredCars(req, res) {
  const {
    source,
    brand, model, generation, type,
    yearFrom, monthFrom, yearTo, monthTo,
    priceFrom, priceTo,
    mileageFrom, mileageTo,
    hpFrom, hpTo,
    fuelType, bodyColor,
    transmission, bodyType, driveType,
    noDamage, category,
    page, sortBy
  } = req.query;

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Источник (K = Корея, C = Китай, пусто = все)
  if (source && (source === 'K' || source === 'C')) {
    conditions.push(`source = $${paramIndex++}`);
    params.push(source);
  }

  // Марка
  if (brand) {
    conditions.push(`brand = $${paramIndex++}`);
    params.push(brand);
  }

  // Модель
  if (model) {
    conditions.push(`model = $${paramIndex++}`);
    params.push(model);
  }

  // Поколение (только encar) — автоматически ограничиваем корейскими авто
  if (generation) {
    conditions.push(`generation = $${paramIndex++}`);
    params.push(generation);
    if (!source) {
      conditions.push(`source = 'K'`);
    }
  }

  // Комплектация (только encar) — автоматически ограничиваем корейскими авто
  if (type) {
    const grades = type.split(',').map(v => v.trim()).filter(Boolean);
    if (grades.length > 0) {
      const placeholders = grades.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`grade_en IN (${placeholders})`);
      params.push(...grades);
      if (!source) {
        conditions.push(`source = 'K'`);
      }
    }
  }

  // Год и месяц "от"
  if (yearFrom) {
    const ymFrom = `${yearFrom}${monthFrom ? monthFrom.padStart(2, '0') : '01'}`;
    conditions.push(`yearmonth_raw >= $${paramIndex++}`);
    params.push(ymFrom);
  }

  // Год и месяц "до"
  if (yearTo) {
    const ymTo = `${yearTo}${monthTo ? monthTo.padStart(2, '0') : '12'}`;
    conditions.push(`yearmonth_raw <= $${paramIndex++}`);
    params.push(ymTo);
  }

  // Цена от и до
  if (priceFrom) {
    conditions.push(`totalprice_rub >= $${paramIndex++}`);
    params.push(parseInt(priceFrom));
  }
  if (priceTo) {
    conditions.push(`totalprice_rub <= $${paramIndex++}`);
    params.push(parseInt(priceTo));
  }

  // Пробег от и до
  if (mileageFrom) {
    conditions.push(`mileage >= $${paramIndex++}`);
    params.push(parseInt(mileageFrom));
  }
  if (mileageTo) {
    conditions.push(`mileage <= $${paramIndex++}`);
    params.push(parseInt(mileageTo));
  }

  // HP от и до
  if (hpFrom) {
    conditions.push(`hp > 0 AND hp >= $${paramIndex++}`);
    params.push(parseInt(hpFrom));
  }
  if (hpTo) {
    conditions.push(`hp > 0 AND hp <= $${paramIndex++}`);
    params.push(parseInt(hpTo));
  }

  // Топливо (fuel_filter)
  if (fuelType) {
    const fuels = fuelType.split(',').map(v => v.trim()).filter(Boolean);
    if (fuels.length > 0) {
      const placeholders = fuels.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`fuel_filter IN (${placeholders})`);
      params.push(...fuels);
    }
  }

  // Цвет кузова (color_filter)
  if (bodyColor) {
    const colors = bodyColor.split(',').map(v => v.trim()).filter(Boolean);
    if (colors.length > 0) {
      const placeholders = colors.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`color_filter IN (${placeholders})`);
      params.push(...colors);
    }
  }

  // Трансмиссия
  if (transmission) {
    const trans = transmission.split(',').map(v => v.trim()).filter(Boolean);
    if (trans.length > 0) {
      const placeholders = trans.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`transmission IN (${placeholders})`);
      params.push(...trans);
    }
  }

  // Тип кузова (только che168)
  if (bodyType) {
    const types = bodyType.split(',').map(v => v.trim()).filter(Boolean);
    if (types.length > 0) {
      const placeholders = types.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`body_type IN (${placeholders})`);
      params.push(...types);
    }
  }

  // Привод (drive_type)
  if (driveType) {
    const drives = driveType.split(',').map(v => v.trim()).filter(Boolean);
    if (drives.length > 0) {
      const placeholders = drives.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`drive_type IN (${placeholders})`);
      params.push(...drives);
    }
  }

  // Без повреждений (только encar)
  if (noDamage === 'true') {
    conditions.push(`(accident_count = 0 OR accident_count IS NULL) AND (accident_cost = 0 OR accident_cost IS NULL)`);
  }

  // Категория
  if (category) {
    const categories = category.split(',').map(v => v.trim()).filter(Boolean);
    if (categories.length > 0) {
      const placeholders = categories.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`category IN (${placeholders})`);
      params.push(...categories);
    }
  }

  const currentPage = page ? parseInt(page, 10) : 1;
  const limit = 30;
  const offset = (currentPage - 1) * limit;

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Сортировка
  let orderClause = 'ORDER BY offer_date DESC NULLS LAST';
  switch (sortBy) {
    case 'date_asc':
      orderClause = 'ORDER BY offer_date ASC NULLS LAST';
      break;
    case 'price_asc':
      orderClause = 'ORDER BY totalprice_rub ASC NULLS LAST';
      break;
    case 'price_desc':
      orderClause = 'ORDER BY totalprice_rub DESC NULLS LAST';
      break;
    case 'mileage_asc':
      orderClause = 'ORDER BY mileage ASC NULLS LAST';
      break;
    default:
      orderClause = 'ORDER BY offer_date DESC NULLS LAST';
      break;
  }

  const query = `
    SELECT id, source, json, hp, drive_type, year, yearmonth_raw FROM auto_webcatalog
    ${whereClause}
    ${orderClause}
    LIMIT ${limit} OFFSET ${offset};
  `;

  const totalCountQuery = `
    SELECT COUNT(*) FROM auto_webcatalog ${whereClause};
  `;

  try {
    const client = await pool.connect();

    const { rows } = await client.query(query, params);
    const totalCountResult = await client.query(totalCountQuery, params);

    client.release();

    const totalcars = parseInt(totalCountResult.rows[0].count, 10);
    const cars = rows.map(row => ({
      ...row.json,
      car_id: row.id,
      source: row.source,
      hp: row.hp ?? 0,
      drive_type: row.drive_type ?? null,
      year: row.year ?? null,
      yearmonth_raw: row.yearmonth_raw ?? null,
    }));

    res.json({ totalcars, cars });
  } catch (error) {
    console.error('Ошибка при получении списка авто:', error);
    res.status(500).json({ error: 'Ошибка сервера.' });
  }
}
