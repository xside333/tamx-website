// production/server.js
import express from 'express';
import path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const app = express();

// __dirname в ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env из папки frontend
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 8000;

// Если стоим за Nginx/прокси
app.set('trust proxy', true);

// Безопасные заголовки + CSP
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://yastatic.net"
        ],

        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://yastatic.net"
        ],

        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "https://ci.encar.com",
          "https://*.yandex.ru",
          "https://*.maps.yandex.net",
          "https://mc.webvisor.org",
          "https://*.tile.yandex.net",
          "https://yastatic.net",
          "https://mc.yandex.ru"
        ],

        scriptSrc: [
          "'self'",
          "'unsafe-eval'",
          "'unsafe-inline'",
          "https://api-maps.yandex.ru",
          "https://yastatic.net",
          "https://*.yandex.ru",
          "https://mc.yandex.ru"
        ],

        connectSrc: [
          "'self'",
          "https://api.tamx.ru",
          "https://api-maps.yandex.ru",
          "https://geocode-maps.yandex.ru",
          "https://yandex.ru",
          "https://*.yandex.ru",
          "https://*.maps.yandex.net",
          "https://mc.webvisor.org",
          "https://*.tile.yandex.net",
          "wss://mc.yandex.ru",
          "wss://mc.webvisor.org",
          "wss://*.yandex.ru",
          "wss://*.maps.yandex.net"
        ],

        frameSrc: [
          "https://yandex.ru",
          "https://*.yandex.ru",
          "https://mc.webvisor.org",
          "https://*.maps.yandex.net"
        ],

        workerSrc: ["'self'", "blob:"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"]
      }
    }
  })
);

// Сжатие
app.use(compression());

// ----- Статика -----
// 1) Ассеты Vite: /assets/* (js/css/шрифты/картинки) — кэш на год + immutable
app.use(
  '/assets',
  express.static(path.join(__dirname, '../dist/assets'), {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader(
          'Cache-Control',
          'public, max-age=31536000, immutable'
        );
      }
    }
  })
);

// 2) Файлы из dist/spa (favicon, robots.txt, изображения в корне spa)
app.use(
  express.static(path.join(__dirname, '../dist/spa'), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  })
);

// Health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// SPA fallback — всегда отдаём index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/spa', 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Internal Server Error');
    }
  });
});

// Ошибки
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Старт
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Tarasov Auto Frontend on ${PORT}`);
  console.log(`🌍 https://auto.tamx.ru`);
});
