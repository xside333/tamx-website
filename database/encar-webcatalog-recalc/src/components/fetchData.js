import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import fs from 'fs';

const markerFile = './marker.json';

function readMarker() {
  if (!fs.existsSync(markerFile)) {
    const initialMarker = { currentOffset: 0, vacuumCounter: 0 };
    fs.writeFileSync(markerFile, JSON.stringify(initialMarker));
    return initialMarker;
  }
  return JSON.parse(fs.readFileSync(markerFile));
}

function saveMarker({ currentOffset, vacuumCounter, processedRows, totalRows }) {
  const currentMarker = readMarker();
  const updatedMarker = {
    currentOffset: currentOffset !== undefined ? currentOffset : currentMarker.currentOffset,
    vacuumCounter: vacuumCounter !== undefined ? vacuumCounter : currentMarker.vacuumCounter,
    processedRows: processedRows !== undefined ? processedRows : currentMarker.processedRows,
    totalRows: totalRows !== undefined ? totalRows : currentMarker.totalRows,
  };
  fs.writeFileSync(markerFile, JSON.stringify(updatedMarker));
}

// Оригинальный fetchData
async function fetchData() {
  const client = await pool.connect();
  try {
    const { currentOffset } = readMarker();
    const limit = config.fetchBatchSize;

    const res = await client.query(`
      SELECT id, url, cartype, firstadvertiseddatetime, viewcount, manufacturername,
             manufacturerenglishname, modelgroupname, modelgroupenglishname, modelname,
             gradename, gradeenglishname, yearmonth, yearmonth_prod, mileage, colorname,
             fuelname, price, vehicleno, myaccidentcnt, myaccidentcost, address,
             photo_paths, seat_count, transmission_name, trust, displacement
      FROM encar_db_prod
      ORDER BY firstadvertiseddatetime DESC, id DESC
      OFFSET $1 LIMIT $2;
    `, [currentOffset, limit]);

    if (res.rows.length > 0) {
      saveMarker({ currentOffset: currentOffset + res.rows.length });
    } else {
      saveMarker({ currentOffset: 0 });
    }

    return res.rows;

  } catch (error) {
    logger(`❌ Ошибка fetchData: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Для воркеров: батч по офсету и лимиту
async function fetchDataByOffset(offset, limit) {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, url, cartype, firstadvertiseddatetime, viewcount, manufacturername,
             manufacturerenglishname, modelgroupname, modelgroupenglishname, modelname,
             gradename, gradeenglishname, yearmonth, yearmonth_prod, mileage, colorname,
             fuelname, price, vehicleno, myaccidentcnt, myaccidentcost, address,
             photo_paths, seat_count, transmission_name, trust, displacement
      FROM encar_db_prod
      ORDER BY firstadvertiseddatetime DESC, id DESC
      OFFSET $1 LIMIT $2;
    `, [offset, limit]);
    return res.rows;
  } catch (error) {
    logger(`❌ Ошибка fetchDataByOffset: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Для финальной сверки: выборка по массиву id
async function fetchDataByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, url, cartype, firstadvertiseddatetime, viewcount, manufacturername,
             manufacturerenglishname, modelgroupname, modelgroupenglishname, modelname,
             gradename, gradeenglishname, yearmonth, yearmonth_prod, mileage, colorname,
             fuelname, price, vehicleno, myaccidentcnt, myaccidentcost, address,
             photo_paths, seat_count, transmission_name, trust, displacement
      FROM encar_db_prod
      WHERE id = ANY($1::bigint[])
    `, [ids]);
    return res.rows;
  } catch (error) {
    logger(`❌ Ошибка fetchDataByIds: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

export { fetchData, fetchDataByOffset, fetchDataByIds, readMarker, saveMarker };
