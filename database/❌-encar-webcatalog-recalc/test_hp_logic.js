#!/usr/bin/env node
/**
 * Тестовый скрипт для проверки логики HP на 5-10 авто
 * Без перезапусков PM2
 */

import dotenv from 'dotenv';
dotenv.config();

import { pool } from './src/utils/dbClient.js';
import { findAndSetHp } from './src/components/hpSearchService.js';
import { calculateBatch } from './src/components/calculateBatch_v2.js';
import referenceData from './src/components/referenceData_v2.js';

const TEST_LIMIT = 10;

async function testHpLogic() {
  console.log('🧪 === ТЕСТИРОВАНИЕ ЛОГИКИ HP ===\n');
  
  const client = await pool.connect();
  try {
    // 1. Проверка сортировки (DESC по firstadvertiseddatetime)
    console.log('1️⃣ Проверка сортировки (DESC по firstadvertiseddatetime)...');
    const sortCheck = await client.query(`
      SELECT id, firstadvertiseddatetime, manufacturerenglishname, modelname, hp
      FROM encar_db_prod
      ORDER BY firstadvertiseddatetime DESC
      LIMIT ${TEST_LIMIT}
    `);
    
    console.log(`✅ Топ ${TEST_LIMIT} авто (по дате DESC):`);
    sortCheck.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ID ${row.id} | ${row.firstadvertiseddatetime} | ${row.manufacturerenglishname} ${row.modelname} | HP: ${row.hp || 'NULL'}`);
    });
    
    // 2. Проверка логики поиска HP (cars_hp_reference_v2 → Pan-Auto → OpenAI)
    console.log('\n2️⃣ Проверка логики поиска HP...');
    
    // Берём 5 авто с hp = NULL или 0
    const testCars = await client.query(`
      SELECT id, cartype, manufacturername, manufacturerenglishname,
             modelgroupname, modelgroupenglishname, modelname,
             gradename, gradeenglishname, yearmonth, fuelname,
             transmission_name, displacement, hp,
             firstadvertiseddatetime
      FROM encar_db_prod
      WHERE hp IS NULL OR hp = 0
      ORDER BY firstadvertiseddatetime DESC
      LIMIT 5
    `);
    
    console.log(`📋 Найдено ${testCars.rows.length} авто для теста:\n`);
    
    for (const car of testCars.rows) {
      const year = car.yearmonth ? Math.floor(parseInt(car.yearmonth, 10) / 100) : null;
      const carName = `${car.manufacturerenglishname} ${car.modelgroupenglishname} ${car.modelname} (${year})`;
      
      console.log(`🚗 ID ${car.id} | ${carName}`);
      console.log(`   HP до: ${car.hp ?? 'NULL'}`);
      
      // Тестируем поиск HP
      const result = await findAndSetHp(car);
      
      console.log(`   HP после: ${result.hp}`);
      console.log(`   Источник: ${result.source}`);
      console.log(`   Обновлено в БД: ${result.updated ? '✅' : '❌'}`);
      console.log('');
    }
    
    // 3. Проверка интеграции с calculateBatch_v2
    console.log('3️⃣ Проверка интеграции с calculateBatch_v2...');
    
    const batchCars = await client.query(`
      SELECT id, url, cartype, firstadvertiseddatetime, viewcount, manufacturername,
             manufacturerenglishname, modelgroupname, modelgroupenglishname, modelname,
             gradename, gradeenglishname, yearmonth, yearmonth_prod, mileage, colorname,
             fuelname, price, vehicleno, myaccidentcnt, myaccidentcost, address,
             photo_paths, seat_count, transmission_name, trust, displacement, hp,
             inspection_outers
      FROM encar_db_prod
      ORDER BY firstadvertiseddatetime DESC
      LIMIT 3
    `);
    
    console.log(`📦 Тестирую calculateBatch на ${batchCars.rows.length} авто...`);
    
    const references = await referenceData.loadAllReferences();
    const calculated = await calculateBatch(batchCars.rows, references);
    
    console.log(`✅ Результаты расчёта:\n`);
    calculated.forEach((car, i) => {
      const utilFee = car.json?.current?.usdt?.customs?.utilFee || 0;
      console.log(`   ${i+1}. ID ${car.id} | ${car.manufacturerenglishname} ${car.modelname}`);
      console.log(`      HP: ${car.hp || 0} | Утильсбор: ${utilFee.toLocaleString()} ₩`);
      console.log(`      JSON.meta.hp: ${car.json?.meta?.hp || 'NULL'}`);
    });
    
    // 4. Статистика HP в БД
    console.log('\n4️⃣ Статистика HP в БД...');
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE hp IS NULL) as hp_null,
        COUNT(*) FILTER (WHERE hp = 0) as hp_zero,
        COUNT(*) FILTER (WHERE hp > 0) as hp_found,
        COUNT(*) as total,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hp > 0) / COUNT(*), 2) as percent_found
      FROM encar_db_prod;
    `);
    
    const stat = stats.rows[0];
    console.log(`📊 encar_db_prod:`);
    console.log(`   HP NULL: ${stat.hp_null} (${((stat.hp_null/stat.total)*100).toFixed(1)}%)`);
    console.log(`   HP = 0: ${stat.hp_zero} (${((stat.hp_zero/stat.total)*100).toFixed(1)}%)`);
    console.log(`   HP > 0: ${stat.hp_found} (${stat.percent_found}%)`);
    console.log(`   Всего: ${stat.total}`);
    
    const statsWebcatalog = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE hp IS NULL) as hp_null,
        COUNT(*) FILTER (WHERE hp = 0) as hp_zero,
        COUNT(*) FILTER (WHERE hp > 0) as hp_found,
        COUNT(*) as total,
        ROUND(100.0 * COUNT(*) FILTER (WHERE hp > 0) / COUNT(*), 2) as percent_found
      FROM encar_webcatalog;
    `);
    
    const statW = statsWebcatalog.rows[0];
    console.log(`\n📊 encar_webcatalog:`);
    console.log(`   HP NULL: ${statW.hp_null} (${((statW.hp_null/statW.total)*100).toFixed(1)}%)`);
    console.log(`   HP = 0: ${statW.hp_zero} (${((statW.hp_zero/statW.total)*100).toFixed(1)}%)`);
    console.log(`   HP > 0: ${statW.hp_found} (${statW.percent_found}%)`);
    console.log(`   Всего: ${statW.total}`);
    
    console.log('\n✅ === ТЕСТ ЗАВЕРШЁН УСПЕШНО ===');
    
  } catch (error) {
    console.error(`❌ Ошибка теста: ${error.message}`);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testHpLogic();

