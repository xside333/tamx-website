import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Загружаем .env из корня проекта (tarasov-auto/.env)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.RECEIVER_PORT || '4100', 10),
  databaseUrl: process.env.DATABASE_URL,
  apiKey: process.env.RECEIVER_API_KEY || '2222khnjknkksdvjkjakh83237h3f734hf7h7h47fhhehf74h74h7hfeuhu',
};

// Валидация обязательных переменных
if (!config.databaseUrl) {
  console.error('[CONFIG] FATAL: DATABASE_URL не задан в .env');
  process.exit(1);
}
