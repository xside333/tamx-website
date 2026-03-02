// lib/hpConfig.js - конфигурация для HP поиска
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Загружаем .env из корня проекта
dotenv.config({ 
  path: path.resolve(__dirname, '../../../../.env'),
  quiet: true 
});

export const config = {
  database: {
    url: process.env.DATABASE_URL,
  },
  
  openai: {
    apiKey: process.env.CHATGPT_API,
    model: 'gpt-4o-mini',
    maxTokens: 100,
    temperature: 0,
  },
  
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  
  worker: {
    batchSize: 5,
    cycleDelay: 5000,
    concurrency: 2,
    maxPanAutoAttempts: 7,
    panAutoDelay: 800,
  },
  
  paths: {
    proxyFile: path.resolve(__dirname, 'proxy.txt'),
    logsDir: path.resolve(__dirname, '..', '..', 'logs'),
  },
};

// Валидация обязательных переменных
export function validateConfig() {
  const missing = [];
  
  if (!config.database.url) missing.push('DATABASE_URL');
  if (!config.openai.apiKey) missing.push('CHATGPT_API');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
}

