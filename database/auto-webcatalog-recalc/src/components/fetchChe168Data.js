/**
 * Получение данных из che168_autoparser
 */
import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

const CHE168_COLUMNS = `
  inner_id, url, mark, model, year, first_registration, color,
  price, km_age, engine_type, transmission_type, body_type, address,
  seller_type, is_dealer, displacement, power, offer_created, images,
  raw_json->>'drive_type' AS drive_type,
  created_at
`;

/** Батч по офсету и лимиту (для воркеров) */
export async function fetchChe168ByOffset(offset, limit) {
  const client = await pool.connect();
  try {
    // Фильтр: только бензин и дизель (для расчёта таможни)
    const fuelFilter = config.che168FuelFilter;
    const placeholders = fuelFilter.map((_, i) => `$${i + 3}`).join(',');

    const res = await client.query(`
      SELECT ${CHE168_COLUMNS}
      FROM che168_autoparser
      WHERE engine_type IN (${placeholders})
        AND price IS NOT NULL AND price > 0
      ORDER BY offer_created DESC NULLS LAST, inner_id DESC
      OFFSET $1 LIMIT $2;
    `, [offset, limit, ...fuelFilter]);
    return res.rows;
  } catch (error) {
    logger(`❌ Ошибка fetchChe168ByOffset: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/** Выборка по массиву inner_id (для сверки/догонки) */
export async function fetchChe168ByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT ${CHE168_COLUMNS}
      FROM che168_autoparser
      WHERE inner_id = ANY($1::text[])
    `, [ids]);
    return res.rows;
  } catch (error) {
    logger(`❌ Ошибка fetchChe168ByIds: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/** Количество строк в che168_autoparser (с фильтром) */
export async function getChe168RowCount() {
  const client = await pool.connect();
  try {
    const fuelFilter = config.che168FuelFilter;
    const placeholders = fuelFilter.map((_, i) => `$${i + 1}`).join(',');
    const res = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM che168_autoparser WHERE engine_type IN (${placeholders}) AND price IS NOT NULL AND price > 0`,
      fuelFilter
    );
    return res.rows[0].cnt;
  } finally {
    client.release();
  }
}
