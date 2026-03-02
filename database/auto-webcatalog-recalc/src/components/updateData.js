/**
 * UPSERT в auto_webcatalog
 * ON CONFLICT (id) DO UPDATE SET ...
 */
import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

const COLUMNS = [
  'id', 'source', 'url', 'brand', 'model',
  'generation', 'generation_filter', 'grade', 'grade_en',
  'year', 'month', 'yearmonth_raw', 'mileage',
  'color', 'color_filter', 'fuel_type', 'fuel_filter',
  'transmission', 'body_type', 'displacement', 'hp',
  'price_original', 'price_currency', 'address', 'seller_type',
  'photos', 'offer_date', 'category',
  'totalprice_rub', 'totalprice_usd', 'json',
  'accident_count', 'accident_cost', 'inspection_outers',
  'seat_count', 'trust', 'vehicle_no', 'view_count',
  'drive_type',
];

const COLUMN_COUNT = COLUMNS.length; // 39

// Колонки для UPDATE (все кроме id)
const UPDATE_COLUMNS = COLUMNS.slice(1);

function buildValues(item) {
  return [
    item.id, item.source, item.url, item.brand, item.model,
    item.generation, item.generation_filter, item.grade, item.grade_en,
    item.year, item.month, item.yearmonth_raw, item.mileage,
    item.color, item.color_filter, item.fuel_type, item.fuel_filter,
    item.transmission, item.body_type, item.displacement, item.hp,
    item.price_original, item.price_currency, item.address, item.seller_type,
    JSON.stringify(item.photos ?? []),
    item.offer_date,
    item.category,
    item.totalprice_rub, item.totalprice_usd,
    JSON.stringify(item.json),
    item.accident_count, item.accident_cost,
    JSON.stringify(item.inspection_outers ?? null),
    item.seat_count, item.trust, item.vehicle_no, item.view_count,
    item.drive_type ?? null,
  ];
}

export async function updateData(calculatedData) {
  const client = await pool.connect();
  try {
    const batchSize = config.insertBatchSize;

    for (let i = 0; i < calculatedData.length; i += batchSize) {
      const batch = calculatedData.slice(i, i + batchSize);

      const values = [];
      const placeholders = batch.map((item, idx) => {
        const baseIdx = idx * COLUMN_COUNT;
        values.push(...buildValues(item));
        const ph = Array.from({ length: COLUMN_COUNT }, (_, k) => `$${baseIdx + k + 1}`);
        return `(${ph.join(',')})`;
      }).join(',');

      const updateSet = UPDATE_COLUMNS.map(col => `${col} = EXCLUDED.${col}`).join(', ');

      const query = `
        INSERT INTO auto_webcatalog (${COLUMNS.join(',')})
        VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
          ${updateSet},
          updated_at = NOW();
      `;

      await client.query(query, values);
    }
  } catch (error) {
    logger(`❌ Ошибка updateData: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}
