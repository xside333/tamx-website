// lib/openaiApi.js - запросы к OpenAI API для поиска HP через прокси
import fs from 'fs';
import { ProxyAgent } from 'undici';
import { config } from './hpConfig.js';
import { logger } from './hpLogger.js';
import { getFuelEnglish } from './koreanMapping.js';

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
- Use Korean market (KDM) specs if available
- If no Korean specs, use global/international specs
- kW = electric motor power in kilowatts
- high = exact Korean spec, medium = global spec or similar, low = estimate, none = unknown`;
  }
  
  return `Car sold in South Korea: ${carDescription}

What is the engine horsepower (HP) for Korean market version?

Reply ONLY JSON: {"hp":NUMBER,"confidence":"high"|"medium"|"low"|"none"}

Rules:
- Use Korean market (KDM) specs if available
- If no Korean specs, use global/international specs
- HP = engine power in horsepower (not kW)
- high = exact Korean spec, medium = global spec or similar, low = estimate, none = unknown`;
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
  const filterDesc = `${filter.manufacturerenglishname} ${filter.modelname}`;
  
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
    logger.debug(`OpenAI raw: ${content}`);
    
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
    logger.warn(`OpenAI no HP: ${filterDesc} | response: ${content.substring(0, 100)}`);
    return { hp: null, confidence: parsed.confidence || 'none', source: null };
    
  } catch (error) {
    logger.error(`OpenAI request failed: ${error.message} | ${filterDesc}`);
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
 * Поиск HP через OpenAI с проверкой confidence
 * Возвращает hp только если confidence не "none"
 * 
 * @param {Object} filter - объект фильтра
 * @returns {Promise<{hp: number|null, sampleId: null, source: string|null, marker: string|null}>}
 */
export async function searchHpInOpenAI(filter) {
  const result = await getHpFromOpenAI(filter);
  
  if (result.hp && result.hp > 0 && result.confidence !== 'none') {
    // Определяем marker на основе confidence
    let marker = 'Неточно';
    if (result.confidence === 'high') {
      marker = 'Точно';
    } else if (result.confidence === 'medium') {
      marker = 'Неточно';
    } else {
      marker = 'Неточно';
    }
    
    return {
      hp: result.hp,
      sampleId: null,
      source: 'openai',
      marker,
      description: `OpenAI confidence: ${result.confidence}`
    };
  }
  
  return {
    hp: null,
    sampleId: null,
    source: null,
    marker: null,
    description: null
  };
}

