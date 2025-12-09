import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function getFilteredCars(req, res) {
  const {
    brand, model, generation, type,
    yearFrom, monthFrom, yearTo, monthTo,
    priceFrom, priceTo,
    mileageFrom, mileageTo,
    hpTo,
    fuelType, bodyColor,
    noDamage, category,
    page, sortBy
  } = req.query;

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Год и месяц "от"
  if (yearFrom) {
    const ymFrom = `${yearFrom}${monthFrom ? monthFrom.padStart(2, '0') : '01'}`;
    conditions.push(`(COALESCE(yearmonth_prod, yearmonth)::int >= $${paramIndex++})`);
    params.push(parseInt(ymFrom));
  }

  // Год и месяц "до"
  if (yearTo) {
    const ymTo = `${yearTo}${monthTo ? monthTo.padStart(2, '0') : '12'}`;
    conditions.push(`(COALESCE(yearmonth_prod, yearmonth)::int <= $${paramIndex++})`);
    params.push(parseInt(ymTo));
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

  // HP до (фильтр "до 160 л.с.")
  if (hpTo) {
    conditions.push(`hp > 0 AND hp <= $${paramIndex++}`);
    params.push(parseInt(hpTo));
  }

  // Марка, модель, поколение
  if (brand) {
    conditions.push(`manufacturerenglishname = $${paramIndex++}`);
    params.push(brand);
  }
  if (model) {
    conditions.push(`modelgroupenglishname = $${paramIndex++}`);
    params.push(model);
  }
  if (generation) {
    conditions.push(`modelname = $${paramIndex++}`);
    params.push(generation);
  }

  // Тип (gradeenglishname) — поддержка нескольких значений
  if (type) {
    const grades = type.split(',').map(v => v.trim()).filter(Boolean);
    if (grades.length > 0) {
      const placeholders = grades.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`gradeenglishname IN (${placeholders})`);
      params.push(...grades);
    }
  }

  // Топливо (fuelfilter)
  if (fuelType) {
    const fuels = fuelType.split(',').map(v => v.trim()).filter(Boolean);
    if (fuels.length > 0) {
      const placeholders = fuels.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`fuelfilter IN (${placeholders})`);
      params.push(...fuels);
    }
  }

  // Цвет кузова (colorfilter)
  if (bodyColor) {
    const colors = bodyColor.split(',').map(v => v.trim()).filter(Boolean);
    if (colors.length > 0) {
      const placeholders = colors.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`colorfilter IN (${placeholders})`);
      params.push(...colors);
    }
  }

  // No damage
  if (noDamage === 'true') {
    conditions.push(`myaccidentcnt = 0 AND myaccidentcost = 0`);
  }

  // Категория (новый фильтр)
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
  let orderClause = 'ORDER BY firstadvertiseddatetime DESC';
  switch (sortBy) {
    case 'date_asc':
      orderClause = 'ORDER BY firstadvertiseddatetime ASC';
      break;
    case 'price_asc':
      orderClause = 'ORDER BY totalprice_rub ASC';
      break;
    case 'price_desc':
      orderClause = 'ORDER BY totalprice_rub DESC';
      break;
    case 'mileage_asc':
      orderClause = 'ORDER BY mileage ASC';
      break;
    default:
      orderClause = 'ORDER BY firstadvertiseddatetime DESC';
      break;
  }

  const query = `
    SELECT json FROM encar_webcatalog
    ${whereClause}
    ${orderClause}
    LIMIT ${limit} OFFSET ${offset};
  `;

  const totalCountQuery = `
    SELECT COUNT(*) FROM encar_webcatalog ${whereClause};
  `;

  try {
    const client = await pool.connect();

    const { rows } = await client.query(query, params);
    const totalCountResult = await client.query(totalCountQuery, params);

    client.release();

    const totalcars = parseInt(totalCountResult.rows[0].count, 10);
    const cars = rows.map(row => row.json);

    res.json({ totalcars, cars });
  } catch (error) {
    console.error('Ошибка при получении списка авто:', error);
    res.status(500).json({ error: 'Ошибка сервера.' });
  }
}
