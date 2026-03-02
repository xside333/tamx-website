/**
 * auto-webcatalog-recalc — Единый пересчёт Korea (encar) + China (che168)
 * Архитектура: Big cycle (полный пересчёт) + Small cycle (инкрементальная сверка)
 */
import { Worker } from 'worker_threads';
import { readMarker, saveMarker, fetchEncarByIds } from './components/fetchEncarData.js';
import { getEncarRowCount } from './components/fetchEncarData.js';
import { getChe168RowCount, fetchChe168ByIds } from './components/fetchChe168Data.js';
import referenceData from './components/referenceData.js';
import { calculateBatch } from './components/calculateBatch.js';
import { updateData } from './components/updateData.js';
import { findAndSetHp } from './components/hpSearchService.js';
import { generateFilters } from './components/generateFilters.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';
import { pool } from './utils/dbClient.js';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let masterIsRunning = false;
const BIG_INTERVAL_MS = (config.recalculationIntervalMinutes ?? 60) * 60 * 1000;
const SMALL_INTERVAL_MS = (config.syncIntervalMinutes ?? 2) * 60 * 1000;
let bigScheduledAt = null;

// --- CLEANUP ---
async function runCleanupScript() {
  const cleanupPath = path.join(__dirname, 'cleanup.js');
  return new Promise((resolve) => {
    exec(`node "${cleanupPath}"`, (error, stdout, stderr) => {
      if (error) logger(`❌ cleanup.js: ${error.message}`);
      else if (stderr) logger(`⚠️ cleanup.js stderr: ${stderr}`);
      else logger(`🧹 cleanup.js: ${stdout?.trim() || 'ok'}`);
      resolve();
    });
  });
}

// --- VACUUM ANALYZE ---
async function runVacuumAnalyze() {
  const client = await pool.connect();
  try {
    await client.query('VACUUM ANALYZE auto_webcatalog;');
    logger('🔧 VACUUM ANALYZE auto_webcatalog выполнен');
  } catch (error) {
    logger(`❌ Ошибка VACUUM ANALYZE: ${error.message}`);
  } finally {
    client.release();
  }
}

// --- HP SEARCH (только encar) ---
async function processNullHpCars() {
  const client = await pool.connect();
  try {
    logger('🐴 Поиск HP для encar авто с hp = NULL/0...');
    const res = await client.query(`
      SELECT id, cartype, manufacturername, manufacturerenglishname,
             modelgroupname, modelgroupenglishname, modelname,
             gradename, gradeenglishname, yearmonth, fuelname,
             transmission_name, displacement, hp
      FROM encar_db_prod
      WHERE hp IS NULL OR hp = 0
      ORDER BY firstadvertiseddatetime DESC NULLS LAST
      LIMIT 500
    `);
    const cars = res.rows;
    if (!cars.length) {
      logger('✅ Нет авто с hp = NULL/0');
      return;
    }
    logger(`🔄 Найдено ${cars.length} авто с hp = NULL/0`);
    let foundHp = 0, notFoundHp = 0, skipped = 0;
    for (const car of cars) {
      const result = await findAndSetHp(car);
      if (result.skipped) skipped++;
      else if (result.hp > 0) foundHp++;
      else notFoundHp++;
      if ((foundHp + notFoundHp + skipped) % 10 === 0) await new Promise(r => setTimeout(r, 100));
    }
    logger(`✅ HP поиск: найдено ${foundHp}, не найдено ${notFoundHp}, пропущено ${skipped}`);
  } catch (e) {
    logger(`❌ Ошибка HP поиска: ${e.message}`);
  } finally {
    client.release();
  }
}

async function syncZeroHpFromReference() {
  const client = await pool.connect();
  const BATCH_SIZE = 200;
  try {
    let totalSynced = 0, batchNum = 0;
    while (batchNum < 100) {
      batchNum++;
      const { rows: cars } = await client.query(`
        SELECT p.id, r.hp as ref_hp
        FROM encar_db_prod p
        JOIN cars_hp_reference_v2 r ON
          p.cartype = r.cartype
          AND p.manufacturerenglishname = r.manufacturerenglishname
          AND p.modelgroupenglishname = r.modelgroupenglishname
          AND p.modelname = r.modelname
          AND COALESCE(p.gradeenglishname, '') = COALESCE(r.gradeenglishname, '')
          AND COALESCE(FLOOR(p.yearmonth::integer / 100), 0) = COALESCE(r.year, 0)
          AND p.fuelname = r.fuelname
          AND COALESCE(p.transmission_name, '') = COALESCE(r.transmission_name, '')
          AND COALESCE(p.displacement, 0) = COALESCE(r.displacement, 0)
        WHERE p.hp = 0 AND r.hp > 0
        ORDER BY p.firstadvertiseddatetime DESC NULLS LAST
        LIMIT ${BATCH_SIZE}
      `);
      if (!cars.length) break;
      for (const car of cars) {
        await client.query('UPDATE encar_db_prod SET hp = $1 WHERE id = $2', [car.ref_hp, car.id]);
        totalSynced++;
      }
      if (cars.length === BATCH_SIZE) await new Promise(r => setTimeout(r, 100));
    }
    if (totalSynced > 0) logger(`✅ HP синхронизация: ${totalSynced} записей`);
  } catch (e) {
    logger(`❌ Ошибка HP синхронизации: ${e.message}`);
  } finally {
    client.release();
  }
}

// --- SPAWN WORKERS ---
function spawnWorkers(sourceType, totalRows, references) {
  const numWorkers = Math.min(3, os.cpus().length);
  const chunkSize = Math.ceil(totalRows / numWorkers);
  const workerPath = path.join(__dirname, 'components', 'workerCalc.js');
  const workers = [];
  let processedRows = 0;

  logger(`📦 [${sourceType}] Всего: ${totalRows}, воркеров: ${numWorkers}, по ~${chunkSize}`);

  for (let i = 0; i < numWorkers; i++) {
    const offset = i * chunkSize;
    const limit = Math.min(chunkSize, totalRows - offset);
    if (limit <= 0) continue;

    workers.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(workerPath, {
          workerData: { offset, limit, references, sourceType },
        });
        worker.on('message', (msg) => {
          if (msg?.status === 'done') {
            processedRows += (msg.rowsProcessed || 0);
            logger(`✅ [${sourceType}] Воркер: +${msg.rowsProcessed} (итого ${processedRows}/${totalRows})`);
            resolve();
          } else if (msg?.status === 'error') {
            reject(new Error(msg.error || 'Ошибка воркера'));
          }
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Воркер завершился с кодом ${code}`));
        });
      })
    );
    logger(`🔧 [${sourceType}] Воркер #${i + 1} (offset ${offset}, limit ${limit})`);
  }

  return Promise.all(workers);
}

// --- ФИНАЛЬНАЯ СВЕРКА ---
async function finalIdSync(references) {
  const client = await pool.connect();
  try {
    logger('🔍 Финальная сверка id (encar)...');

    // Encar: досчёт недостающих
    const { rows: missingEncar } = await client.query(`
      SELECT p.id FROM encar_db_prod p
      WHERE p.cartype != 'Z'
        AND (p.id::text || '_en') NOT IN (SELECT id FROM auto_webcatalog WHERE source = 'K')
      LIMIT 1000
    `);

    if (missingEncar.length) {
      logger(`🔄 Encar: досчёт ${missingEncar.length} записей`);
      const chunk = config.fetchBatchSize || 200;
      for (let i = 0; i < missingEncar.length; i += chunk) {
        const ids = missingEncar.slice(i, i + chunk).map(r => r.id);
        const rows = await fetchEncarByIds(ids);
        if (!rows.length) continue;
        const calculated = await calculateBatch(rows, references, 'encar');
        await updateData(calculated);
        await new Promise(r => setTimeout(r, 50));
      }
    }

    logger('🔍 Финальная сверка id (che168)...');

    // Che168: досчёт недостающих
    const { rows: missingChe168 } = await client.query(`
      SELECT c.inner_id FROM che168_autoparser c
      WHERE c.engine_type IN ('Бензиновый', 'Дизельный')
        AND c.price IS NOT NULL AND c.price > 0
        AND (c.inner_id || '_ch') NOT IN (SELECT id FROM auto_webcatalog WHERE source = 'C')
      LIMIT 1000
    `);

    if (missingChe168.length) {
      logger(`🔄 Che168: досчёт ${missingChe168.length} записей`);
      const chunk = config.fetchBatchSize || 200;
      for (let i = 0; i < missingChe168.length; i += chunk) {
        const ids = missingChe168.slice(i, i + chunk).map(r => r.inner_id);
        const rows = await fetchChe168ByIds(ids);
        if (!rows.length) continue;
        const calculated = await calculateBatch(rows, references, 'che168');
        await updateData(calculated);
        await new Promise(r => setTimeout(r, 50));
      }
    }

    logger('✅ Финальная сверка завершена');
  } catch (e) {
    logger(`❌ Ошибка финальной сверки: ${e.message}`);
  } finally {
    client.release();
  }
}

// --- ПЕРЕСЧЁТ РАСХОЖДЕНИЙ ---
async function recalcPriceMismatches(references) {
  const client = await pool.connect();
  try {
    logger('💱 Проверка расхождений price (encar)...');
    const { rows } = await client.query(`
      SELECT p.id FROM encar_db_prod p
      JOIN auto_webcatalog w ON w.id = p.id::text || '_en'
      WHERE w.source = 'K' AND p.price IS NOT NULL
        AND w.price_original IS NOT NULL AND p.price <> w.price_original
      LIMIT 500
    `);
    if (!rows.length) {
      logger('✅ Расхождений по price не найдено');
      return;
    }
    logger(`🔄 Пересчёт ${rows.length} записей с изменённой ценой`);
    const chunk = config.fetchBatchSize || 200;
    for (let i = 0; i < rows.length; i += chunk) {
      const ids = rows.slice(i, i + chunk).map(r => r.id);
      const data = await fetchEncarByIds(ids);
      if (!data.length) continue;
      const calculated = await calculateBatch(data, references, 'encar');
      await updateData(calculated);
      await new Promise(r => setTimeout(r, 50));
    }
    logger('✅ Пересчёт price завершён');
  } catch (e) {
    logger(`❌ Ошибка пересчёта price: ${e.message}`);
  } finally {
    client.release();
  }
}

// === БОЛЬШОЙ ЦИКЛ ===
async function runMasterProcess() {
  if (masterIsRunning) return;
  masterIsRunning = true;

  const startTs = Date.now();
  if (bigScheduledAt === null) bigScheduledAt = startTs;
  logger(`🚀 [${new Date(startTs).toISOString()}] Старт ПОЛНОГО пересчёта auto_webcatalog`);

  try {
    // 0) HP поиск (encar)
    await processNullHpCars();
    await syncZeroHpFromReference();

    // 1) Справочники
    let references = await referenceData.loadAllReferences();

    // 2) Che168 (сначала — быстрее, нет HP-поиска)
    const che168Total = await getChe168RowCount();
    logger(`📊 Che168: ${che168Total} строк`);
    if (che168Total > 0) {
      await spawnWorkers('che168', che168Total, references);
      logger('🏁 Che168 воркеры завершены');
    }

    // 3) Encar
    const encarTotal = await getEncarRowCount();
    logger(`📊 Encar: ${encarTotal} строк`);
    await spawnWorkers('encar', encarTotal, references);
    logger('🏁 Encar воркеры завершены');

    // 4) Финальная сверка
    await finalIdSync(references);

    // 5) Генерация фильтров (после того как все записи на месте)
    await generateFilters();

    // 7) Cleanup
    referenceData.clearReferences();
    references = null;
    if (global.gc) { try { global.gc(); } catch {} }

    await runCleanupScript();

    // 8) VACUUM
    let marker = readMarker();
    marker.vacuumCounter = (marker.vacuumCounter || 0) + 1;
    saveMarker(marker);

    if (marker.vacuumCounter >= (config.vacuumAnalyzeInterval ?? 24)) {
      await runVacuumAnalyze();
      saveMarker({ vacuumCounter: 0 });
    }

  } catch (error) {
    logger(`❌ Критическая ошибка: ${error.message}`);
  } finally {
    masterIsRunning = false;
    const now = Date.now();
    const plannedNext = bigScheduledAt + BIG_INTERVAL_MS;
    const delay = Math.max(0, plannedNext - now);
    logger(`⏳ Следующий ПОЛНЫЙ пересчёт через ${Math.ceil(delay / 60000)} мин`);
    bigScheduledAt = plannedNext;
    setTimeout(runMasterProcess, delay);
  }
}

// === МАЛЫЙ ЦИКЛ ===
async function runSmallProcess() {
  const isQuickMode = masterIsRunning;

  try {
    await processNullHpCars();
    await syncZeroHpFromReference();

    let references = await referenceData.loadAllReferences();

    if (isQuickMode) {
      // Быстрый режим: только новые авто
      await quickSyncNewCars(references);
    } else {
      logger(`🕑 [${new Date().toISOString()}] Малый цикл`);
      await finalIdSync(references);
      await recalcPriceMismatches(references);
    }

    referenceData.clearReferences();
    references = null;
    if (global.gc) { try { global.gc(); } catch {} }

  } catch (e) {
    logger(`❌ Ошибка малого цикла: ${e.message}`);
  } finally {
    const interval = isQuickMode ? 60 * 1000 : SMALL_INTERVAL_MS;
    setTimeout(runSmallProcess, interval);
  }
}

async function quickSyncNewCars(references) {
  const client = await pool.connect();
  try {
    // Encar: новые
    const { rows: newEncar } = await client.query(`
      SELECT p.id FROM encar_db_prod p
      WHERE p.cartype != 'Z'
        AND (p.id::text || '_en') NOT IN (SELECT id FROM auto_webcatalog WHERE source = 'K')
      LIMIT 500
    `);
    if (newEncar.length) {
      logger(`⚡ Новые encar: ${newEncar.length}`);
      const chunk = config.fetchBatchSize || 200;
      for (let i = 0; i < newEncar.length; i += chunk) {
        const ids = newEncar.slice(i, i + chunk).map(r => r.id);
        const rows = await fetchEncarByIds(ids);
        if (!rows.length) continue;
        const calc = await calculateBatch(rows, references, 'encar');
        await updateData(calc);
        await new Promise(r => setTimeout(r, 50));
      }
    }

    // Che168: новые
    const { rows: newChe168 } = await client.query(`
      SELECT c.inner_id FROM che168_autoparser c
      WHERE c.engine_type IN ('Бензиновый', 'Дизельный')
        AND c.price IS NOT NULL AND c.price > 0
        AND (c.inner_id || '_ch') NOT IN (SELECT id FROM auto_webcatalog WHERE source = 'C')
      LIMIT 500
    `);
    if (newChe168.length) {
      logger(`⚡ Новые che168: ${newChe168.length}`);
      const chunk = config.fetchBatchSize || 200;
      for (let i = 0; i < newChe168.length; i += chunk) {
        const ids = newChe168.slice(i, i + chunk).map(r => r.inner_id);
        const rows = await fetchChe168ByIds(ids);
        if (!rows.length) continue;
        const calc = await calculateBatch(rows, references, 'che168');
        await updateData(calc);
        await new Promise(r => setTimeout(r, 50));
      }
    }

    if (!newEncar.length && !newChe168.length) {
      logger('✅ Нет новых авто');
    }
  } catch (e) {
    logger(`❌ Ошибка быстрой синхронизации: ${e.message}`);
  } finally {
    client.release();
  }
}

// --- Запуск ---
logger('🚀 auto-webcatalog-recalc starting (Korea + China unified)');
runMasterProcess();
setTimeout(runSmallProcess, SMALL_INTERVAL_MS);
