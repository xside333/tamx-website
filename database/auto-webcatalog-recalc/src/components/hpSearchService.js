/**
 * HP Search Service для encar авто
 * Адаптировано из encar-webcatalog-recalc/src/components/hpSearchService.js
 * Поиск: reference → fuzzy → pan-auto → OpenAI
 */
import { pool } from '../utils/dbClient.js';
import { logHpSearch } from '../lib/hpLogger.js';
import { getHpFromPanAuto } from '../lib/panAutoApi.js';
import { searchHpInOpenAI } from '../lib/openaiApi.js';

const log = (msg) => console.log(`[HP] ${msg}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SKIP_HP_PATTERNS = [
  '기타', 'Others', '기타 제조사', '기타 승용차', '기타 수입차',
  '기타제조사', 'etc', 'ETC',
];

function shouldSkipHpSearch(filter) {
  const fieldsToCheck = [
    filter.manufacturerenglishname, filter.manufacturername,
    filter.modelgroupenglishname, filter.modelgroupname, filter.modelname,
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
      filter.cartype, filter.manufacturerenglishname, filter.modelgroupenglishname,
      filter.modelname, filter.gradeenglishname || '', filter.year || 0,
      filter.fuelname, filter.transmission_name || '', filter.displacement || 0,
    ]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      if (row.status === 'done') {
        const hp = row.hp ?? 0;
        return { hp, source: row.source, found: hp > 0, existsInRef: true };
      }
      return { hp: null, source: null, found: false, existsInRef: false };
    }
    return { hp: null, source: null, found: false, existsInRef: false };
  } catch (error) {
    log(`⚠️ HP reference lookup error: ${error.message}`);
    return { hp: null, source: null, found: false, existsInRef: false };
  }
}

async function lookupHpInReferenceFuzzy(filter) {
  try {
    const displacement = filter.displacement || 0;
    const result = await pool.query(`
      SELECT hp, source, displacement
      FROM cars_hp_reference_v2
      WHERE cartype = $1
        AND manufacturerenglishname = $2
        AND modelgroupenglishname = $3
        AND modelname = $4
        AND COALESCE(gradeenglishname, '') = COALESCE($5, '')
        AND COALESCE(year, 0) = COALESCE($6, 0)
        AND fuelname = $7
        AND COALESCE(transmission_name, '') = COALESCE($8, '')
        AND ABS(COALESCE(displacement, 0) - $9) <= 10
        AND COALESCE(displacement, 0) <> $9
        AND hp > 0 AND status = 'done'
      ORDER BY ABS(COALESCE(displacement, 0) - $9) ASC
      LIMIT 1
    `, [
      filter.cartype, filter.manufacturerenglishname, filter.modelgroupenglishname,
      filter.modelname, filter.gradeenglishname || '', filter.year || 0,
      filter.fuelname, filter.transmission_name || '', displacement,
    ]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return { hp: row.hp, source: row.source, found: true, fuzzyDisplacement: row.displacement };
    }
    return { hp: null, source: null, found: false };
  } catch (error) {
    log(`⚠️ HP fuzzy lookup error: ${error.message}`);
    return { hp: null, source: null, found: false };
  }
}

async function saveHpToReference(filter, hp, source, marker, description) {
  try {
    const updateResult = await pool.query(`
      UPDATE cars_hp_reference_v2
      SET hp = $1, source = $2, marker = $3, description = $4, status = 'done', last_checked_at = NOW()
      WHERE cartype = $5 AND manufacturerenglishname = $6 AND modelgroupenglishname = $7
        AND modelname = $8 AND COALESCE(gradeenglishname, '') = COALESCE($9, '')
        AND COALESCE(year, 0) = COALESCE($10, 0) AND fuelname = $11
        AND COALESCE(transmission_name, '') = COALESCE($12, '')
        AND COALESCE(displacement, 0) = COALESCE($13, 0)
      RETURNING id
    `, [
      hp, source, marker, description, filter.cartype,
      filter.manufacturerenglishname, filter.modelgroupenglishname,
      filter.modelname, filter.gradeenglishname || '', filter.year || 0,
      filter.fuelname, filter.transmission_name || '', filter.displacement || 0,
    ]);

    if (updateResult.rowCount === 0) {
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
        filter.cartype, filter.manufacturername || filter.manufacturerenglishname,
        filter.manufacturerenglishname, filter.modelgroupname || filter.modelgroupenglishname,
        filter.modelgroupenglishname, filter.modelname,
        filter.gradename || filter.gradeenglishname, filter.gradeenglishname,
        filter.year, filter.fuelname, filter.transmission_name,
        filter.displacement, hp, source, marker, description, filter.id || null,
      ]);
    }
    return true;
  } catch (error) {
    log(`⚠️ HP reference save error: ${error.message}`);
    return false;
  }
}

async function updateHpInProdByFilter(filter, hp) {
  try {
    const result = await pool.query(`
      UPDATE encar_db_prod SET hp = $1
      WHERE cartype = $2 AND manufacturerenglishname = $3
        AND modelgroupenglishname = $4 AND modelname = $5
        AND COALESCE(gradeenglishname, '') = COALESCE($6, '')
        AND FLOOR(yearmonth::integer / 100)::integer = $7
        AND fuelname = $8 AND COALESCE(transmission_name, '') = COALESCE($9, '')
        AND COALESCE(displacement, 0) = COALESCE($10, 0)
        AND (hp IS NULL OR hp = 0)
    `, [
      hp, filter.cartype, filter.manufacturerenglishname,
      filter.modelgroupenglishname, filter.modelname,
      filter.gradeenglishname || '', filter.year || 0,
      filter.fuelname, filter.transmission_name || '', filter.displacement || 0,
    ]);
    if (result.rowCount > 1) {
      log(`   💫 Обновлено ${result.rowCount} авто с таким же фильтром`);
    }
    return result.rowCount;
  } catch (error) {
    log(`⚠️ HP prod batch update error: ${error.message}`);
    return 0;
  }
}

async function getCarIdsForPanAuto(filter, maxIds = 5) {
  try {
    const result = await pool.query(`
      SELECT id FROM encar_db_prod
      WHERE cartype = $1 AND manufacturerenglishname = $2
        AND modelgroupenglishname = $3 AND modelname = $4
        AND COALESCE(gradeenglishname, '') = COALESCE($5, '')
        AND FLOOR(yearmonth::integer / 100)::integer = $6
        AND fuelname = $7 AND COALESCE(transmission_name, '') = COALESCE($8, '')
        AND COALESCE(displacement, 0) = COALESCE($9, 0)
      ORDER BY id ASC LIMIT $10
    `, [
      filter.cartype, filter.manufacturerenglishname, filter.modelgroupenglishname,
      filter.modelname, filter.gradeenglishname || '', filter.year || 0,
      filter.fuelname, filter.transmission_name || '', filter.displacement || 0, maxIds,
    ]);
    return result.rows.map(r => r.id);
  } catch { return []; }
}

export async function findAndSetHp(car) {
  const filter = {
    id: car.id, cartype: car.cartype,
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
    displacement: car.displacement || 0,
  };

  // 1. Справочник
  const ref = await lookupHpInReference(filter);
  if (ref.existsInRef) {
    if (ref.hp > 0) {
      const updatedCount = await updateHpInProdByFilter(filter, ref.hp);
      return { hp: ref.hp, source: `reference:${ref.source}`, updated: true, batchCount: updatedCount };
    }
    return { hp: 0, source: 'reference:notfound', updated: false, skipped: true };
  }

  // 2. Fuzzy
  const fuzzyRef = await lookupHpInReferenceFuzzy(filter);
  if (fuzzyRef.found && fuzzyRef.hp > 0) {
    await saveHpToReference(filter, fuzzyRef.hp, `fuzzy:${fuzzyRef.source}`, 'Точно (fuzzy)',
      `Copied from displacement ${fuzzyRef.fuzzyDisplacement}`);
    const updatedCount = await updateHpInProdByFilter(filter, fuzzyRef.hp);
    return { hp: fuzzyRef.hp, source: `fuzzy:${fuzzyRef.source}`, updated: true, batchCount: updatedCount };
  }

  // 3. Skip Others
  if (shouldSkipHpSearch(filter)) {
    logHpSearch('skipped', filter, 0, 'Others/기타');
    await saveHpToReference(filter, 0, 'skipped', 'Others/기타', 'Generic category');
    await updateHpInProdByFilter(filter, 0);
    return { hp: 0, source: 'skipped:others', updated: true };
  }

  // 4. Pan-auto
  const carIds = await getCarIdsForPanAuto(filter, 5);
  for (const carId of carIds) {
    const panResult = await getHpFromPanAuto(carId);
    if (panResult.hp && panResult.hp > 0) {
      await saveHpToReference(filter, panResult.hp, 'pan-auto', 'Точно', `carId ${carId}`);
      const updatedCount = await updateHpInProdByFilter(filter, panResult.hp);
      logHpSearch('pan-auto', filter, panResult.hp, `carId: ${carId}`);
      return { hp: panResult.hp, source: 'pan-auto', updated: true, batchCount: updatedCount };
    }
    await sleep(200);
  }

  // 5. OpenAI
  const openaiResult = await searchHpInOpenAI(filter);
  if (openaiResult.hp && openaiResult.hp > 0) {
    await saveHpToReference(filter, openaiResult.hp, 'openai', openaiResult.marker, openaiResult.description);
    const updatedCount = await updateHpInProdByFilter(filter, openaiResult.hp);
    logHpSearch('openai', filter, openaiResult.hp, openaiResult.marker);
    return { hp: openaiResult.hp, source: 'openai', updated: true, batchCount: updatedCount };
  }

  // 6. Не найдено
  await saveHpToReference(filter, 0, 'notfound', 'Не найдено', 'Not found');
  await updateHpInProdByFilter(filter, 0);
  logHpSearch('notfound', filter, 0);
  return { hp: 0, source: 'notfound', updated: true };
}

export default { findAndSetHp };
