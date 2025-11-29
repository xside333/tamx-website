import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("Нет TELEGRAM_TOKEN или TELEGRAM_CHAT_ID в .env!");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '256mb' }));
app.use(cors());

// === Счётчики для отчёта ===
let counters = {
  insert: 0,
  update: 0,
  delete: 0
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DELIVERY_DIR = path.resolve(__dirname, 'deliveryCost');
const DELIVERY_TMP = path.join(DELIVERY_DIR, 'deliveryCost.tmp.json');
const DELIVERY_FILE = path.join(DELIVERY_DIR, 'deliveryCost.json');

// // === Telegram отчёт раз в 3 часа ===
// async function sendTelegramSummary() {
//   const message = `
// <b>Сводка за 3 часа</b>:
// ➕ Добавлено (tarasov): <b>${counters.insert}</b>
// ✏️ Обновлено (tarasov): <b>${counters.update}</b>
// 🗑️ Удалено (tarasov): <b>${counters.delete}</b>
//   `.trim();
//   try {
//     await fetch(
//       `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           chat_id: TELEGRAM_CHAT_ID,
//           text: message,
//           parse_mode: "HTML"
//         })
//       }
//     );
//     console.log(`Telegram отчёт отправлен!`);
//     // Сброс после отправки
//     counters.insert = 0;
//     counters.update = 0;
//     counters.delete = 0;
//   } catch (e) {
//     console.error("Ошибка отправки Telegram:", e);
//   }
// }

// // Первый отчёт сразу при старте (для контроля)
// sendTelegramSummary();
// // Дальше — раз в 3 часа
// setInterval(sendTelegramSummary, 3 * 60 * 60 * 1000);

app.post('/api/cars', async (req, res) => {
  const { cars = [], action } = req.body;
  let processed = 0;

  console.log(`Получен запрос: action=${action}, количество машин=${cars.length}`);

  try {
    if (action === 'insert' || action === 'update') {
      for (const car of cars) {
        await pool.query(`
          INSERT INTO encar_db_prod (
            id, url, carType, firstAdvertisedDateTime, viewCount, manufacturerName, manufacturerEnglishName, modelGroupName,
            modelGroupEnglishName, modelName, gradeName, gradeEnglishName, yearMonth, mileage, colorName, fuelName, price, vehicleNo,
            photo_outer, photo_inner, myAccidentCnt, myAccidentCost, address,
            photo_paths, seat_count, transmission_name,
            json, displacement, trust,
            created_at, updated_at
          ) VALUES (
            $1::bigint, $2, $3, $4::timestamp, $5::int, $6, $7, $8, $9, $10, $11, $12, $13, $14::int, $15, $16, $17::int, $18,

            (SELECT path FROM (
              SELECT elem->>'code' AS code, elem->>'path' AS path
              FROM jsonb_array_elements($19::jsonb) AS items(elem)
            ) sub WHERE sub.code = '001' LIMIT 1),

            (SELECT path FROM (
              SELECT elem->>'code' AS code, elem->>'path' AS path
              FROM jsonb_array_elements($19::jsonb) AS items(elem)
            ) sub WHERE sub.code = '007' LIMIT 1),

            $20::int, $21::int, split_part($22, ' ', 1),

            (SELECT ARRAY(
              SELECT jsonb_build_object('code', elem->>'code', 'path', elem->>'path')
              FROM jsonb_array_elements($19::jsonb) AS items(elem)
            )),

            $23::int, $24, $25::jsonb, COALESCE($26::int, 0), COALESCE($27, '1'),
            NOW(), NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            url = EXCLUDED.url,
            carType = EXCLUDED.carType,
            firstAdvertisedDateTime = EXCLUDED.firstAdvertisedDateTime,
            viewCount = EXCLUDED.viewCount,
            manufacturerName = EXCLUDED.manufacturerName,
            manufacturerEnglishName = EXCLUDED.manufacturerEnglishName,
            modelGroupName = EXCLUDED.modelGroupName,
            modelGroupEnglishName = EXCLUDED.modelGroupEnglishName,
            modelName = EXCLUDED.modelName,
            gradeName = EXCLUDED.gradeName,
            gradeEnglishName = EXCLUDED.gradeEnglishName,
            yearMonth = EXCLUDED.yearMonth,
            mileage = EXCLUDED.mileage,
            colorName = EXCLUDED.colorName,
            fuelName = EXCLUDED.fuelName,
            price = EXCLUDED.price,
            vehicleNo = EXCLUDED.vehicleNo,
            photo_outer = EXCLUDED.photo_outer,
            photo_inner = EXCLUDED.photo_inner,
            myAccidentCnt = EXCLUDED.myAccidentCnt,
            myAccidentCost = EXCLUDED.myAccidentCost,
            address = EXCLUDED.address,
            photo_paths = EXCLUDED.photo_paths,
            seat_count = EXCLUDED.seat_count,
            transmission_name = EXCLUDED.transmission_name,
            json = EXCLUDED.json,
            displacement = EXCLUDED.displacement,
            trust = EXCLUDED.trust,
            updated_at = NOW();
        `, [
          car.id, car.url, car.carType,
          car.main.base.manage.firstAdvertisedDateTime, car.main.base.manage.viewCount,
          car.main.base.category.manufacturerName, car.main.base.category.manufacturerEnglishName,
          car.main.base.category.modelGroupName, car.main.base.category.modelGroupEnglishName,
          car.main.base.category.modelName, car.main.base.category.gradeName, car.main.base.category.gradeEnglishName,
          car.main.base.category.yearMonth, car.main.base.spec.mileage, car.main.base.spec.colorName,
          car.main.base.spec.fuelName, car.main.base.advertisement.price, car.main.base.vehicleNo,
          JSON.stringify(car.main.base.photos),
          car.openVehicleNo.myAccidentCnt, car.openVehicleNo.myAccidentCost, car.main.base.contact.address,
          car.main.base.spec.seatCount, car.main.base.spec.transmissionName, car,
          car.main.base.spec.displacement, car.main.base.advertisement.trust?.[0]
        ]);
        processed++;
      }
      counters[action] += processed;
      console.log(`Успешно ${action}: ${processed} машин`);

    } else if (action === 'delete') {
      for (const car of cars) {
        await pool.query(`DELETE FROM encar_db_prod WHERE id = $1::bigint`, [car.id]);
        processed++;
      }
      counters.delete += processed;
      console.log(`Удалено машин: ${processed}`);

    } else if (action === 'select') {
      const { rows } = await pool.query(`SELECT id FROM encar_db_prod`);
      console.log(`Запрошен список id, найдено: ${rows.length}`);
      return res.json({ ids: rows.map(row => row.id) });

    } else {
      console.warn(`Неизвестное действие: ${action}`);
      return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ [action]: processed });

  } catch (err) {
    console.error(`Ошибка: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/updateTable', async (req, res) => {
  const { table, data } = req.body;

  if (!table || !Array.isArray(data)) {
    console.warn(`Некорректный запрос: table=${table}, data=${JSON.stringify(data)}`);
    return res.status(400).json({ error: 'Некорректный запрос: должны быть указаны table (строка) и data (массив).' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Очистим таблицу перед вставкой
    await client.query(`DELETE FROM ${table}`);

    if (data.length > 0) {
      // Вставляем новые данные (универсально)
      const columns = Object.keys(data[0]).join(', ');
      const values = [];
      const placeholders = data.map((row, rowIndex) => {
        const placeholderRow = Object.values(row).map((_, colIndex) => {
          values.push(Object.values(row)[colIndex]);
          return `$${rowIndex * Object.keys(row).length + colIndex + 1}`;
        });
        return `(${placeholderRow.join(', ')})`;
      }).join(', ');

      const insertQuery = `INSERT INTO ${table} (${columns}) VALUES ${placeholders}`;
      await client.query(insertQuery, values);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `✅ Таблица ${table} успешно обновлена. Записей: ${data.length}` });
    console.log(`✅ Таблица ${table} успешно обновлена. Записей: ${data.length}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Ошибка обновления таблицы ${table}:`, error.message);
    res.status(500).json({ error: error.message });

  } finally {
    client.release();
  }
});

// Приём JSON тарифов доставки и сохранение в ./deliveryCost/deliveryCost.json
app.post('/api/deliveryCost', async (req, res) => {
  try {
    const payload = req.body;

    // Валидация: ожидаем объект вида { "Город": число, ... }
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Ожидается JSON-объект {"Город": сумма, ...}' });
    }

    // Нормализация и проверка значений
    const out = {};
    let count = 0;
    for (const [cityRaw, amountRaw] of Object.entries(payload)) {
      const city = String(cityRaw || '').trim();
      const amount = Number(amountRaw);
      if (!city) continue;
      if (!Number.isFinite(amount) || amount < 0) continue;
      out[city] = Math.round(amount);
      count++;
    }
    if (count === 0) {
      return res.status(400).json({ error: 'Пустой или невалидный набор городов/сумм' });
    }

    // Обеспечиваем наличие каталога
    await fs.mkdir(DELIVERY_DIR, { recursive: true });

    // Атомарная запись: сначала во временный файл, затем rename
    await fs.writeFile(DELIVERY_TMP, JSON.stringify(out, null, 2), 'utf8');
    // Удаляем старый, если есть (игнорируем ошибку)
    await fs.unlink(DELIVERY_FILE).catch(() => {});
    await fs.rename(DELIVERY_TMP, DELIVERY_FILE);

    console.log(`💾 deliveryCost.json обновлён, записей: ${count}`);
    return res.json({ ok: true, entries: count, file: 'deliveryCost/deliveryCost.json' });
  } catch (e) {
    console.error('deliveryCost save error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// Отдаем текущий deliveryCost.json (если нужен фронту)
app.get('/api/deliveryCost', async (req, res) => {
  try {
    const buf = await fs.readFile(DELIVERY_FILE);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.send(buf);
  } catch {
    return res.status(404).json({ error: 'deliveryCost.json not found' });
  }
});

app.listen(4000, () => {
  console.log('API работает на порту 4000');
});
