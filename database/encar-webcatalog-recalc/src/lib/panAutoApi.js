// lib/panAutoApi.js - запросы к pan-auto API через прокси
import fs from 'fs';
import { ProxyAgent } from 'undici';
import { config } from './hpConfig.js';
import { logger } from './hpLogger.js';

const PAN_AUTO_API_URL = 'https://zefir.pan-auto.ru/api/cars';

// Загрузка прокси
let proxies = [];
let currentProxyIndex = 0;

function loadProxies() {
  const proxyFilePath = config.paths.proxyFile;
  
  if (!fs.existsSync(proxyFilePath)) {
    logger.warn('proxy.txt not found, requests will be direct', { path: proxyFilePath });
    return;
  }
  
  const lines = fs
    .readFileSync(proxyFilePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  
  proxies = lines.map(line => {
    const [host, port, user, pass] = line.split(':');
    const url = `http://${user}:${pass}@${host}:${port}`;
    return {
      raw: line,
      url,
      host,
      agent: new ProxyAgent(url),
    };
  });
  
  logger.info(`Loaded ${proxies.length} proxies`);
}

// Инициализация прокси при загрузке модуля
loadProxies();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Fetch через пул прокси с ротацией (2 попытки на прокси, затем следующий)
async function fetchWithProxies(url, options = {}) {
  if (proxies.length === 0) {
    throw new Error('No proxies available - direct requests disabled');
  }
  
  const maxProxiesToTry = Math.min(proxies.length, 50); // Максимум 50 прокси
  const attemptsPerProxy = 2;
  let proxyTried = 0;
  
  while (proxyTried < maxProxiesToTry) {
    const proxy = proxies[currentProxyIndex];
    
    for (let attempt = 0; attempt < attemptsPerProxy; attempt++) {
      try {
        const res = await fetch(url, {
          ...options,
          dispatcher: proxy.agent,
        });
        
        // 4xx — не проблема прокси, возвращаем как есть
        if (res.status >= 400 && res.status < 500) {
          return res;
        }
        
        if (res.ok) {
          return res;
        }
        
        logger.warn(`HTTP ${res.status} via proxy ${proxy.host}, attempt ${attempt + 1}/${attemptsPerProxy}`);
      } catch (err) {
        logger.warn(`Proxy error ${proxy.host}, attempt ${attempt + 1}/${attemptsPerProxy}: ${err.message}`);
      }
    }
    
    // Переключаемся на следующий прокси
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
    proxyTried++;
  }
  
  throw new Error(`Failed to fetch ${url} after ${maxProxiesToTry} proxies`);
}

/**
 * Получить HP для конкретного ID машины из pan-auto
 * @param {number} carId - ID машины из encar_db_prod
 * @returns {Promise<{hp: number|null, carId: number}>}
 */
export async function getHpFromPanAuto(carId) {
  const url = `${PAN_AUTO_API_URL}/${carId}/`;
  
  try {
    const res = await fetchWithProxies(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Origin: 'https://pan-auto.ru',
        Referer: 'https://pan-auto.ru/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      },
    });
    
    if (!res.ok) {
      logger.debug(`pan-auto returned ${res.status} for carId ${carId}`);
      return { hp: null, carId };
    }
    
    const data = await res.json();
    const hp = data?.hp;
    
    if (typeof hp === 'number' && !Number.isNaN(hp) && hp > 0) {
      return { hp, carId };
    }
    
    return { hp: null, carId };
  } catch (error) {
    logger.error('pan-auto request error', { carId, error: error.message });
    return { hp: null, carId };
  }
}

/**
 * Поиск HP для фильтра через pan-auto по списку ID
 * До maxAttempts попыток с разными ID
 * 
 * @param {number[]} carIds - массив ID машин из encar_db_prod
 * @param {number} maxAttempts - максимум попыток (default: 7)
 * @param {number} delayMs - задержка между запросами
 * @returns {Promise<{hp: number|null, sampleId: number|null, source: string}>}
 */
export async function searchHpInPanAuto(carIds, maxAttempts = 7, delayMs = 500) {
  const idsToTry = carIds.slice(0, maxAttempts);
  
  for (let i = 0; i < idsToTry.length; i++) {
    const carId = idsToTry[i];
    
    if (i > 0) {
      // Добавляем случайную задержку 500-1000ms
      const randomDelay = delayMs + Math.floor(Math.random() * 500);
      await sleep(randomDelay);
    }
    
    const result = await getHpFromPanAuto(carId);
    
    if (result.hp !== null) {
      logger.info(`HP found via pan-auto`, { carId, hp: result.hp, attempt: i + 1 });
      return {
        hp: result.hp,
        sampleId: carId,
        source: 'pan-auto'
      };
    }
  }
  
  logger.debug(`HP not found in pan-auto after ${idsToTry.length} attempts`);
  return { hp: null, sampleId: null, source: null };
}

