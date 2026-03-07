/**
 * fix_zero_hp.js - скрипт для обновления записей с hp=0 в cars_hp_reference_v2
 * 
 * Использование: node fix_zero_hp.js
 * 
 * Что делает:
 * 1. Находит все записи с hp=0 в таблице cars_hp_reference_v2
 * 2. Для каждой записи запрашивает HP через OpenAI API
 * 3. Обновляет записи в БД найденными значениями
 * 
 * Логи пишутся в ./logs.log
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { ProxyAgent } from 'undici';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Загружаем .env из корня проекта (для CHATGPT_API)
dotenv.config({ 
  path: path.resolve(__dirname, '../../.env'),
  quiet: true 
});

// ============ КОНФИГУРАЦИЯ ============
const DATABASE_URL = 'postgresql://encaruser:jOsbdJSDH37@localhost:5432/encar_local_db';
const OPENAI_API_KEY = process.env.CHATGPT_API;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_MAX_TOKENS = 100;
const OPENAI_TEMPERATURE = 0;

const ATTEMPTS_PER_PROXY = 2;
const MAX_PROXIES_TO_TRY = 50;
const BATCH_SIZE = 10; // Обрабатываем по 10 записей
const DELAY_BETWEEN_REQUESTS = 500; // мс между запросами к OpenAI

const LOG_FILE = path.join(__dirname, 'logs.log');
const PROXY_FILE = path.resolve(__dirname, 'src/lib/proxy.txt');

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
  debug: (msg) => log('DEBUG', msg),
};

// ============ МАППИНГ ТОПЛИВА (из koreanMapping.js) ============
const fuelMap = {
  "가솔린":                { ru: "Бензин", en: "gasoline" },
  "디젤":                  { ru: "Дизель", en: "diesel" },
  "가솔린+전기":           { ru: "Бензин + Электро", en: "gasoline_electric" },
  "디젤+전기":             { ru: "Дизель + Электро", en: "diesel_electric" },
  "가솔린+LPG":            { ru: "Бензин + Газ", en: "gasoline_gas" },
  "가솔린+CNG":            { ru: "Бензин + Газ", en: "gasoline_cng" },
  "전기":                  { ru: "Электро", en: "electric" },
  "수소":                  { ru: "Водород", en: "hydrogen" },
  "LPG+전기":              { ru: "Газ + Электро", en: "gas_electric" },
  "하이브리드":            { ru: "Гибрид", en: "hybrid" },
  "플러그인 하이브리드":   { ru: "Подзаряжаемый гибрид", en: "plug_in_hybrid" },
  "전기차":                { ru: "Электромобиль", en: "electric_car" },
  "LPG":                   { ru: "Газ", en: "gas" },
  "LPG(일반인 구입)":      { ru: "Газ (общая продажа)", en: "gas_general" },
  "CNG":                   { ru: "Газ", en: "cng" },
  "기타":                  { ru: "Не указан", en: "not_specified" }
};

function getFuelEnglish(fuelname) {
  const mapping = fuelMap[fuelname];
  return mapping ? mapping.en : fuelname;
}

// ============ ПРОКСИ ============
let proxies = [];
let currentProxyIndex = 0;

function loadProxies() {
  if (!fs.existsSync(PROXY_FILE)) {
    logger.warn(`proxy.txt не найден: ${PROXY_FILE}`);
    return;
  }
  
  const lines = fs
    .readFileSync(PROXY_FILE, 'utf8')
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
  
  logger.info(`Загружено ${proxies.length} прокси`);
}

async function fetchWithProxy(url, options = {}) {
  if (proxies.length === 0) {
    throw new Error('Прокси не загружены - запросы напрямую отключены');
  }
  
  let lastError = null;
  let proxyTried = 0;
  
  while (proxyTried < MAX_PROXIES_TO_TRY) {
    const proxy = proxies[currentProxyIndex];
    
    for (let attempt = 0; attempt < ATTEMPTS_PER_PROXY; attempt++) {
      try {
        logger.debug(`OpenAI через ${proxy.host}, попытка ${attempt + 1}/${ATTEMPTS_PER_PROXY}`);
        
        const res = await fetch(url, {
          ...options,
          dispatcher: proxy.agent,
        });
        
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          return res;
        }
        
        logger.warn(`OpenAI HTTP ${res.status} через ${proxy.host}, попытка ${attempt + 1}`);
        lastError = new Error(`HTTP ${res.status}`);
        
      } catch (err) {
        logger.warn(`Ошибка прокси ${proxy.host}, попытка ${attempt + 1}: ${err.message}`);
        lastError = err;
      }
    }
    
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
    proxyTried++;
  }
  
  throw new Error(`OpenAI: Ошибка после ${proxyTried} прокси. Последняя ошибка: ${lastError?.message}`);
}

// ============ OPENAI API (логика из openaiApi.js) ============
function isElectric(fuelname) {
  return fuelname === '전기' || fuelname === 'Electric' || fuelname === 'EV';
}

function buildHpPrompt(filter) {
  const {
    manufacturerenglishname,
    modelgroupenglishname,
    gradeenglishname,
    year,
    displacement,
    fuelname
  } = filter;
  
  const fuelEn = getFuelEnglish(fuelname);
  const cleanGrade = gradeenglishname ? gradeenglishname.replace(/[가-힣]/g, '').trim() : '';
  
  const parts = [
    manufacturerenglishname,
    modelgroupenglishname,
    cleanGrade,
    year ? String(year) : '',
    displacement ? `${displacement}cc` : '',
    fuelEn
  ].filter(Boolean);
  
  const carDescription = parts.join(' ');
  
  if (isElectric(fuelname)) {
    return `Electric car sold in South Korea: ${carDescription}

What is the motor power in kW for Korean market version?

Reply ONLY JSON: {"kw":NUMBER,"confidence":"high"|"medium"|"low"|"none"}

Rules:
- Use Korean market (KDM) specs if available, then global specs
- kW = electric motor power in kilowatts
- Use OFFICIAL manufacturer specs, not estimates
- For dual motor, use TOTAL combined power

IMPORTANT: Pay attention to variant (RWD/AWD/Performance)!
- Ignore displacement if it seems wrong (like 0cc, 1cc, 100cc, 123cc)
- Look at grade name to determine RWD vs AWD vs Performance

Common reference values (Korean market kW):
- Hyundai Ioniq 6 LR RWD: 168 kW
- Hyundai Ioniq 6 LR AWD: 239 kW
- Hyundai Ioniq 5 LR RWD: 168 kW
- Hyundai Ioniq 5 LR AWD: 239 kW
- Hyundai Ioniq Electric (1st gen, 28kWh): 88 kW
- Hyundai Casper Electric (Inspiration/Premium): 95 kW
- Kia EV6 RWD LR: 168 kW
- Kia EV6 AWD: 239 kW
- Kia EV3 Standard: 150 kW, Long Range: 150 kW
- Kia RAY EV (2023+): 98 kW (older: 50 kW)
- Genesis GV60 Sport: 160 kW, Performance: 360 kW
- Tesla Model 3 SR/RWD: 208 kW
- Tesla Model 3 LR: 324 kW (dual motor)
- Tesla Model 3 Performance: 340 kW
- Tesla Model Y RWD: 220 kW
- Tesla Model Y LR: 258 kW
- Tesla Model Y Performance: 340 kW
- Mercedes EQB 300: 168 kW (NOT 225 kW - EQB 350 is 215 kW)
- Mercedes EQS 450: 265 kW (single motor), EQS 450+ is 265 kW
- Porsche Taycan Base: 300 kW, Taycan 4S: 390 kW, Turbo: 500 kW
- Mini Aceman SE: 135 kW, Aceman S: 160 kW
- Mini Countryman Electric: 150 kW (SE), 230 kW (SE ALL4)
- Volvo EX30 Single Motor: 200 kW, Twin Motor: 315 kW
- Volvo EX40 Recharge: 170 kW (single), 300 kW (twin)
- Audi Q6 e-tron Performance: 240 kW, quattro: 285 kW, SQ6: 380 kW
- Audi Q4 e-tron 40: 150 kW, 45: 195 kW (AWD), 50: 220 kW

Confidence:
- high = exact official Korean spec found
- medium = global spec or very similar model
- low = estimate based on motor type
- none = cannot determine`;
  }
  
  return `Car sold in South Korea: ${carDescription}

What is the engine horsepower (HP) for Korean market version?

Reply ONLY JSON: {"hp":NUMBER,"confidence":"high"|"medium"|"low"|"none"}

Rules:
- Use Korean market (KDM) specs if available, then global specs
- HP = metric horsepower (PS), NOT kW. 1 kW = 1.36 HP
- Use OFFICIAL manufacturer specs, not estimates
- Be precise about model variants (e.g. 320i vs 318i are DIFFERENT)
- For HYBRIDS: return COMBINED SYSTEM power (engine + electric motor), not just engine

IMPORTANT for Korean market:
- LPG/LPI versions have LOWER power than gasoline (typically 10-20% less)
- Hyundai HG300 LPG: 240 HP (NOT 300 HP - the "300" is model name, not power!)
- Hyundai Grandeur LPG 3.0: 240 HP
- Kia K7 LPI 3.0: 234 HP
- Starex/Solati Diesel 2.5L: 170 HP (VGT), some commercial: 130-136 HP
- Ignore displacement if it seems wrong (like 0cc, 1cc, 123cc)

Common reference values (Korean market):
- BMW 320i (B48 2.0T): 184 HP
- BMW 318i (B48 detuned): 156 HP
- BMW 520i (B48 2.0T): 184 HP
- BMW 530i (B48 2.0T): 252 HP
- BMW X6 xDrive40d: 313 HP (NOT 340)
- Mercedes E350 4MATIC (W213): 272 HP (M256 mild hybrid, NOT 299)
- Mercedes E300: 258 HP
- Audi 40 TFSI (2.0T): 190 HP (NOT 252 - that's 45 TFSI!)
- Audi 45 TFSI (2.0T): 252 HP
- Audi 35 TDI: 150 HP
- Hyundai Sonata 2.0T: 180 HP
- Hyundai Grandeur 2.5 Hybrid (IG): 190 HP combined (NOT 230)
- Kia K5 2.0T: 180 HP
- Kia Seltos 1.6T: 177 HP (Korean market)
- Genesis G70 2.0T: 252 HP
- Toyota Sienna Hybrid: 245 HP (combined)
- Toyota Prius (1.8L): 122 HP (combined), engine only: 98 HP

Confidence:
- high = exact official Korean spec found
- medium = global spec or very similar model
- low = estimate based on engine type
- none = cannot determine`;
}

function parseOpenAIResponse(content) {
  try {
    const direct = JSON.parse(content);
    return {
      hp: typeof direct.hp === 'number' ? direct.hp : null,
      kw: typeof direct.kw === 'number' ? direct.kw : null,
      confidence: direct.confidence || null
    };
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          hp: typeof parsed.hp === 'number' ? parsed.hp : null,
          kw: typeof parsed.kw === 'number' ? parsed.kw : null,
          confidence: parsed.confidence || null
        };
      } catch {
        // ignore
      }
    }
    
    const hpMatch = content.match(/"hp"\s*:\s*(\d+)/);
    if (hpMatch) {
      return {
        hp: parseInt(hpMatch[1], 10),
        kw: null,
        confidence: 'low'
      };
    }
    
    const kwMatch = content.match(/"kw"\s*:\s*(\d+)/);
    if (kwMatch) {
      return {
        hp: null,
        kw: parseInt(kwMatch[1], 10),
        confidence: 'low'
      };
    }
    
    return { hp: null, kw: null, confidence: null };
  }
}

async function getHpFromOpenAI(filter) {
  if (!OPENAI_API_KEY) {
    logger.error('OpenAI API key не настроен (переменная CHATGPT_API)');
    return { hp: null, confidence: null, source: null };
  }
  
  const prompt = buildHpPrompt(filter);
  const filterDesc = `${filter.manufacturerenglishname} ${filter.modelgroupenglishname} ${filter.modelname} (${filter.year})`;
  
  logger.debug(`🤖 OpenAI запрос для: ${filterDesc}`);
  
  try {
    const response = await fetchWithProxy(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a car specifications database. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: OPENAI_MAX_TOKENS,
        temperature: OPENAI_TEMPERATURE
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`OpenAI API ошибка ${response.status}: ${errorText.substring(0, 200)}`);
      return { hp: null, confidence: null, source: null };
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      logger.warn(`OpenAI пустой ответ для ${filterDesc}`);
      return { hp: null, confidence: null, source: null };
    }
    
    logger.debug(`OpenAI ответ: ${content}`);
    
    const parsed = parseOpenAIResponse(content);
    const electric = isElectric(filter.fuelname);
    let finalHp = parsed.hp;
    
    if (electric && parsed.kw && parsed.kw > 0) {
      finalHp = Math.round(parsed.kw * 1.34102209);
      logger.info(`✅ OpenAI: ${filterDesc} => ${parsed.kw} kW = ${finalHp} HP (${parsed.confidence})`);
      return {
        hp: finalHp,
        confidence: parsed.confidence,
        source: 'openai'
      };
    }
    
    if (finalHp && finalHp > 0) {
      logger.info(`✅ OpenAI: ${filterDesc} => ${finalHp} HP (${parsed.confidence})`);
      return {
        hp: finalHp,
        confidence: parsed.confidence,
        source: 'openai'
      };
    }
    
    logger.warn(`⚠️ OpenAI не нашёл HP: ${filterDesc} | confidence: ${parsed.confidence}`);
    return { hp: null, confidence: parsed.confidence || 'none', source: null };
    
  } catch (error) {
    logger.error(`❌ OpenAI ошибка запроса: ${error.message} | ${filterDesc}`);
    return { hp: null, confidence: null, source: null };
  }
}

// ============ ПРОВЕРКА НА ПРОПУСК ============
function shouldSkipRecord(record) {
  // Список ключевых слов для пропуска
  const skipKeywords = ['others', '기타', 'etc', 'unknown', 'не указан'];
  
  const manufacturer = (record.manufacturerenglishname || '').toLowerCase();
  const modelgroup = (record.modelgroupenglishname || '').toLowerCase();
  const modelname = (record.modelname || '').toLowerCase();
  
  // Проверяем все поля на наличие ключевых слов для пропуска
  for (const keyword of skipKeywords) {
    if (manufacturer.includes(keyword) || modelgroup.includes(keyword) || modelname.includes(keyword)) {
      return true;
    }
  }
  
  // Пропускаем если marker или source уже указывают на пропуск
  if (record.marker === 'Others/기타' || record.source === 'skipped') {
    return true;
  }
  
  return false;
}

// ============ ОСНОВНАЯ ЛОГИКА ============
async function main() {
  logger.info('========================================');
  logger.info('🚀 Запуск скрипта fix_zero_hp.js');
  logger.info('========================================');
  
  // Проверяем API ключ
  if (!OPENAI_API_KEY) {
    logger.error('❌ CHATGPT_API не найден в .env файле!');
    process.exit(1);
  }
  
  // Загружаем прокси
  loadProxies();
  
  if (proxies.length === 0) {
    logger.error('❌ Прокси не загружены, работа невозможна');
    process.exit(1);
  }
  
  // Подключаемся к БД
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });
  
  const client = await pool.connect();
  
  try {
    // Находим все записи с hp = 0
    logger.info('🔍 Поиск записей с hp = 0 в cars_hp_reference_v2...');
    
    const { rows: zeroHpRecords } = await client.query(`
      SELECT id, cartype, manufacturername, manufacturerenglishname,
             modelgroupname, modelgroupenglishname, modelname,
             gradename, gradeenglishname, year, fuelname,
             transmission_name, displacement, source, marker
      FROM cars_hp_reference_v2
      WHERE hp = 0
      ORDER BY id
    `);
    
    if (zeroHpRecords.length === 0) {
      logger.info('✅ Записей с hp = 0 не найдено. Завершение.');
      return;
    }
    
    logger.info(`📊 Найдено ${zeroHpRecords.length} записей с hp = 0`);
    
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    // Обрабатываем записи
    for (let i = 0; i < zeroHpRecords.length; i++) {
      const record = zeroHpRecords[i];
      const filterDesc = `${record.manufacturerenglishname} ${record.modelgroupenglishname} ${record.modelname} (${record.year})`;
      
      // Пропускаем записи типа "Others", "기타", "etc"
      if (shouldSkipRecord(record)) {
        logger.info(`[${i + 1}/${zeroHpRecords.length}] ⏭️ Пропуск: ${filterDesc} (Others/기타)`);
        skipped++;
        continue;
      }
      
      logger.info(`\n[${i + 1}/${zeroHpRecords.length}] Обработка: ${filterDesc}`);
      
      // Запрашиваем HP через OpenAI
      const result = await getHpFromOpenAI(record);
      
      if (result.hp && result.hp > 0) {
        // Определяем marker
        let marker = 'Неточно';
        if (result.confidence === 'high') {
          marker = 'Точно';
        } else if (result.confidence === 'none') {
          marker = 'Очень неточно';
        }
        
        // Обновляем запись в БД
        await client.query(`
          UPDATE cars_hp_reference_v2
          SET hp = $1, source = 'openai', marker = $2, 
              description = $3, last_checked_at = NOW()
          WHERE id = $4
        `, [
          result.hp,
          marker,
          `OpenAI confidence: ${result.confidence || 'unknown'}`,
          record.id
        ]);
        
        logger.info(`✅ Обновлено: ID ${record.id} | ${filterDesc} | HP: 0 → ${result.hp} (${marker})`);
        updated++;
      } else {
        logger.warn(`❌ Не удалось получить HP для: ${filterDesc}`);
        failed++;
      }
      
      // Пауза между запросами к OpenAI
      if (i < zeroHpRecords.length - 1) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_REQUESTS));
      }
    }
    
    logger.info('\n========================================');
    logger.info('📊 ИТОГИ:');
    logger.info(`   ✅ Обновлено: ${updated}`);
    logger.info(`   ❌ Не удалось: ${failed}`);
    logger.info(`   ⏭️ Пропущено: ${skipped}`);
    logger.info(`   📝 Всего обработано: ${zeroHpRecords.length}`);
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

