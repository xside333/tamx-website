// src/index_v3.js
// Версия с интегрированным HP поиском в процесс пересчёта
// Если hp = null/0 в encar_db_prod → ищем через pan-auto/OpenAI → пишем в справочник + prod

import { Worker } from 'worker_threads';
import { readMarker, saveMarker, fetchDataByIds } from './components/fetchData.js';
import referenceData from './components/referenceData_v2.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';
import { pool } from './utils/dbClient.js';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { calculateBatch } from './components/calculateBatch_v2.js';
import { updateData } from './components/updateData.js';
// [V3] HP поиск интегрирован в процесс
import { findAndSetHp } from './components/hpSearchService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Глобальные флаги/тайминги ---
let masterIsRunning = false;
const BIG_INTERVAL_MS   = (config.recalculationIntervalMinutes ?? 60) * 60 * 1000;
const SMALL_INTERVAL_MS = (config.syncIntervalMinutes ?? 2) * 60 * 1000;
let bigScheduledAt = null;

// --- CLEANUP SCRIPT ---
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
    await client.query('VACUUM ANALYZE cars_hp_reference_v2;');
    logger(`🔧 VACUUM ANALYZE выполнен успешно (encar_webcatalog + cars_hp_reference_v2)`);
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

// Логи HP синхронизации - только в консоль
// Основные логи HP поиска пишутся в hpSearchService.js → logs/hp_search.log

/**
 * [V3] Синхронизация hp=0 из encar_db_prod с cars_hp_reference_v2
 * Если в reference есть hp>0 → обновляем prod
 * Обрабатывает ВСЕ записи батчами по 200 шт
 */
async function syncZeroHpFromReference() {
  const client = await pool.connect();
  const BATCH_SIZE = 200;
  const MAX_BATCHES = 100; // Защита от бесконечного цикла
  
  try {
    logger('🔍 [V3] Синхронизация hp=0 с cars_hp_reference_v2...');
    
    let totalSynced = 0;
    let totalChecked = 0;
    let batchNum = 0;
    
    // Цикл по батчам пока есть что синхронизировать
    while (batchNum < MAX_BATCHES) {
      batchNum++;
      
      // Берём авто с hp=0, у которых в reference есть hp>0 (JOIN для оптимизации)
      const { rows: cars } = await client.query(`
        SELECT p.id, p.cartype, p.manufacturerenglishname, p.modelgroupenglishname, p.modelname,
               p.gradeenglishname, p.yearmonth, p.fuelname, p.transmission_name, p.displacement,
               r.hp as ref_hp, r.source as ref_source, r.id as ref_id
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
      
      if (!cars.length) {
        // Нет больше записей для синхронизации
        break;
      }
      
      totalChecked += cars.length;
      let batchSynced = 0;
      
      for (const car of cars) {
        const year = car.yearmonth ? Math.floor(parseInt(car.yearmonth, 10) / 100) : null;
        const carName = `${car.manufacturerenglishname} ${car.modelgroupenglishname} ${car.modelname} (${year})`;
        
        // Обновляем encar_db_prod
        await client.query('UPDATE encar_db_prod SET hp = $1 WHERE id = $2', [car.ref_hp, car.id]);
        batchSynced++;
        totalSynced++;
        
        // Логируем в файл
        logger(`SYNC: ID ${car.id} | ${carName} | hp: 0 → ${car.ref_hp} (${car.ref_source})`);
      }
      
      logger(`🔄 Батч ${batchNum}: синхронизировано ${batchSynced}/${cars.length} (всего: ${totalSynced})`);
      
      // Пауза между батчами чтобы не нагружать БД
      if (cars.length === BATCH_SIZE) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    if (totalSynced > 0) {
      logger(`✅ HP синхронизация завершена: ${totalSynced} записей обновлено`);
    } else {
      logger(`✅ HP синхронизация: нет расхождений`);
    }
    
    return { synced: totalSynced, checked: totalChecked };
    
  } catch (e) {
    logger(`❌ Ошибка HP синхронизации: ${e.message}`);
    return { synced: 0, checked: 0 };
  } finally {
    client.release();
  }
}

/**
 * [V3] Обработка авто с hp = null/0 перед пересчётом
 * Ищет HP через справочник → pan-auto → OpenAI
 * Справочник предотвращает повторные API вызовы для уже проверенных фильтров
 */
async function processNullHpCars() {
  const client = await pool.connect();
  try {
    logger('🐴 [V3] Поиск HP для авто с hp = NULL/0...');
    
    // hp IS NULL или hp = 0 — справочник определит, нужен ли API запрос
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
      return { found: 0, notFound: 0 };
    }
    
    logger(`🔄 Найдено ${cars.length} авто с hp = NULL/0. Ищу HP...`);
    
    let foundHp = 0, notFoundHp = 0, skipped = 0;
    
    for (const car of cars) {
      const result = await findAndSetHp(car);
      if (result.skipped) {
        skipped++;
      } else if (result.hp > 0) {
        foundHp++;
      } else {
        notFoundHp++;
      }
      
      // Небольшая пауза каждые 10 авто
      if ((foundHp + notFoundHp + skipped) % 10 === 0) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    const stats = [`найдено hp: ${foundHp}`, `не найдено: ${notFoundHp}`];
    if (skipped > 0) stats.push(`пропущено (уже в ref с hp=0): ${skipped}`);
    logger(`✅ HP поиск: ${stats.join(', ')}`);
    return { found: foundHp, notFound: notFoundHp, skipped };
    
  } catch (e) {
    logger(`❌ Ошибка HP поиска: ${e.message}`);
    return { found: 0, notFound: 0 };
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
        await new Promise(r => setTimeout(r, 50));
      }
      logger('✅ Догонка завершена');
    } else {
      logger('✅ Нет недостающих строк для досчёта');
    }
  } catch (e) {
    logger(`❌ Ошибка финальной сверки id: ${e.message}`);
  } finally {
    prodIdsRes = null;
    catalogIdsRes = null;
    if (global.gc) { try { global.gc(); } catch {} }
    client.release();
  }
}

/**
 * Точечный пересчёт записей, где отличается price
 */
async function recalcPriceMismatches(references) {
  const client = await pool.connect();
  try {
    logger('💱 Проверка расхождений price...');
    const res = await client.query(`
      SELECT p.id FROM encar_db_prod p
      JOIN encar_webcatalog w USING(id)
      WHERE p.price IS NOT NULL AND w.price IS NOT NULL AND p.price <> w.price
    `);

    const ids = res.rows.map(r => r.id);
    if (!ids.length) {
      logger('✅ Расхождений по price не найдено');
      return;
    }

    logger(`🔄 Найдено расхождений по price: ${ids.length}. Пересчитываю...`);

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
      await new Promise(r => setTimeout(r, 50));
    }

    logger('✅ Точечный пересчёт по price завершён');
  } catch (e) {
    logger(`❌ Ошибка при пересчёте price: ${e.message}`);
  } finally {
    client.release();
  }
}

/**
 * Точечный пересчёт записей, где отличается hp
 */
async function recalcHpMismatches(references) {
  const client = await pool.connect();
  try {
    logger('🐴 Проверка расхождений hp...');
    const res = await client.query(`
      SELECT p.id FROM encar_db_prod p
      JOIN encar_webcatalog w USING(id)
      WHERE p.hp IS NOT NULL AND p.hp > 0
        AND (w.hp IS NULL OR w.hp = 0 OR w.hp <> p.hp)
    `);

    const ids = res.rows.map(r => r.id);
    if (!ids.length) {
      logger('✅ Расхождений по hp не найдено');
      return;
    }

    logger(`🔄 Найдено расхождений по hp: ${ids.length}. Пересчитываю...`);

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
      await new Promise(r => setTimeout(r, 50));
    }

    logger('✅ Точечный пересчёт по hp завершён');
  } catch (e) {
    logger(`❌ Ошибка при пересчёте hp: ${e.message}`);
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
  logger(`🚀 [${new Date(startTs).toISOString()}] Старт ПОЛНОГО пересчёта (v3 с HP поиском)`);

  try {
    // [V3] 0) Поиск HP для авто с hp = NULL
    await processNullHpCars();
    
    // [V3] 0.5) Синхронизация hp=0 с reference (если там hp>0)
    await syncZeroHpFromReference();

    // 1) Справочники
    let references = await referenceData.loadAllReferences();

    // 2) Разбивка на воркеры
    const totalRows = await getRowCountFromDb();
    const numWorkers = Math.min(3, os.cpus().length);
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

      const workerPath = path.join(__dirname, 'components', 'workerCalc_v2.js');
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

    // 6) Очистка
    referenceData.clearReferences();
    references = null;
    if (global.gc) { try { global.gc(); } catch {} }

    // 7) Cleanup + VACUUM
    await runCleanupScript();

    marker = readMarker();
    marker.vacuumCounter = (marker.vacuumCounter || 0) + 1;
    marker.currentOffset = 0;
    marker.processedRows = marker.totalRows;
    saveMarker(marker);

    if (marker.vacuumCounter >= (config.vacuumAnalyzeInterval ?? 24)) {
      logger('🔧 VACUUM ANALYZE...');
      await runVacuumAnalyze();
      marker.vacuumCounter = 0;
      saveMarker(marker);
    }

    const active = await checkActiveConnections();
    if (typeof active === 'number' && active >= 80) {
      logger('⚠️ Высокое число подключений к БД');
    }

  } catch (error) {
    logger(`❌ Критическая ошибка: ${error.message}`);
  } finally {
    masterIsRunning = false;
    const now = Date.now();
    const plannedNext = bigScheduledAt + BIG_INTERVAL_MS;
    const delay = Math.max(0, plannedNext - now);
    const mins = Math.ceil(delay / 60000);
    logger(`⏳ Следующий ПОЛНЫЙ пересчёт через ${mins} мин`);
    bigScheduledAt = plannedNext;
    setTimeout(runMasterProcess, delay);
  }
}

// === МАЛЫЙ ЦИКЛ ===
async function runSmallProcess() {
  // Если большой цикл работает — делаем ТОЛЬКО быструю синхронизацию новых авто
  const isQuickMode = masterIsRunning;
  
  if (isQuickMode) {
    logger('⚡ Быстрая синхронизация новых авто (большой цикл работает)...');
  }

  try {
    // [V3] Поиск HP для авто с hp = NULL (всегда — иначе utilFee = 0)
    await processNullHpCars();
    
    // [V3] Синхронизация hp=0 с reference (если там hp>0)
    await syncZeroHpFromReference();

    // Загружаем справочники
    let references = await referenceData.loadAllReferences();
    
    if (isQuickMode) {
      // БЫСТРЫЙ РЕЖИМ: только добавляем новые авто
      // HP будет найден воркерами большого цикла или при следующем полном малом цикле
      await quickSyncNewCars(references);
    } else {
      // ПОЛНЫЙ РЕЖИМ: полная сверка
      logger(`🕑 [${new Date().toISOString()}] Точечная сверка (малый цикл v3)`);
      await finalIdSyncAndCalc(references);
      await recalcPriceMismatches(references);
      await recalcHpMismatches(references);
    }

    referenceData.clearReferences();
    references = null;
    if (global.gc) { try { global.gc(); } catch {} }

    if (!isQuickMode) {
      logger('🧽 Малый цикл: память очищена');
    }

  } catch (e) {
    logger(`❌ Ошибка малого цикла: ${e.message}`);
  } finally {
    const interval = isQuickMode ? 60 * 1000 : SMALL_INTERVAL_MS; // 1 мин в быстром режиме
    const mins = Math.round(interval / 60000);
    logger(`⏳ Следующий ${isQuickMode ? 'БЫСТРЫЙ' : 'МАЛЫЙ'} цикл через ${mins} мин`);
    setTimeout(runSmallProcess, interval);
  }
}

/**
 * Быстрая синхронизация ТОЛЬКО новых авто (без удаления, без пересчёта price/hp)
 * Безопасно запускать во время большого цикла
 */
async function quickSyncNewCars(references) {
  const client = await pool.connect();
  try {
    // Находим авто которых нет в webcatalog
    const res = await client.query(`
      SELECT p.id FROM encar_db_prod p
      LEFT JOIN encar_webcatalog w ON p.id = w.id
      WHERE w.id IS NULL
      LIMIT 500
    `);
    
    const ids = res.rows.map(r => r.id);
    if (!ids.length) {
      logger('✅ Нет новых авто для синхронизации');
      return;
    }
    
    logger(`⚡ Найдено ${ids.length} новых авто. Добавляю в webcatalog...`);
    
    const chunk = config.fetchBatchSize || 200;
    let added = 0;
    
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const rows = await fetchDataByIds(slice);
      if (!rows.length) continue;
      
      const calculated = await calculateBatch(rows, references);
      await updateData(calculated);
      added += rows.length;
      
      await new Promise(r => setTimeout(r, 50));
    }
    
    logger(`✅ Добавлено ${added} новых авто в webcatalog`);
    
  } catch (e) {
    logger(`❌ Ошибка быстрой синхронизации: ${e.message}`);
  } finally {
    client.release();
  }
}

// --- Запуск ---
logger('🚀 encar-recalc v3 starting (HP search integrated)');
runMasterProcess();
setTimeout(runSmallProcess, SMALL_INTERVAL_MS);

