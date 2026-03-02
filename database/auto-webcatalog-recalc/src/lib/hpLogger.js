// lib/hpLogger.js - логирование HP поиска (pan-auto/OpenAI)
// Единственный файл: hp_search.log
// Время: Seoul (UTC+9)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'hp_search.log');

// Создаём папку логов если нет
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Получить текущее время в сеульском формате (UTC+9)
 */
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

/**
 * Записать лог поиска HP (только для новых фильтров)
 * @param {string} source - 'pan-auto' | 'openai' | 'notfound' | 'skipped'
 * @param {Object} filter - фильтр авто
 * @param {number} hp - найденная мощность
 * @param {string} [extra] - дополнительная информация
 */
export function logHpSearch(source, filter, hp, extra = '') {
  const time = getSeoulTime();
  const filterName = `${filter.manufacturerenglishname || ''} ${filter.modelgroupenglishname || ''} ${filter.modelname || ''} ${filter.gradeenglishname || ''} (${filter.year || ''})`.trim();
  const displacement = filter.displacement || 0;
  const fuel = filter.fuelname || '';
  
  let icon = '❓';
  if (source === 'pan-auto') icon = '🐴';
  else if (source === 'openai') icon = '🤖';
  else if (source === 'notfound') icon = '❌';
  else if (source === 'skipped') icon = '⏭️';
  
  const line = `[${time}] ${icon} ${source.toUpperCase()} | ${filterName} | ${displacement}cc ${fuel} | HP: ${hp}${extra ? ' | ' + extra : ''}`;
  
  // Пишем в файл
  fs.appendFileSync(LOG_FILE, line + '\n');
  
  // Также выводим в консоль
  console.log(line);
}

/**
 * Простой консольный логгер (не пишет в файл)
 */
export const logger = {
  info(message) {
    console.log(`[${getSeoulTime()}] [INFO] ${message}`);
  },
  warn(message) {
    console.warn(`[${getSeoulTime()}] [WARN] ${message}`);
  },
  error(message) {
    console.error(`[${getSeoulTime()}] [ERROR] ${message}`);
  },
  debug(message) {
    // Debug сообщения только в консоль (не в файл)
    if (process.env.DEBUG_HP) {
      console.log(`[${getSeoulTime()}] [DEBUG] ${message}`);
    }
  }
};
