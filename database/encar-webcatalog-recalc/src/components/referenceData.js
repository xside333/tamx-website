import fs from 'fs';
import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';
import telegramNotifier from '../utils/telegramNotifier.js';

const REFERENCE_DIR = './src/referenceData/';
const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 30000; // 30 сек

const TABLES = [
  'customs_rates',
  'util_rates',
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

async function loadTable(table, attempt = 1) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM ${table}`);

    if (!rows.length || rows.some(row => Object.values(row).includes(null))) {
      throw new Error(`Invalid data in table ${table}`);
    }

    return rows;
  } catch (error) {
    logger(`⚠️ Ошибка загрузки таблицы ${table}, попытка ${attempt}: ${error.message}`);

    if (attempt >= MAX_ATTEMPTS) {
      const errorKey = errorsMap[table.replace(/"/g, '')];
      await telegramNotifier.send(errorKey);
      throw new Error(`Не удалось загрузить таблицу ${table} после ${MAX_ATTEMPTS} попыток`);
    }

    await delay(RETRY_DELAY_MS);
    return await loadTable(table, attempt + 1);
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
    const filePath = `${REFERENCE_DIR}${cleanName}.json`;

    try {
      const data = await loadTable(table);
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
    fs.readdirSync(REFERENCE_DIR).forEach(file => fs.unlinkSync(`${REFERENCE_DIR}${file}`));
    logger('🗑️ Справочные данные успешно удалены.');
  }
}

export default {
  loadAllReferences,
  clearReferences
};
