// lib/openaiApi.js - запросы к OpenAI API для поиска HP через прокси
import fs from 'fs';
import { ProxyAgent } from 'undici';
import { config } from './hpConfig.js';
import { logger } from './hpLogger.js';
import { getFuelEnglish } from '../utils/koreanMapping.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const ATTEMPTS_PER_PROXY = 2;
const MAX_PROXIES_TO_TRY = 50;

// Загрузка прокси
let proxies = [];
let currentProxyIndex = 0;

function loadProxies() {
  const proxyFilePath = config.paths.proxyFile;
  
  if (!fs.existsSync(proxyFilePath)) {
    logger.warn('proxy.txt not found for OpenAI, requests will be direct', { path: proxyFilePath });
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
  
  logger.info(`OpenAI: Loaded ${proxies.length} proxies`);
}

// Инициализация прокси при загрузке модуля
loadProxies();

/**
 * Fetch через прокси с ротацией (2 попытки на прокси, затем следующий)
 */
async function fetchWithProxy(url, options = {}) {
  if (proxies.length === 0) {
    throw new Error('No proxies available - direct requests disabled');
  }
  
  let lastError = null;
  let proxyTried = 0;
  
  while (proxyTried < MAX_PROXIES_TO_TRY) {
    const proxy = proxies[currentProxyIndex];
    
    for (let attempt = 0; attempt < ATTEMPTS_PER_PROXY; attempt++) {
      try {
        logger.debug(`OpenAI via ${proxy.host}, attempt ${attempt + 1}/${ATTEMPTS_PER_PROXY}`);
        
        const res = await fetch(url, {
          ...options,
          dispatcher: proxy.agent,
        });
        
        // Успешный ответ (включая 4xx от API - это не проблема прокси)
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          return res;
        }
        
        logger.warn(`OpenAI HTTP ${res.status} via ${proxy.host}, attempt ${attempt + 1}/${ATTEMPTS_PER_PROXY}`);
        lastError = new Error(`HTTP ${res.status}`);
        
      } catch (err) {
        logger.warn(`OpenAI proxy error ${proxy.host}, attempt ${attempt + 1}/${ATTEMPTS_PER_PROXY}: ${err.message}`);
        lastError = err;
      }
    }
    
    // Переключаемся на следующий прокси
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
    proxyTried++;
  }
  
  throw new Error(`OpenAI: Failed after ${proxyTried} proxies. Last error: ${lastError?.message}`);
}

/**
 * Проверка - электромобиль ли это
 */
function isElectric(fuelname) {
  return fuelname === '전기' || fuelname === 'Electric' || fuelname === 'EV';
}

/**
 * Оптимизированный промпт для поиска HP/kW автомобиля.
 * Приоритет: Korean market specs → Global specs
 * Для электромобилей запрашиваем kW.
 */
function buildHpPrompt(filter) {
  const {
    manufacturerenglishname,
    modelgroupenglishname,
    gradeenglishname,
    year,
    displacement,
    fuelname
  } = filter;
  
  // Конвертируем топливо в английское название
  const fuelEn = getFuelEnglish(fuelname);
  
  // Убираем корейские символы из grade если есть
  const cleanGrade = gradeenglishname ? gradeenglishname.replace(/[가-힣]/g, '').trim() : '';
  
  // Формируем описание ТОЛЬКО на английском
  const parts = [
    manufacturerenglishname,
    modelgroupenglishname,
    cleanGrade,
    year ? String(year) : '',
    displacement ? `${displacement}cc` : '',
    fuelEn
  ].filter(Boolean);
  
  const carDescription = parts.join(' ');
  
  // Для электромобилей спрашиваем kW
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

/**
 * Запрос к OpenAI API для получения HP через прокси
 * @param {Object} filter - объект фильтра с полями авто
 * @returns {Promise<{hp: number|null, confidence: string|null, source: string}>}
 */
export async function getHpFromOpenAI(filter) {
  const apiKey = config.openai.apiKey;
  
  if (!apiKey) {
    logger.error('OpenAI API key not configured');
    return { hp: null, confidence: null, source: null };
  }
  
  const prompt = buildHpPrompt(filter);
  const filterDesc = `${filter.manufacturerenglishname} ${filter.modelgroupenglishname} ${filter.modelname} (${filter.year})`;
  
  logger.debug(`🤖 OpenAI request for: ${filterDesc}`);
  
  try {
    const response = await fetchWithProxy(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.openai.model,
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
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`OpenAI API error ${response.status}: ${errorText.substring(0, 200)}`);
      return { hp: null, confidence: null, source: null };
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      logger.warn(`OpenAI empty content for ${filterDesc}`);
      return { hp: null, confidence: null, source: null };
    }
    
    // Логируем сырой ответ для отладки
    logger.debug(`OpenAI raw response: ${content}`);
    
    // Парсим JSON ответ
    const parsed = parseOpenAIResponse(content);
    
    // Для электромобилей конвертируем kW в HP
    const electric = isElectric(filter.fuelname);
    let finalHp = parsed.hp;
    
    if (electric && parsed.kw && parsed.kw > 0) {
      // Формула: hp = kW × 1.34102209
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
    
    // Логируем неудачу с деталями
    logger.warn(`⚠️ OpenAI no HP found: ${filterDesc} | confidence: ${parsed.confidence} | response: ${content.substring(0, 100)}`);
    return { hp: null, confidence: parsed.confidence || 'none', source: null };
    
  } catch (error) {
    logger.error(`❌ OpenAI request failed: ${error.message} | ${filterDesc}`);
    return { hp: null, confidence: null, source: null };
  }
}

/**
 * Парсинг ответа OpenAI
 * Пытаемся извлечь JSON даже если он обёрнут в markdown
 */
function parseOpenAIResponse(content) {
  try {
    // Пробуем напрямую
    const direct = JSON.parse(content);
    return {
      hp: typeof direct.hp === 'number' ? direct.hp : null,
      kw: typeof direct.kw === 'number' ? direct.kw : null,
      confidence: direct.confidence || null
    };
  } catch {
    // Пробуем извлечь JSON из markdown
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
    
    // Пробуем найти число после "hp":
    const hpMatch = content.match(/"hp"\s*:\s*(\d+)/);
    if (hpMatch) {
      return {
        hp: parseInt(hpMatch[1], 10),
        kw: null,
        confidence: 'low'
      };
    }
    
    // Пробуем найти число после "kw":
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

/**
 * Поиск HP через OpenAI
 * ВАЖНО: Сохраняем HP ВСЕГДА если получили число, независимо от confidence
 * 
 * @param {Object} filter - объект фильтра
 * @returns {Promise<{hp: number|null, sampleId: null, source: string|null, marker: string|null, description: string|null}>}
 */
export async function searchHpInOpenAI(filter) {
  const filterDesc = `${filter.manufacturerenglishname} ${filter.modelgroupenglishname} ${filter.modelname} (${filter.year})`;
  
  // Проверяем наличие API ключа
  if (!config.openai.apiKey) {
    logger.error('❌ OpenAI API key not configured (CHATGPT_API env var missing)');
    return {
      hp: null,
      sampleId: null,
      source: null,
      marker: null,
      description: 'OpenAI API key not configured'
    };
  }
  
  logger.info(`🤖 Requesting OpenAI for: ${filterDesc}`);
  
  const result = await getHpFromOpenAI(filter);
  
  // ВАЖНО: Сохраняем HP ВСЕГДА если получили число > 0
  // Даже с low confidence или none - лучше иметь примерное значение, чем 0
  if (result.hp && result.hp > 0) {
    // Определяем marker на основе confidence
    let marker = 'Неточно';
    if (result.confidence === 'high') {
      marker = 'Точно';
    } else if (result.confidence === 'medium') {
      marker = 'Неточно';
    } else if (result.confidence === 'low') {
      marker = 'Неточно';
    } else if (result.confidence === 'none') {
      marker = 'Очень неточно'; // Новый маркер для совсем неуверенных результатов
    }
    
    logger.info(`✅ OpenAI SUCCESS: ${filterDesc} => ${result.hp} HP (confidence: ${result.confidence || 'unknown'})`);
    
    return {
      hp: result.hp,
      sampleId: null,
      source: 'openai',
      marker,
      description: `OpenAI confidence: ${result.confidence || 'unknown'}`
    };
  }
  
  // Только если OpenAI вернул null или 0 - не сохраняем
  logger.warn(`⚠️ OpenAI FAILED: ${filterDesc} (confidence: ${result.confidence || 'unknown'}, hp: ${result.hp || 'null'})`);
  
  return {
    hp: null,
    sampleId: null,
    source: null,
    marker: null,
    description: result.confidence ? `OpenAI returned confidence: ${result.confidence}` : 'OpenAI request failed'
  };
}

