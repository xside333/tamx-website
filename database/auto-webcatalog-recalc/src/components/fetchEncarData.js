/**
 * Получение данных из encar_db_prod
 * Адаптировано из encar-webcatalog-recalc/src/components/fetchData.js
 */
import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const markerFile = path.resolve(__dirname, '../../marker.json');

export function readMarker() {
  if (!fs.existsSync(markerFile)) {
    const initial = { currentOffset: 0, vacuumCounter: 0 };
    fs.writeFileSync(markerFile, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(fs.readFileSync(markerFile));
}

export function saveMarker(updates) {
  const current = readMarker();
  const merged = { ...current, ...updates };
  fs.writeFileSync(markerFile, JSON.stringify(merged));
}

const ENCAR_COLUMNS = `
  id, url, cartype, firstadvertiseddatetime, viewcount, manufacturername,
  manufacturerenglishname, modelgroupname, modelgroupenglishname, modelname,
  gradename, gradeenglishname, yearmonth, yearmonth_prod, mileage, colorname,
  fuelname, price, vehicleno, myaccidentcnt, myaccidentcost, address,
  photo_outer, photo_inner, photo_paths, seat_count, transmission_name,
  trust, displacement, hp, inspection_outers
`;

const ENCAR_FILTER = `WHERE cartype != 'Z'`;

/** Батч по офсету и лимиту (для воркеров) */
export async function fetchEncarByOffset(offset, limit) {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT ${ENCAR_COLUMNS}
      FROM encar_db_prod
      ${ENCAR_FILTER}
      ORDER BY firstadvertiseddatetime DESC, id DESC
      OFFSET $1 LIMIT $2;
    `, [offset, limit]);
    return res.rows;
  } catch (error) {
    logger(`❌ Ошибка fetchEncarByOffset: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/** Выборка по массиву id (для сверки/догонки) */
export async function fetchEncarByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT ${ENCAR_COLUMNS}
      FROM encar_db_prod
      WHERE id = ANY($1::bigint[])
    `, [ids]);
    return res.rows;
  } catch (error) {
    logger(`❌ Ошибка fetchEncarByIds: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/** Количество строк в encar_db_prod (с фильтром) */
export async function getEncarRowCount() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT COUNT(*)::int AS cnt FROM encar_db_prod ${ENCAR_FILTER}`);
    return res.rows[0].cnt;
  } finally {
    client.release();
  }
}
