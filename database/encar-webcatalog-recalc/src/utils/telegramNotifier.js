import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const errorsDictionary = JSON.parse(
  fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), 'errorsDictionary.json'))
);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function logTelegram(message) {
  console.log(`[Telegram] ${message}`);
}

async function send(errorKey) {
  const error = errorsDictionary[errorKey];

  if (!error) {
    logTelegram(`⚠️ Попытка отправки неизвестной ошибки: ${errorKey}`);
    return;
  }

  const message = `
🚨 Ошибка в Encar Recalc Script:

📍 Ошибка: ${error.message}
📌 Причина: ${error.reason}
🔧 Решение: ${error.solution}
🕒 Время: ${new Date().toLocaleString()}
  `;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });

    logTelegram(`✅ Уведомление отправлено в Telegram: ${errorKey}`);
  } catch (e) {
    logTelegram(`❌ Ошибка отправки уведомления в Telegram: ${e.message}`);
  }
}

export default { send };
