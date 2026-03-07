# Tamx Auto — Каталог автомобилей из Кореи и Китая

Полнофункциональная платформа для продажи автомобилей с автоматическим расчётом растаможки, кредитным калькулятором, интеграцией с Encar (Корея) и Che168 (Китай).

## О проекте

**Tamx Auto** — full-stack веб-приложение для каталога автомобилей:
- Просмотр каталога из Кореи (Encar) и Китая (Che168)
- Два режима отображения: список объявлений и агрегированный список моделей
- Автоматический расчёт стоимости растаможки и логистики
- Кредитный калькулятор для расчёта ежемесячных платежей
- Фильтрация по множеству параметров (марка, модель, поколение, год, цена, пробег и др.)
- Сохранение избранных автомобилей
- Отправка заявок на покупку

**Сайт**: https://auto.tamx.ru  
**API**: https://api.tamx.ru

## Архитектура проекта

```
tarasov-auto/
├── .env                        # Общие переменные окружения (DATABASE_URL, токены)
│
├── backend/                    # Express API сервер (:3000)
│   ├── index.js                # Точка входа, регистрация маршрутов
│   ├── utils/
│   │   └── dbClient.js         # Shared PostgreSQL пул соединений
│   └── components/             # Обработчики маршрутов
│       ├── getFilteredCars.js      # GET /catalog
│       ├── getCatalogModels.js     # GET /catalog/models
│       ├── getCarDetails.js        # GET /car/:id
│       ├── getFilters.js           # GET /filters
│       ├── buildCatalogFilters.js  # Хелпер построения WHERE-условий
│       ├── deliveryCost.js         # GET /deliveryCost
│       ├── heroCard.js             # GET /herocard
│       ├── horsePower.js           # GET|POST /hp
│       └── submitLead.js           # POST /lead
│
├── frontend/                   # React SPA приложение (:8000)
│   ├── client/
│   │   └── src/
│   │       ├── components/         # UI компоненты (Atomic Design)
│   │       │   ├── atoms/              # Button, Input, Badge, Icon, PriceTag, Skeleton, FavoritesButton
│   │       │   ├── molecules/          # Select, CreditCalculator, DeliveryToCity, PriceRange,
│   │       │   │                       # YearMonthRange, MileageRange, SortSelect, Pagination,
│   │       │   │                       # FavoritesPopover, LeadModal, Hint, SourceSelector,
│   │       │   │                       # PriceCalculationPopover, CtaBanner, SpecList,
│   │       │   │                       # ShowMoreButton, LocationSection, CarInfo,
│   │       │   │                       # FloatingFavoritesButton, FavoriteToggle, TradeInButton
│   │       │   ├── organisms/          # CarCard, ModelCard, CarGrid, ModelGrid, Header, Footer,
│   │       │   │                       # FiltersAside, CarGallery, PhotoGallery, FinanceBlock,
│   │       │   │                       # CarSummary, RelatedCars, YouMayAlsoLike, MapPlaceholder
│   │       │   └── templates/          # CarDetailTemplate
│   │       ├── hooks/              # useCars, useCatalogModels, useFavorites, useFavoriteCars,
│   │       │                       # useHierarchicalFilters, useHorsePower, useStickyFilters,
│   │       │                       # useResponsiveHeader, useMobile
│   │       ├── lib/                # API клиент, утилиты, форматирование, финансовые расчёты
│   │       ├── pages/              # CatalogPage, CarDetailPage, NotFound
│   │       └── types/              # TypeScript типы (Filters, Car, CatalogModel и др.)
│   └── production/             # Production-сервер (PM2, cluster mode)
│       ├── server.js
│       ├── deploy.sh               # Скрипт сборки и деплоя
│       └── ecosystem.config.cjs
│
└── database/                   # Сервисы работы с данными
    ├── auto-webcatalog-recalc/     # Основной пересчёт Korea + China (PM2: auto-recalc)
    │   └── src/
    │       ├── index.js                # Оркестратор (big cycle + small cycle)
    │       ├── components/
    │       │   ├── fetchEncarData.js   # Загрузка данных Encar
    │       │   ├── fetchChe168Data.js  # Загрузка данных Che168
    │       │   ├── calculateBatch.js   # Пересчёт растаможки батчами
    │       │   ├── updateData.js       # Запись результатов в auto_webcatalog
    │       │   ├── generateFilters.js  # Обновление кэша фильтров (car_filters)
    │       │   ├── updateModelsAgg.js  # Обновление агрегированной таблицы моделей
    │       │   ├── hpSearchService.js  # Поиск лошадиных сил
    │       │   ├── referenceData.js    # Загрузка справочных данных
    │       │   └── workerCalc.js       # Worker thread для параллельного расчёта
    │       ├── lib/                    # panAutoApi, openaiApi, hpConfig, hpLogger
    │       └── utils/                  # dbClient, logger, telegramNotifier,
    │                                   # calcCarKorea, calcCarChina, koreanMapping,
    │                                   # columnMapping, brandModelMapping, getHorsepower
    │
    ├── parser-api/                 # API для парсера данных (:4000, PM2: parser-api-v2)
    │   ├── carApi_v2.js
    │   └── lib/                    # hpConfig, hpLogger, koreanMapping, panAutoApi, openaiApi
    │
    └── che168-api/                 # Receiver синхронизации Che168 (:4100, PM2: che168-receiver)
        ├── ecosystem.config.cjs
        └── src/
            ├── config.js               # Конфигурация (DATABASE_URL из корневого .env)
            ├── dbClient.js             # PostgreSQL пул соединений
            └── server.js               # Express-сервер (приём батчей изменений)
```

## Инфраструктура

### Серверы

| Роль | Адрес | Описание |
|------|-------|----------|
| Сервер B (production) | 82.202.170.246 | Основной сервер: фронтенд, бэкенд, БД |
| Сервер A (encar-project) | 103.71.20.164 (kclauto.ru) | Парсинг данных, синхронизация с API |

### Сервисы (PM2)

| Имя | Порт | Режим | Описание |
|-----|------|-------|----------|
| `backend` | 3000 | cluster (5) | REST API для фронтенда |
| `tarasov-auto-frontend` | 8000 | cluster (8) | SPA React-приложение |
| `auto-recalc` | — | fork | Пересчёт каталога Korea + China, обновление агрегаций |
| `parser-api-v2` | 4000 | fork | API для парсера Encar |
| `che168-receiver` | 4100 | fork | Приёмник синхронизации Che168 |

### Nginx (reverse proxy)

| Домен | Назначение | Проксирует на |
|-------|------------|---------------|
| `auto.tamx.ru` | Фронтенд (HTTP/HTTPS) | `localhost:8000` |
| `api.tamx.ru` | Backend API (HTTPS) | `localhost:3000` |

### Файрвол (UFW)

| Порт | Доступ | Сервис |
|------|--------|--------|
| 22 | Отовсюду | SSH |
| 80, 443 | Отовсюду | Nginx (HTTP/HTTPS) |
| 3000 | Отовсюду | Backend API |
| 4000 | Отовсюду | Parser API |
| 8000 | Отовсюду | Frontend |
| 4100 | Только 103.71.20.164 | che168-receiver |

### База данных (PostgreSQL)

| Таблица | Описание |
|---------|----------|
| `auto_webcatalog` | Основной пересчитанный каталог (Korea + China) с растаможкой |
| `auto_models_agg` | Агрегированная таблица моделей: диапазоны цен/года/HP, 4 фото-превью |
| `encar_db_prod` | Сырые данные Encar (Корея) |
| `che168_autoparser` | Сырые данные Che168 (Китай) |
| `cars_hp_reference_v2` | Справочник лошадиных сил |
| `car_filters` | Кэш фильтров каталога |
| `customs_rates` / `customs_rate_0_3` | Таможенные ставки |
| `customs_fee` | Таможенные сборы |
| `exchange_rates` | Курсы валют |
| `util_rates` | Утилизационный сбор |
| `SWIFT` | Справочник SWIFT-кодов |

**Подключение**: `postgresql://encaruser:***@localhost:5432/encar_local_db`

## Технологический стек

### Frontend
- **React 19** + TypeScript
- **Vite 7** (сборка)
- **TailwindCSS 3** (стили, CSS-переменные / design tokens)
- **React Query (@tanstack/react-query)** (серверное состояние и кэширование)
- **React Router 6** (маршрутизация)
- **Zod** (валидация)

### Backend
- **Node.js 20** + Express 5
- **PostgreSQL** (pg)
- **express-rate-limit** (защита от перебора)

### Database Services
- **pg** — прямые SQL-запросы к PostgreSQL
- **dotenv** — конфигурация через `.env`
- **axios** — HTTP-запросы к внешним API
- **OpenAI API** — поиск лошадиных сил (fallback)

### DevOps
- **PM2** — менеджер процессов (cluster + fork)
- **pm2-logrotate** — ротация логов
- **Nginx** — reverse proxy, SSL (Let's Encrypt)
- **UFW** — файрвол
- **Ubuntu 24.04 LTS**

## Цикл пересчёта каталога (auto-recalc)

Сервис `auto-recalc` работает в двух режимах:

- **Big cycle** (раз в N часов) — полный пересчёт всего каталога:
  1. Загрузка данных из `encar_db_prod` и `che168_autoparser`
  2. Расчёт растаможки, логистики, конвертация валют
  3. Запись в `auto_webcatalog`
  4. Поиск лошадиных сил (`hpSearchService`)
  5. Обновление кэша фильтров (`car_filters`)
  6. Пересборка агрегированной таблицы моделей (`auto_models_agg`)

- **Small cycle** (раз в N минут) — инкрементальная сверка новых/изменённых записей

### Агрегированная таблица моделей (`auto_models_agg`)

Хранит предрассчитанные данные для режима "список моделей" на сайте:
- Диапазоны года, цены, пробега, объёма двигателя, мощности
- Нормализованные типы топлива (`Бензин`, `Дизель`, `Электро`, `Гибрид`, `Газ`)
- 4 фото-превью на модель (приоритет: корейские фото `code=001`, затем китайские)

## Синхронизация Che168 (Сервер A → Сервер B)

- Сервер A отправляет батчи изменений на порт 4100
- Сервер B принимает и применяет изменения через UPSERT/DELETE в `che168_autoparser`
- Авторизация: заголовок `x-api-key`
- Порт 4100 открыт только для IP Сервера A

## API Endpoints

### Backend API (api.tamx.ru)

```
GET  /catalog             # Список автомобилей с фильтрами (пагинация, сортировка)
GET  /catalog/models      # Агрегированный список моделей (из auto_models_agg)
GET  /car/:id             # Детали автомобиля
GET  /filters             # Опции фильтров каталога
GET  /herocard            # Карточка для главной страницы
GET  /deliveryCost        # Стоимость доставки
GET  /hp                  # Поиск лошадиных сил
POST /hp                  # Поиск лошадиных сил (POST)
POST /lead                # Отправка заявки
```

### Che168 Receiver (порт 4100, только для Сервера A)

```
GET  /health                  # Healthcheck → {"ok": true}
POST /api/che168/changes      # Приём батча изменений (x-api-key)
```

## Установка и запуск

### Предварительные требования
- Node.js >= 20.0.0
- PostgreSQL 16
- Nginx
- PM2 (`npm install -g pm2`)

### Backend

```bash
cd backend
npm install
pm2 start index.js --name backend -i 5
```

### Frontend

```bash
# Development
cd frontend/client
npm install
npm run dev

# Production сборка и деплой (единственный способ деплоя)
bash frontend/production/deploy.sh
```

### Database Services

```bash
# Пересчёт каталога (Korea + China)
cd database/auto-webcatalog-recalc
npm install
pm2 start ecosystem.config.cjs

# Parser API
cd database/parser-api
npm install
pm2 start carApi_v2.js --name parser-api-v2

# Che168 Receiver
cd database/che168-api
npm install
pm2 start ecosystem.config.cjs
```

## Конфигурация

### Переменные окружения (.env в корне проекта)

```env
# База данных
DATABASE_URL=postgresql://encaruser:***@localhost:5432/encar_local_db

# Telegram (уведомления от auto-recalc)
TELEGRAM_TOKEN=***
TELEGRAM_CHAT_ID=***

# Telegram бот (заявки с сайта)
TG_BOT_TOKEN=***
TG_CHAT_IDS=***

# OpenAI (поиск HP, fallback)
CHATGPT_API=***

# Backend
PORT=3000
NODE_ENV=production

# Che168 Receiver
RECEIVER_PORT=4100
RECEIVER_API_KEY=***
```

## Мониторинг

```bash
# Статус всех сервисов
pm2 ls

# Логи конкретного сервиса
pm2 logs backend --lines 50
pm2 logs auto-recalc --lines 50
pm2 logs che168-receiver --lines 50

# Healthcheck Che168 receiver
curl http://localhost:4100/health

# Количество записей в каталоге
psql -U encaruser -d encar_local_db -c "
  SELECT source, COUNT(*) FROM auto_webcatalog GROUP BY source;
"

# Количество строк в агрегированной таблице моделей
psql -U encaruser -d encar_local_db -c "
  SELECT COUNT(DISTINCT (brand, model)) FROM auto_models_agg;
"
```

## Особенности фронтенда

### Atomic Design

- **Atoms**: Button, Input, Badge, Icon, PriceTag, Skeleton, FavoritesButton
- **Molecules**: Select, CreditCalculator, DeliveryToCity, PriceRange, YearMonthRange,
  MileageRange, SortSelect, Pagination, FavoritesPopover, LeadModal, Hint,
  SourceSelector, PriceCalculationPopover, CtaBanner, SpecList, ShowMoreButton,
  LocationSection, CarInfo, FloatingFavoritesButton, FavoriteToggle, TradeInButton
- **Organisms**: CarCard, ModelCard, CarGrid, ModelGrid, Header, Footer, FiltersAside,
  CarGallery, PhotoGallery, FinanceBlock, CarSummary, RelatedCars, YouMayAlsoLike,
  MapPlaceholder
- **Templates**: CarDetailTemplate

### Режимы каталога

- **Объявления** — постраничный список `CarCard` с полными данными по каждому авто
- **Модели** — агрегированный список `ModelCard`: данные из `auto_models_agg`, 4 фото-превью, диапазоны цен/года/HP, типы топлива. Недоступен при выбранных фильтрах `model`, `generation`, `type`.

### Оптимизации

- React Query кэширование (иерархия фильтров в `localStorage` на 24 ч.)
- Pre-aggregated данные для режима "Модели" (запрос ~150-200 мс вместо 3+ сек)
- Ленивая загрузка изображений (`loading="lazy"`, `referrerPolicy="no-referrer"`)
- Memoization критичных вычислений

## Безопасность

- HTTPS only (Nginx + Let's Encrypt)
- Helmet для HTTP-заголовков
- CSP (Content Security Policy)
- CORS настроен
- Rate limiting на API
- UFW — ограничение доступа по портам
- API-ключ для межсерверной синхронизации
- Секреты в `.env` (приватный репозиторий)

## Лицензия

Private — All rights reserved © 2024-2026 Tamx

---

**Последнее обновление**: 7 марта 2026
