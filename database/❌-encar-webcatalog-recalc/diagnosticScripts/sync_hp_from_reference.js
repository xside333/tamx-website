/**
 * sync_hp_from_reference.js - синхронизация HP между encar_db_prod и cars_hp_reference_v2
 * 
 * Использование: node sync_hp_from_reference.js
 * 
 * Что делает:
 * 1. Находит все записи в encar_db_prod
 * 2. Сопоставляет с cars_hp_reference_v2 по фильтру (как в carApi_v2.js)
 * 3. Если HP в reference отличается от HP в prod - обновляет prod
 * 
 * Это исправляет случаи когда:
 * - В encar_db_prod hp = 200
 * - В cars_hp_reference_v2 hp = 250 (обновлено через OpenAI)
 * 
 * Логи пишутся в ./logs_sync_hp.log
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============ КОНФИГУРАЦИЯ ============
const DATABASE_URL = 'postgresql://encaruser:jOsbdJSDH37@localhost:5432/encar_local_db';
const LOG_FILE = path.join(__dirname, 'logs_sync_hp.log');
const BATCH_SIZE = 500;

// ============ ЛОГГЕР ============
function getSeoulTime() {
  return new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\. /g, '-').replace('.', '');
}

function log(level, message) {
  const time = getSeoulTime();
  const line = `[${time}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

const logger = {
  info: (msg) => log('INFO', msg),
  warn: (msg) => log('WARN', msg),
  error: (msg) => log('ERROR', msg),
};

// ============ ОСНОВНАЯ ЛОГИКА ============
async function main() {
  logger.info('========================================');
  logger.info('🚀 Запуск sync_hp_from_reference.js');
  logger.info('========================================');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });
  
  const client = await pool.connect();
  
  try {
    // Шаг 1: Получаем общее количество записей для обработки
    logger.info('🔍 Подсчёт записей в encar_db_prod...');
    
    const countRes = await client.query(`SELECT COUNT(*)::int as cnt FROM encar_db_prod`);
    const totalRecords = countRes.rows[0].cnt;
    
    logger.info(`📊 Всего записей в encar_db_prod: ${totalRecords}`);
    
    // Шаг 2: Находим все расхождения HP между encar_db_prod и cars_hp_reference_v2
    // Используем ту же логику сопоставления, что и в carApi_v2.js
    logger.info('🔍 Поиск расхождений HP между encar_db_prod и cars_hp_reference_v2...');
    
    const mismatchQuery = `
      SELECT 
        p.id,
        p.cartype,
        p.manufacturerenglishname,
        p.modelgroupenglishname,
        p.modelname,
        p.gradeenglishname,
        p.yearmonth,
        p.fuelname,
        p.transmission_name,
        p.displacement,
        p.hp as prod_hp,
        r.hp as ref_hp,
        r.source as ref_source,
        r.marker as ref_marker
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
      WHERE r.hp > 0 AND r.hp <> COALESCE(p.hp, 0)
      ORDER BY p.id
    `;
    
    const { rows: mismatches } = await client.query(mismatchQuery);
    
    if (mismatches.length === 0) {
      logger.info('✅ Расхождений HP не найдено. Все записи синхронизированы.');
      return;
    }
    
    logger.info(`⚠️ Найдено ${mismatches.length} расхождений HP`);
    
    // Статистика
    let updated = 0;
    let errors = 0;
    
    // Группируем по типу расхождения
    const zeroToValue = mismatches.filter(m => (m.prod_hp || 0) === 0);
    const valueToValue = mismatches.filter(m => (m.prod_hp || 0) > 0);
    
    logger.info(`   - prod_hp = 0, ref_hp > 0: ${zeroToValue.length}`);
    logger.info(`   - prod_hp > 0, ref_hp отличается: ${valueToValue.length}`);
    
    // Шаг 3: Обновляем записи
    logger.info('\n📝 Начинаю обновление записей...\n');
    
    for (let i = 0; i < mismatches.length; i++) {
      const record = mismatches[i];
      const year = record.yearmonth ? Math.floor(parseInt(record.yearmonth, 10) / 100) : null;
      const carDesc = `${record.manufacturerenglishname} ${record.modelgroupenglishname} ${record.modelname} (${year})`;
      
      try {
        await client.query(
          `UPDATE encar_db_prod SET hp = $1 WHERE id = $2`,
          [record.ref_hp, record.id]
        );
        
        const changeType = (record.prod_hp || 0) === 0 ? '0' : record.prod_hp;
        logger.info(`✅ [${i + 1}/${mismatches.length}] ID ${record.id} | ${carDesc} | HP: ${changeType} → ${record.ref_hp} (${record.ref_source})`);
        updated++;
        
      } catch (err) {
        logger.error(`❌ [${i + 1}/${mismatches.length}] ID ${record.id} | Ошибка: ${err.message}`);
        errors++;
      }
      
      // Пауза каждые 100 записей чтобы не нагружать БД
      if (i > 0 && i % 100 === 0) {
        logger.info(`   ... обработано ${i}/${mismatches.length}`);
        await new Promise(r => setTimeout(r, 50));
      }
    }
    
    // Итоги
    logger.info('\n========================================');
    logger.info('📊 ИТОГИ:');
    logger.info(`   ✅ Обновлено: ${updated}`);
    logger.info(`   ❌ Ошибок: ${errors}`);
    logger.info(`   📝 Всего расхождений было: ${mismatches.length}`);
    logger.info('========================================');
    
  } catch (error) {
    logger.error(`❌ Критическая ошибка: ${error.message}`);
    logger.error(error.stack);
  } finally {
    client.release();
    await pool.end();
    logger.info('🏁 Скрипт завершён');
  }
}

// Запуск
main().catch(err => {
  logger.error(`❌ Fatal error: ${err.message}`);
  process.exit(1);
});

