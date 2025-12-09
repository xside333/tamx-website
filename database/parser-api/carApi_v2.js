// Порядковый номер 0007.000 — carApi_v2.js
// Версия с интеграцией HP lookup из cars_hp_reference_v2
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ===== Опциональный отчёт в Telegram (не критичный) ===== */
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramSummarySafe(message) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
    });
  } catch (e) {
    console.warn('⚠️ Не удалось отправить Telegram-отчёт:', e?.message || e);
  }
}

/* ===== HP Lookup ===== */

/**
 * Паттерны "Others/기타" — для таких авто нет смысла искать HP
 */
const SKIP_HP_PATTERNS = [
  '기타', 'Others', '기타 제조사', '기타 승용차', '기타 수입차', '기타제조사', 'etc', 'ETC'
];

function shouldSkipHpSearch(car) {
  const mb = car?.main?.base;
  const fields = [
    mb?.category?.manufacturerEnglishName,
    mb?.category?.manufacturerName,
    mb?.category?.modelGroupEnglishName,
    mb?.category?.modelGroupName,
    mb?.category?.modelName
  ];
  
  for (const field of fields) {
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
 * @param {Object} car - объект машины
 * @returns {Promise<{hp: number|null, isNew: boolean, skipped: boolean}>}
 */
async function lookupHpFromReference(car) {
  const mb = car?.main?.base;
  
  // Проверка на "Others/기타" — пропускаем поиск, сразу hp=0
  if (shouldSkipHpSearch(car)) {
    return { hp: 0, isNew: false, skipped: true };
  }
  
  const cartype = car?.carType || null;
  const manufacturerenglishname = mb?.category?.manufacturerEnglishName || null;
  const modelgroupenglishname = mb?.category?.modelGroupEnglishName || null;
  const modelname = mb?.category?.modelName || null;
  const gradeenglishname = mb?.category?.gradeEnglishName || null;
  const fuelname = mb?.spec?.fuelName || null;
  const yearmonth = mb?.category?.yearMonth;
  const year = yearmonth ? Math.floor(parseInt(yearmonth, 10) / 100) : null;
  const transmission_name = mb?.spec?.transmissionName || null;
  const displacement = mb?.spec?.displacement || 0;
  
  // Проверяем обязательные поля
  if (!cartype || !manufacturerenglishname || !modelgroupenglishname || !modelname || !fuelname) {
    return { hp: null, isNew: false, skipped: false };
  }
  
  try {
    // Ищем в справочнике
    const result = await pool.query(`
      SELECT hp, status
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
      cartype,
      manufacturerenglishname,
      modelgroupenglishname,
      modelname,
      gradeenglishname || '',
      year || 0,
      fuelname,
      transmission_name || '',
      displacement || 0
    ]);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      // Если запись существует — берём HP (даже 0)
      const hp = row.hp != null ? row.hp : null;
      return { hp, isNew: false, skipped: false };
    }
    
    // Не нашли в справочнике — возвращаем null
    // encar-recalc-v3 найдёт HP через pan-auto/OpenAI и создаст запись
    return { hp: null, isNew: true, skipped: false };
    
  } catch (error) {
    console.warn('⚠️ HP lookup error:', error?.message);
    return { hp: null, isNew: false, skipped: false };
  }
}

/* ===== Утилиты фото ===== */

/** Предпочтительный id для генерации путей фото: vehicleId → diagnosisVehicle.vehicleId → id */
function resolvePreferredId(car) {
  return (
    car?.main?.base?.vehicleId ??
    car?.vehicleId ??
    car?.diagnosisVehicle?.vehicleId ??
    car?.id
  );
}

/** Есть ли фото в пришедшем авто */
function hasAnyPhotos(car) {
  return Array.isArray(car?.main?.base?.photos) && car.main.base.photos.length > 0;
}

/** Найти path по коду среди пришедших фото */
function getPathByCode(photos, code) {
  if (!Array.isArray(photos)) return null;
  const hit = photos.find(p => String(p?.code) === code && typeof p?.path === 'string');
  return hit?.path || null;
}

/** Взятые из пришедших фото outer/inner с запасным планом */
function deriveOuterInnerFromProvided(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return { outer: null, inner: null };

  // 1) Пытаемся по стандартным кодам
  let outer = getPathByCode(photos, '001');
  let inner = getPathByCode(photos, '007');

  // 2) Если каких-то нет — берём первые разумные альтернативы
  if (!outer) {
    // любые OUTER
    const anyOuter = photos.find(p => (p?.type || '').toUpperCase() === 'OUTER' && p?.path);
    outer = anyOuter?.path || photos[0]?.path || null;
  }
  if (!inner) {
    // любые INNER
    const anyInner = photos.find(p => (p?.type || '').toUpperCase() === 'INNER' && p?.path);
    inner = anyInner?.path || photos[0]?.path || null;
  }
  return { outer, inner };
}

/** Генерация путей фото по id (vehicleId/id)
 *  Правило:
 *   - carpictureXX — XX = четвёртая цифра id (с ведущим нулём, '09', не '009')
 *   - picNNNN — первые 4 цифры id
 *   - файл: /carpictureXX/picNNNN/{id}_{CCC}.jpg
 *   - коды: 001..024
 *   - photo_outer → _001.jpg
 *   - photo_inner → _007.jpg
 */
function genPhotoArtifactsFromId(idInput) {
  const idStr = String(idInput || '').trim();
  if (idStr.length < 4) {
    return { outer: null, inner: null, photoObjs: [] };
  }
  const first4 = idStr.slice(0, 4);
  const fourthDigit = idStr[3] || '0';
  const xx = String(fourthDigit).padStart(2, '0'); // '9' → '09'
  const base = `/carpicture${xx}/pic${first4}/${idStr}_`;

  const codes = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(3, '0'));
  const photoObjs = codes.map(code => ({ code, path: `${base}${code}.jpg` }));

  return {
    outer: `${base}001.jpg`,
    inner: `${base}007.jpg`,
    photoObjs
  };
}

/* ===== Доп. патч по авариям ===== */
function patchAccidentCount(car) {
  const accs = car?.openVehicleNo?.accidents;
  const has12WithMoney =
    Array.isArray(accs) &&
    accs.some(a => {
      const t = a?.type;
      const sum =
        (a?.partCost || 0) +
        (a?.laborCost || 0) +
        (a?.paintingCost || 0) +
        (a?.insuranceBenefit || 0);
      return (t === '1' || t === '2') && sum > 0;
    });

  const orig = Number(car?.openVehicleNo?.myAccidentCnt) || 0;
  return orig === 0 && has12WithMoney ? 1 : orig;
}

/* ===== express ===== */
const app = express();
app.use(express.json({ limit: '256mb' }));
app.use(cors());

// Глобальные счётчики (для /api/stats)
let globalCounters = { insert: 0, update: 0, delete: 0 };

/* ============ основной приёмник ============

POST /api/cars
body: { action: 'insert'|'update'|'delete'|'select', cars: [...] }

— insert/update:
   • Если есть хотя бы одно фото → берём photo_paths из JSON, outer/inner определяем из JSON.
   • Если фото нет → генерим весь набор 001..024 по vehicleId (fallback → id), outer=_001, inner=_007.
   • photo_paths пишем как jsonb[].
   • HP: ищем в cars_hp_reference_v2, если нашли - записываем, если нет - создаём pending запись

— delete: { id } для удаления
— select: вернуть список id
============================================ */
app.post('/api/cars', async (req, res) => {
  const { cars = [], action } = req.body || {};
  let processed = 0;

  console.log(`🔥 Получен запрос: action=${action}, количество машин=${cars.length}`);

  try {
    if (action === 'insert' || action === 'update') {
      // Per-request HP counters (не накапливаются)
      let hpFound = 0, hpNotInRef = 0, hpSkipped = 0;
      
      for (const car of cars) {
        // источник данных
        const mb = car?.main?.base;

        // 1) Фото: либо из входящего JSON, либо генерим по vehicleId/id
        let photoArrayJson; // строка JSON массива объектов {code, path}
        let photoOuter;     // строка path или null
        let photoInner;     // строка path или null

        if (hasAnyPhotos(car)) {
          // берём как есть
          photoArrayJson = JSON.stringify(mb.photos);
          const { outer, inner } = deriveOuterInnerFromProvided(mb.photos);
          photoOuter = outer;
          photoInner = inner;
        } else {
          // фото нет → генерим по vehicleId → id
          const prefId = resolvePreferredId(car);
          const { outer, inner, photoObjs } = genPhotoArtifactsFromId(prefId);
          photoArrayJson = JSON.stringify(photoObjs);
          photoOuter = outer;
          photoInner = inner;
        }

        // 2) Патч аварий
        const patchedMyAccCnt = patchAccidentCount(car);

        // 3) Инспекция (outers) — сохраняем даже пустой массив как обработанный
        const inspectionOutersJson = JSON.stringify(
          Array.isArray(car?.inspectionVehicle?.outers)
            ? car.inspectionVehicle.outers
            : []
        );

        // 4) HP lookup
        const { hp, isNew, skipped } = await lookupHpFromReference(car);
        if (hp != null && hp > 0) hpFound++;
        if (isNew) hpNotInRef++;  // Не найден в справочнике → encar-recalc найдёт
        if (skipped) hpSkipped++; // Others/기타 → hp=0

        // 5) Выполняем UPSERT
        await pool.query(
          `
          INSERT INTO encar_db_prod (
            id,
            url,
            carType,
            firstAdvertisedDateTime,
            viewCount,
            manufacturerName,
            manufacturerEnglishName,
            modelGroupName,
            modelGroupEnglishName,
            modelName,
            gradeName,
            gradeEnglishName,
            yearMonth,
            mileage,
            colorName,
            fuelName,
            price,
            vehicleNo,
            photo_outer,
            photo_inner,
            myAccidentCnt,
            myAccidentCost,
            address,
            photo_paths,
            seat_count,
            transmission_name,
            inspection_outers,
            json,
            displacement,
            trust,
            hp
          )
          VALUES (
            $1::bigint,
            $2,
            $3,
            $4::timestamp,
            $5::int,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14::int,
            $15,
            $16,
            $17::int,
            $18,
            $19,
            $20,
            $21::int,
            $22::int,
            split_part($23, ' ', 1),
            (
              SELECT ARRAY(
                SELECT elem::jsonb
                FROM jsonb_array_elements($24::jsonb) AS t(elem)
              )
            )::jsonb[],
            $25::int,
            $26,
            $27::jsonb,
            $28::jsonb,
            COALESCE($29::int, 0),
            COALESCE($30, '1'),
            $31::int
          )
          ON CONFLICT (id) DO UPDATE SET
            url                     = EXCLUDED.url,
            carType                 = EXCLUDED.carType,
            firstAdvertisedDateTime = EXCLUDED.firstAdvertisedDateTime,
            viewCount               = EXCLUDED.viewCount,
            manufacturerName        = EXCLUDED.manufacturerName,
            manufacturerEnglishName = EXCLUDED.manufacturerEnglishName,
            modelGroupName          = EXCLUDED.modelGroupName,
            modelGroupEnglishName   = EXCLUDED.modelGroupEnglishName,
            modelName               = EXCLUDED.modelName,
            gradeName               = EXCLUDED.gradeName,
            gradeEnglishName        = EXCLUDED.gradeEnglishName,
            yearMonth               = EXCLUDED.yearMonth,
            mileage                 = EXCLUDED.mileage,
            colorName               = EXCLUDED.colorName,
            fuelName                = EXCLUDED.fuelName,
            price                   = EXCLUDED.price,
            vehicleNo               = EXCLUDED.vehicleNo,
            photo_outer             = EXCLUDED.photo_outer,
            photo_inner             = EXCLUDED.photo_inner,
            myAccidentCnt           = EXCLUDED.myAccidentCnt,
            myAccidentCost          = EXCLUDED.myAccidentCost,
            address                 = EXCLUDED.address,
            photo_paths             = EXCLUDED.photo_paths,
            seat_count              = EXCLUDED.seat_count,
            transmission_name       = EXCLUDED.transmission_name,
            inspection_outers       = EXCLUDED.inspection_outers,
            json                    = EXCLUDED.json,
            displacement            = EXCLUDED.displacement,
            trust                   = EXCLUDED.trust,
            hp                      = COALESCE(EXCLUDED.hp, encar_db_prod.hp)
          `,
          [
            // $1..$18 — основные поля
            car?.id,
            car?.url,
            car?.carType,
            mb?.manage?.firstAdvertisedDateTime,
            mb?.manage?.viewCount,
            mb?.category?.manufacturerName,
            mb?.category?.manufacturerEnglishName,
            mb?.category?.modelGroupName,
            mb?.category?.modelGroupEnglishName,
            mb?.category?.modelName,
            mb?.category?.gradeName,
            mb?.category?.gradeEnglishName,
            mb?.category?.yearMonth,
            mb?.spec?.mileage,
            mb?.spec?.colorName,
            mb?.spec?.fuelName,
            mb?.advertisement?.price,
            mb?.vehicleNo,

            // $19..$24 — фото: уже рассчитанные строки и массив JSON
            photoOuter,
            photoInner,
            patchedMyAccCnt,
            car?.openVehicleNo?.myAccidentCost || 0,
            mb?.contact?.address || '',
            photoArrayJson,

            // $25..$31 — прочее + hp
            mb?.spec?.seatCount || 0,
            mb?.spec?.transmissionName || null,
            inspectionOutersJson,
            car || {},
            mb?.spec?.displacement || 0,
            mb?.advertisement?.trust?.[0] || '1',
            hp || 0
          ]
        );

        processed++;
      }

      globalCounters[action] += processed;
      console.log(`✅ ${action}: ${processed} авто (HP: ${hpFound} found, ${hpNotInRef} not in ref, ${hpSkipped} skipped)`);
      return res.json({ [action]: processed, hpFound, hpNotInRef, hpSkipped });

    } else if (action === 'delete') {
      // Удаляем ТОЛЬКО из encar_db_prod, cars_hp_reference_v2 НЕ трогаем!
      for (const car of cars) {
        await pool.query(`DELETE FROM encar_db_prod WHERE id = $1::bigint`, [car?.id]);
        processed++;
      }
      globalCounters.delete += processed;
      console.log(`🗑️ delete: ${processed} авто (только из encar_db_prod)`);
      return res.json({ delete: processed });

    } else if (action === 'select') {
      const { rows } = await pool.query(`SELECT id FROM encar_db_prod`);
      return res.json({ ids: rows.map(r => r.id) });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error(`🚨 Ошибка: ${err?.message}`, err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

/* Универсальный апдейтер таблиц (как было) */
app.post('/api/updateTable', async (req, res) => {
  const { table, data } = req.body || {};
  if (!table || !Array.isArray(data)) {
    return res.status(400).json({ error: 'Некорректный запрос: нужны table и data[]' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM ${table}`);

    if (data.length) {
      const columns = Object.keys(data[0]);
      const values = [];
      const chunks = data
        .map((row, rIdx) => {
          const cols = columns
            .map((_, cIdx) => {
              values.push(row[columns[cIdx]]);
              return `$${rIdx * columns.length + cIdx + 1}`;
            })
            .join(', ');
          return `(${cols})`;
        })
        .join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${chunks}`;
      await client.query(sql, values);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `✅ Таблица ${table} обновлена. Записей: ${data.length}` });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`❌ Ошибка обновления таблицы ${table}:`, e?.message || e);
    res.status(500).json({ error: e?.message || 'DB error' });
  } finally {
    client.release();
  }
});

/* Статистика счётчиков (глобальные за сессию) */
app.get('/api/stats', (req, res) => {
  res.json(globalCounters);
});

/* Health check */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'v2', hp_enabled: true });
});

app.listen(4000, () => {
  console.log('🚀 Parser API v2 (with HP) работает на порту 4000');
});

