import { pool } from '../utils/dbClient.js';
import { buildCatalogFilters } from './buildCatalogFilters.js';

/**
 * Единый endpoint для фильтрации авто из auto_webcatalog
 * Поддерживает оба источника: Корея (K) и Китай (C)
 */
export async function getFilteredCars(req, res) {
  const { page, sortBy } = req.query;

  const { conditions, params } = buildCatalogFilters(req.query);

  const currentPage = page ? parseInt(page, 10) : 1;
  const limit = 30;
  const offset = (currentPage - 1) * limit;

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

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
