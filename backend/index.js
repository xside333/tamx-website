import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getFilters } from './components/getFilters.js';
import { heroCard } from './components/heroCard.js';
import { getFilteredCars } from './components/getFilteredCars.js';
import { getCatalogModels } from './components/getCatalogModels.js';
import { getCarDetails } from './components/getCarDetails.js';
import { deliveryCost } from './components/deliveryCost.js';
import { submitLead } from './components/submitLead.js';
import { horsePower } from './components/horsePower.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Разрешаем браузерные запросы только с доменов tamx.ru
const corsOptions = {
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (curl, сервер-сервер, healthcheck)
    if (!origin) return callback(null, true);
    const allowed = /^https?:\/\/([\w-]+\.)?tamx\.ru(:\d+)?$/.test(origin);
    if (allowed) return callback(null, true);
    callback(new Error(`CORS: origin не разрешён — ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};

// Rate limiting — резервный уровень защиты поверх nginx
// Основной rate limit стоит в nginx; здесь страхуем обход nginx
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 200,            // до 200 запросов в минуту с одного IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
});

// Строгий лимит только на POST /lead (защита от спама заявок)
const leadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Слишком много заявок. Попробуйте позже.' },
});

app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json());

app.get('/filters', getFilters);
app.get('/herocard', heroCard);
app.get('/catalog', getFilteredCars);
app.get('/catalog/models', getCatalogModels);
app.get('/car/:id', getCarDetails);
app.get('/deliveryCost', deliveryCost);
app.get('/hp', horsePower);

app.post('/lead', leadLimiter, submitLead);
app.post('/hp', horsePower);

app.get('/', (req, res) => {
  res.json({ status: 'API online' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
