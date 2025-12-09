/**
 * hpSearchService.js - Сервис поиска HP для encar-recalc
 * 
 * При пересчёте, если hp = null/0 в encar_db_prod:
 * 1. Проверяем cars_hp_reference_v2
 * 2. Если нет → pan-auto → OpenAI
 * 3. Записываем в cars_hp_reference_v2 и encar_db_prod
 */

import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';

// Импорт функций HP поиска
import { getHpFromPanAuto } from '../lib/panAutoApi.js';
import { searchHpInOpenAI } from '../lib/openaiApi.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Паттерны "Others/기타" — для таких авто нет смысла искать HP через API
 * Сразу ставим hp=0
 */
const SKIP_HP_PATTERNS = [
  '기타',           // Others (Korean)
  'Others',        // Others (English)
  '기타 제조사',    // Other manufacturers
  '기타 승용차',    // Other passenger cars
  '기타 수입차',    // Other imported cars
  '기타제조사',     // Other manufacturers (no space)
  'etc',           // etc
  'ETC',
];

/**
 * Проверка: нужно ли пропустить поиск HP (для generic "Others" категорий)
 */
function shouldSkipHpSearch(filter) {
  const fieldsToCheck = [
    filter.manufacturerenglishname,
    filter.manufacturername,
    filter.modelgroupenglishname,
    filter.modelgroupname,
    filter.modelname
  ];
  
  for (const field of fieldsToCheck) {
    if (!field) continue;
    const normalized = field.trim().toLowerCase();
    for (const pattern of SKIP_HP_PATTERNS) {
      if (normalized === pattern.toLowerCase() || normalized.includes(pattern.toLowerCase())) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Поиск HP в справочнике cars_hp_reference_v2
 * Если запись существует (даже с hp=0) — возвращаем её, не делаем повторных запросов к API
 */
async function lookupHpInReference(filter) {
  try {
    const result = await pool.query(`
      SELECT hp, status, source
      FROM cars_hp_reference_v2
      WHERE cartype = $1
        AND manufacturerenglishname = $2
        AND modelgroupenglishname = $3
        AND modelname = $4
        AND COALESCE(gradeenglishname, '') = COALESCE($5, '')
        AND COALESCE(year, 0) = COALESCE($6, 0)
        AND fuelname = $7
        AND COALESCE(transmission_name, '') = COALESCE($8, '')
        AND COALESCE(displacement, 0) = COALESCE($9, 0)
      LIMIT 1
    `, [
      filter.cartype,
      filter.manufacturerenglishname,
      filter.modelgroupenglishname,
      filter.modelname,
      filter.gradeenglishname || '',
      filter.year || 0,
      filter.fuelname,
      filter.transmission_name || '',
      filter.displacement || 0
    ]);
    
    // Если запись существует
    if (result.rows.length > 0) {
      const row = result.rows[0];
      
      // Если статус 'done' — запись уже проверена, используем её значение (даже hp=0)
      if (row.status === 'done') {
        const hp = row.hp ?? 0;  // Если hp = NULL в done записи — считаем 0
        return { hp, source: row.source, found: hp > 0, existsInRef: true };
      }
      
      // Если статус 'pending' или hp IS NULL — нужен поиск через API
      // Запись существует но ещё не проверялась
      return { hp: null, source: null, found: false, existsInRef: false };
    }
    return { hp: null, source: null, found: false, existsInRef: false };
  } catch (error) {
    logger(`⚠️ HP reference lookup error: ${error.message}`);
    return { hp: null, source: null, found: false, existsInRef: false };
  }
}

/**
 * Сохранить HP в cars_hp_reference_v2
 */
async function saveHpToReference(filter, hp, source, marker, description) {
  try {
    // Сначала пробуем обновить существующую запись
    const updateResult = await pool.query(`
      UPDATE cars_hp_reference_v2
      SET hp = $1, source = $2, marker = $3, description = $4, status = 'done', last_checked_at = NOW()
      WHERE cartype = $5
        AND manufacturerenglishname = $6
        AND modelgroupenglishname = $7
        AND modelname = $8
        AND COALESCE(gradeenglishname, '') = COALESCE($9, '')
        AND COALESCE(year, 0) = COALESCE($10, 0)
        AND fuelname = $11
        AND COALESCE(transmission_name, '') = COALESCE($12, '')
        AND COALESCE(displacement, 0) = COALESCE($13, 0)
      RETURNING id
    `, [
      hp, source, marker, description,
      filter.cartype,
      filter.manufacturerenglishname,
      filter.modelgroupenglishname,
      filter.modelname,
      filter.gradeenglishname || '',
      filter.year || 0,
      filter.fuelname,
      filter.transmission_name || '',
      filter.displacement || 0
    ]);
    
    if (updateResult.rowCount === 0) {
      // Записи нет — создаём новую
      await pool.query(`
        INSERT INTO cars_hp_reference_v2 (
          cartype, manufacturername, manufacturerenglishname,
          modelgroupname, modelgroupenglishname, modelname,
          gradename, gradeenglishname, year, fuelname,
          transmission_name, displacement, hp, source, marker,
          description, status, id_sample
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'done', $17)
        ON CONFLICT DO NOTHING
      `, [
        filter.cartype,
        filter.manufacturername || filter.manufacturerenglishname,
        filter.manufacturerenglishname,
        filter.modelgroupname || filter.modelgroupenglishname,
        filter.modelgroupenglishname,
        filter.modelname,
        filter.gradename || filter.gradeenglishname,
        filter.gradeenglishname,
        filter.year,
        filter.fuelname,
        filter.transmission_name,
        filter.displacement,
        hp, source, marker, description,
        filter.id || null
      ]);
    }
    return true;
  } catch (error) {
    logger(`⚠️ HP reference save error: ${error.message}`);
    return false;
  }
}

/**
 * Обновить HP в encar_db_prod
 */
async function updateHpInProd(carId, hp) {
  try {
    await pool.query(`UPDATE encar_db_prod SET hp = $1 WHERE id = $2`, [hp, carId]);
    return true;
  } catch (error) {
    logger(`⚠️ HP prod update error: ${error.message}`);
    return false;
  }
}

/**
 * Получить ID машин для поиска в pan-auto (по фильтрам)
 */
async function getCarIdsForPanAuto(filter, maxIds = 5) {
  try {
    const result = await pool.query(`
      SELECT id FROM encar_db_prod
      WHERE cartype = $1
        AND manufacturerenglishname = $2
        AND modelgroupenglishname = $3
        AND modelname = $4
        AND COALESCE(gradeenglishname, '') = COALESCE($5, '')
        AND FLOOR(yearmonth::integer / 100)::integer = $6
        AND fuelname = $7
        AND COALESCE(transmission_name, '') = COALESCE($8, '')
        AND COALESCE(displacement, 0) = COALESCE($9, 0)
      ORDER BY id ASC
      LIMIT $10
    `, [
      filter.cartype,
      filter.manufacturerenglishname,
      filter.modelgroupenglishname,
      filter.modelname,
      filter.gradeenglishname || '',
      filter.year || 0,
      filter.fuelname,
      filter.transmission_name || '',
      filter.displacement || 0,
      maxIds
    ]);
    return result.rows.map(r => r.id);
  } catch {
    return [];
  }
}

/**
 * Основная функция поиска HP для авто
 * @param {Object} car - объект авто из encar_db_prod
 * @returns {Promise<{hp: number|null, source: string|null, updated: boolean}>}
 */
export async function findAndSetHp(car) {
  const filter = {
    id: car.id,
    cartype: car.cartype,
    manufacturername: car.manufacturername,
    manufacturerenglishname: car.manufacturerenglishname,
    modelgroupname: car.modelgroupname,
    modelgroupenglishname: car.modelgroupenglishname,
    modelname: car.modelname,
    gradename: car.gradename,
    gradeenglishname: car.gradeenglishname,
    year: car.yearmonth ? Math.floor(parseInt(car.yearmonth, 10) / 100) : null,
    fuelname: car.fuelname,
    transmission_name: car.transmission_name,
    displacement: car.displacement || 0
  };
  
  const filterName = `${filter.manufacturerenglishname} ${filter.modelgroupenglishname} ${filter.modelname} (${filter.year})`;
  
  // 1. Проверяем справочник
  const ref = await lookupHpInReference(filter);
  
  // Если запись УЖЕ существует в справочнике — используем её (даже hp=0)
  // Это экономит API запросы — мы уже проверяли этот фильтр ранее
  if (ref.existsInRef) {
    await updateHpInProd(car.id, ref.hp);
    if (ref.hp > 0) {
      return { hp: ref.hp, source: `reference:${ref.source}`, updated: true };
    } else {
      // hp=0 в справочнике — значит мы уже искали и не нашли
      return { hp: 0, source: 'reference:notfound', updated: true };
    }
  }
  
  // 2. Проверка на "Others/기타" — пропускаем API поиск, сразу hp=0
  if (shouldSkipHpSearch(filter)) {
    logger(`⏭️ HP skip (Others/기타): ${filterName}`);
    await saveHpToReference(filter, 0, 'skipped', 'Others/기타', 'Generic category - HP search skipped');
    await updateHpInProd(car.id, 0);
    return { hp: 0, source: 'skipped:others', updated: true };
  }
  
  // 3. Запись НЕ существует в справочнике — ищем через pan-auto
  const carIds = await getCarIdsForPanAuto(filter, 5);
  
  for (const carId of carIds) {
    const panResult = await getHpFromPanAuto(carId);
    if (panResult.hp && panResult.hp > 0) {
      // Сохраняем в справочник
      await saveHpToReference(filter, panResult.hp, 'pan-auto', 'Точно', `Found via pan-auto carId ${carId}`);
      // Обновляем encar_db_prod
      await updateHpInProd(car.id, panResult.hp);
      logger(`🐴 HP pan-auto: ${filterName} => ${panResult.hp}`);
      return { hp: panResult.hp, source: 'pan-auto', updated: true };
    }
    await sleep(200);
  }
  
  // 4. Ищем через OpenAI
  const openaiResult = await searchHpInOpenAI(filter);
  if (openaiResult.hp && openaiResult.hp > 0) {
    // Сохраняем в справочник
    await saveHpToReference(filter, openaiResult.hp, 'openai', openaiResult.marker, openaiResult.description);
    // Обновляем encar_db_prod
    await updateHpInProd(car.id, openaiResult.hp);
    logger(`🤖 HP OpenAI: ${filterName} => ${openaiResult.hp}`);
    return { hp: openaiResult.hp, source: 'openai', updated: true };
  }
  
  // 5. Не нашли нигде — сохраняем hp=0 в справочник, чтобы не повторять поиск
  await saveHpToReference(filter, 0, 'notfound', 'Не найдено', 'HP not found via pan-auto and OpenAI');
  await updateHpInProd(car.id, 0);
  logger(`❌ HP not found: ${filterName} (saved hp=0 to reference)`);
  return { hp: 0, source: 'notfound', updated: true };
}

/**
 * Обработка батча авто с hp = null/0
 * @param {Array} cars - массив авто из encar_db_prod
 * @returns {Promise<{found: number, notFound: number}>}
 */
export async function processHpBatch(cars) {
  let found = 0, notFound = 0;
  
  for (const car of cars) {
    if (car.hp && car.hp > 0) continue; // HP уже есть
    
    const result = await findAndSetHp(car);
    if (result.updated) {
      found++;
    } else {
      notFound++;
    }
    
    await sleep(100); // Небольшая пауза
  }
  
  return { found, notFound };
}

export default { findAndSetHp, processHpBatch };

