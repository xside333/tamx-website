// src/index.js

import { Worker } from 'worker_threads';
import { readMarker, saveMarker, fetchDataByIds } from './components/fetchData.js';
import referenceData from './components/referenceData.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';
import { pool } from './utils/dbClient.js';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { calculateBatch } from './components/calculateBatch.js';
import { updateData } from './components/updateData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Глобальные флаги/тайминги ---
let masterIsRunning = false; // Защита от наложения большого цикла
const BIG_INTERVAL_MS   = (config.recalculationIntervalMinutes ?? 60) * 60 * 1000;
const SMALL_INTERVAL_MS = (config.syncIntervalMinutes ?? 10) * 60 * 1000;

// Якорь расписания для БОЛЬШОГО цикла: "запланированный" старт прошлого запуска.
// Первый раз инициализируем при старте (немедленный запуск), дальше сдвигаем фиксированно.
let bigScheduledAt = null;

// --- CLEANUP SCRIPT (robust path) ---
async function runCleanupScript() {
  const cleanupPath = path.join(__dirname, 'cleanup.js');
  return new Promise((resolve) => {
    exec(`node "${cleanupPath}"`, (error, stdout, stderr) => {
      if (error) logger(`❌ Ошибка cleanup.js: ${error.message}`);
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
    await client.query('VACUUM ANALYZE encar_webcatalog;');
    logger(`🔧 VACUUM ANALYZE выполнен успешно`);
  } catch (error) {
    logger(`❌ Ошибка VACUUM ANALYZE: ${error.message}`);
  } finally {
    client.release();
  }
}

// --- ACTIVE CONNECTIONS ---
async function checkActiveConnections() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT count(*)::int AS total FROM pg_stat_activity;');
    return res.rows[0].total;
  } catch (error) {
    logger(`❌ Ошибка при проверке соединений: ${error.message}`);
    return null;
  } finally {
    client.release();
  }
}

// --- Получить число строк в прод-таблице ---
async function getRowCountFromDb() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT COUNT(*)::int AS cnt FROM encar_db_prod;');
    return res.rows[0].cnt;
  } finally {
    client.release();
  }
}

// --- Финальная сверка по id + догонка недостающих ---
async function finalIdSyncAndCalc(references) {
  const client = await pool.connect();
  let prodIdsRes = null, catalogIdsRes = null;
  try {
    logger('🔍 Финальная сверка id между encar_db_prod и encar_webcatalog...');
    prodIdsRes    = await client.query('SELECT id FROM encar_db_prod;');
    catalogIdsRes = await client.query('SELECT id FROM encar_webcatalog;');

    const prodIds    = new Set(prodIdsRes.rows.map(r => r.id));
    const catalogIds = new Set(catalogIdsRes.rows.map(r => r.id));

    // 1) Удаление "висячих"
    const idsToDelete = [];
    for (const id of catalogIds) if (!prodIds.has(id)) idsToDelete.push(id);
    if (idsToDelete.length) {
      await client.query('DELETE FROM encar_webcatalog WHERE id = ANY($1::bigint[])', [idsToDelete]);
      logger(`🗑️ Удалено висячих строк: ${idsToDelete.length}`);
    }

    // 2) Досчёт недостающих
    const idsToAdd = [];
    for (const id of prodIds) if (!catalogIds.has(id)) idsToAdd.push(id);

    if (idsToAdd.length) {
      logger(`🔄 Требуется досчитать и добавить: ${idsToAdd.length} строк`);
      const chunk = config.fetchBatchSize || 200;
      for (let i = 0; i < idsToAdd.length; i += chunk) {
        const slice = idsToAdd.slice(i, i + chunk);
        const rows = await fetchDataByIds(slice);
        const calculated = await calculateBatch(rows, references);
        await updateData(calculated);
        if ((i / chunk) % 5 === 0) {
          logger(`➡️ Догон: ${Math.min(i + chunk, idsToAdd.length)} / ${idsToAdd.length}`);
        }
        // Мягкая пауза, чтобы не душить БД
        await new Promise(r => setTimeout(r, 50));
      }
      logger('✅ Догонка завершена');
    } else {
      logger('✅ Нет недостающих строк для досчёта');
    }
  } catch (e) {
    logger(`❌ Ошибка финальной сверки id: ${e.message}`);
  } finally {
    // Явная очистка тяжёлых ссылок, чтобы малый цикл не держал RAM
    prodIdsRes = null;
    catalogIdsRes = null;
    if (global.gc) {
      try { global.gc(); } catch {}
    }
    client.release();
  }
}

/**
 * Точечный пересчёт записей, где отличается price между encar_db_prod и encar_webcatalog.
 * Вызывается только в МАЛОМ цикле после finalIdSyncAndCalc().
 */
async function recalcPriceMismatches(references) {
  const client = await pool.connect();
  try {
    logger('💱 Проверка расхождений price между encar_db_prod и encar_webcatalog...');
    const res = await client.query(`
      SELECT p.id
      FROM encar_db_prod p
      JOIN encar_webcatalog w USING(id)
      WHERE p.price IS NOT NULL
        AND w.price IS NOT NULL
        AND p.price <> w.price
    `);

    const ids = res.rows.map(r => r.id);
    if (!ids.length) {
      logger('✅ Расхождений по price не найдено');
      return;
    }

    logger(`🔄 Найдено расхождений по price: ${ids.length}. Запускаю точечный пересчёт...`);

    const chunk = config.fetchBatchSize || 200;
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const rows = await fetchDataByIds(slice);
      if (!rows.length) continue;

      const calculated = await calculateBatch(rows, references);
      await updateData(calculated);

      if ((i / chunk) % 5 === 0) {
        logger(`➡️ Пересчитано ${Math.min(i + chunk, ids.length)} / ${ids.length}`);
      }
      // Лёгкая пауза, чтобы не грузить БД
      await new Promise(r => setTimeout(r, 50));
    }

    logger('✅ Точечный пересчёт по расхождениям price завершён');
  } catch (e) {
    logger(`❌ Ошибка при пересчёте расхождений price: ${e.message}`);
  } finally {
    client.release();
  }
}

// === БОЛЬШОЙ ЦИКЛ === (фиксированный интервал от времени старта)
async function runMasterProcess() {
  if (masterIsRunning) return;
  masterIsRunning = true;

  const startTs = Date.now();
  if (bigScheduledAt === null) {
    // Первый запуск сразу — якорим расписание на "сейчас"
    bigScheduledAt = startTs;
  }
  logger(`🚀 [${new Date(startTs).toISOString()}] Старт ПОЛНОГО пересчёта`);

  try {
    // 1) Справочники
    let references = await referenceData.loadAllReferences();

    // 2) Разбивка на воркеры (макс. 4)
    const totalRows = await getRowCountFromDb();
    const numWorkers = Math.min(4, os.cpus().length);
    const chunkSize = Math.ceil(totalRows / numWorkers);

    logger(`📦 Всего строк: ${totalRows}`);
    logger(`🔀 Воркеров: ${numWorkers}, по ~${chunkSize} строк`);

    // 3) Маркер прогресса
    let marker = readMarker();
    marker.processedRows = 0;
    marker.totalRows = totalRows;
    saveMarker(marker);

    // 4) Запуск воркеров
    const workers = [];
    let processedRows = 0;

    for (let i = 0; i < numWorkers; i++) {
      const offset = i * chunkSize;
      const limit = Math.min(chunkSize, totalRows - offset);
      if (limit <= 0) continue;

      const workerPath = path.join(__dirname, 'components', 'workerCalc.js');
      workers.push(
        new Promise((resolve, reject) => {
          const worker = new Worker(workerPath, { workerData: { offset, limit, references } });

          worker.on('message', (msg) => {
            if (msg?.status === 'done') {
              processedRows += (msg.rowsProcessed || 0);
              const m = readMarker();
              m.processedRows = processedRows;
              m.totalRows = totalRows;
              saveMarker(m);
              logger(`✅ Воркер завершён: +${msg.rowsProcessed} (итого ${processedRows}/${totalRows})`);
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

      logger(`🔧 Воркер #${i + 1} стартовал (offset ${offset}, limit ${limit})`);
    }

    await Promise.all(workers);
    logger('🏁 Все воркеры завершили обработку');

    // 5) Финальная сверка/догонка
    await finalIdSyncAndCalc(references);

    // 6) Очистка справочников (RAM hygiene)
    referenceData.clearReferences();
    references = null;
    if (global.gc) {
      try { global.gc(); } catch {}
    }

    // 7) Лёгкий cleanup + периодический VACUUM ANALYZE
    await runCleanupScript();

    marker = readMarker();
    marker.vacuumCounter = (marker.vacuumCounter || 0) + 1;
    marker.currentOffset = 0;
    marker.processedRows = marker.totalRows;
    saveMarker(marker);

    if (marker.vacuumCounter >= (config.vacuumAnalyzeInterval ?? 24)) {
      logger('🔧 Порог вакуума достигнут — выполняем VACUUM ANALYZE...');
      await runVacuumAnalyze();
      marker.vacuumCounter = 0;
      saveMarker(marker);
    }

    const active = await checkActiveConnections();
    if (typeof active === 'number' && active >= 80) {
      logger('⚠️ Высокое число подключений к БД');
    }

  } catch (error) {
    logger(`❌ Критическая ошибка полного цикла: ${error.message}`);
  } finally {
    masterIsRunning = false;

    // === Расписание следующего старта ПО ФИКСИРОВАННОМУ ИНТЕРВАЛУ ===
    const now = Date.now();
    // следующий старт = запланированный старт + интервал
    const plannedNext = bigScheduledAt + BIG_INTERVAL_MS;
    const delay = Math.max(0, plannedNext - now);

    const mins = Math.ceil(delay / 60000);
    const when = new Date(now + delay).toISOString();
    logger(`⏳ Следующий ПОЛНЫЙ пересчёт через ${mins} мин (в ${when})`);

    // фиксируем новый «запланированный старт» (шаг вперёд на интервал)
    bigScheduledAt = plannedNext;

    setTimeout(runMasterProcess, delay);
  }
}

// === МАЛЫЙ ЦИКЛ === (интервал — ПОСЛЕ ЗАВЕРШЕНИЯ; в конце чистим память)
async function runSmallProcess() {
  if (masterIsRunning) {
    logger('⏸️ Малый цикл ждёт завершения большого...');
    setTimeout(runSmallProcess, 60 * 1000);
    return;
  }

  try {
    let references = await referenceData.loadAllReferences();
    logger(`🕑 [${new Date().toISOString()}] Запуск точечной сверки (малый цикл)`);

    // 1) Сверка по id
    await finalIdSyncAndCalc(references);

    // 2) Точечная сверка по price + пересчёт
    await recalcPriceMismatches(references);

    // RAM hygiene для малого цикла
    referenceData.clearReferences();
    references = null;
    if (global.gc) {
      try { global.gc(); } catch {}
    }

    logger('🧽 Малый цикл: память очищена (refs сброшены, GC запрошен)');

  } catch (e) {
    logger(`❌ Ошибка малого цикла: ${e.message}`);
  } finally {
    logger(`⏳ Следующий МАЛЫЙ цикл через ${Math.round(SMALL_INTERVAL_MS / 60000)} мин`);
    setTimeout(runSmallProcess, SMALL_INTERVAL_MS);
  }
}

// --- Запуск обоих процессов ---
runMasterProcess();  // первый большой — сразу, далее фиксированное расписание
runSmallProcess();   // малый — после завершения + интервал
