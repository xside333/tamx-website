import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';
import telegramNotifier from '../utils/telegramNotifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REFERENCE_DIR = path.resolve(__dirname, '../referenceData');
const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 30000; // 30 сек

const TABLES = [
  'customs_rates',
  'util_rates',
  'util_december_2025',
  'exchange_rates',
  'customs_fee',
  'customs_rate_0_3',
  '"SWIFT"',
];

const errorsMap = {
  customs_rates: 'empty_customs_rates',
  util_rates: 'empty_util_rates',
  exchange_rates: 'empty_exchange_rates',
  customs_fee: 'empty_customs_fee',
  customs_rate_0_3: 'empty_customs_rate_0_3',
  SWIFT: 'empty_swift_rates',
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadTable(table, attempt = 1, optional = false) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM ${table}`);

    // Для опциональных таблиц (util_december_2025) разрешаем пустой результат
    if (!optional && (!rows.length || rows.some(row => Object.values(row).includes(null)))) {
      throw new Error(`Invalid data in table ${table}`);
    }

    // Для опциональных таблиц возвращаем пустой массив, если нет данных
    if (optional && !rows.length) {
      logger(`ℹ️ Таблица ${table} пуста (опциональная таблица)`);
      return [];
    }

    return rows;
  } catch (error) {
    // Для опциональных таблиц не бросаем ошибку, возвращаем пустой массив
    if (optional) {
      logger(`⚠️ Таблица ${table} не найдена или недоступна (опциональная): ${error.message}`);
      return [];
    }

    logger(`⚠️ Ошибка загрузки таблицы ${table}, попытка ${attempt}: ${error.message}`);

    if (attempt >= MAX_ATTEMPTS) {
      const errorKey = errorsMap[table.replace(/"/g, '')];
      if (errorKey) {
        await telegramNotifier.send(errorKey);
      }
      throw new Error(`Не удалось загрузить таблицу ${table} после ${MAX_ATTEMPTS} попыток`);
    }

    await delay(RETRY_DELAY_MS);
    return await loadTable(table, attempt + 1, optional);
  } finally {
    client.release();
  }
}

async function loadAllReferences() {
  if (!fs.existsSync(REFERENCE_DIR)) {
    fs.mkdirSync(REFERENCE_DIR);
  }

  const references = {};

  for (const table of TABLES) {
    const cleanName = table.replace(/"/g, '').toLowerCase();
    const filePath = path.join(REFERENCE_DIR, `${cleanName}.json`);

    try {
      // util_december_2025 - опциональная таблица
      const isOptional = cleanName === 'util_december_2025';
      const data = await loadTable(table, 1, isOptional);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      references[cleanName] = data;

      logger(`✅ Таблица ${table} успешно загружена и сохранена.`);
    } catch (error) {
      logger(`❌ Остановка загрузки справочников из-за ошибки: ${error.message}`);
      throw error;
    }
  }

  return references;
}

function clearReferences() {
  if (fs.existsSync(REFERENCE_DIR)) {
    fs.readdirSync(REFERENCE_DIR).forEach(file => fs.unlinkSync(path.join(REFERENCE_DIR, file)));
    logger('🗑️ Справочные данные успешно удалены.');
  }
}

export default {
  loadAllReferences,
  clearReferences
};
