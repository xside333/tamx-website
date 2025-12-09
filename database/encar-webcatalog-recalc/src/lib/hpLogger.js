// lib/hpLogger.js - логирование для HP поиска
import fs from 'fs';
import path from 'path';
import { config } from './hpConfig.js';

const logsDir = config.paths.logsDir;

// Создаём папку логов, если не существует
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, meta = {}) {
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${getTimestamp()}] [${level}] ${message}${metaStr}`;
}

function writeToFile(filename, message) {
  const logPath = path.join(logsDir, filename);
  fs.appendFileSync(logPath, message + '\n');
}

export const logger = {
  info(message, meta = {}) {
    const formatted = formatMessage('INFO', message, meta);
    console.log(formatted);
    writeToFile('hp-worker.log', formatted);
  },
  
  warn(message, meta = {}) {
    const formatted = formatMessage('WARN', message, meta);
    console.warn(formatted);
    writeToFile('hp-worker.log', formatted);
  },
  
  error(message, meta = {}) {
    const formatted = formatMessage('ERROR', message, meta);
    console.error(formatted);
    writeToFile('hp-worker.log', formatted);
    writeToFile('hp-worker-errors.log', formatted);
  },
  
  debug(message, meta = {}) {
    if (process.env.DEBUG === 'true') {
      const formatted = formatMessage('DEBUG', message, meta);
      console.log(formatted);
      writeToFile('hp-worker-debug.log', formatted);
    }
  }
};

