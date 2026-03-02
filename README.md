# Tamx Auto — Каталог автомобилей из Кореи и Китая

Полнофункциональная платформа для продажи автомобилей с автоматическим расчётом растаможки, кредитным калькулятором, интеграцией с Encar (Корея) и Che168 (Китай).

## О проекте

**Tamx Auto** — full-stack веб-приложение для каталога автомобилей:
- Просмотр каталога из Кореи (Encar) и Китая (Che168)
- Автоматический расчёт стоимости растаможки и логистики
- Кредитный калькулятор для расчёта ежемесячных платежей
- Фильтрация по множеству параметров (бренд, модель, год, цена, пробег и др.)
- Сохранение избранных автомобилей
- Отправка заявок на покупку

**Сайт**: https://auto.tamx.ru
**API**: https://api.tamx.ru

## Архитектура проекта

```
tarasov-auto/
├── .env                    # Общие переменные окружения (DATABASE_URL, токены)
│
├── backend/                # Express API сервер (:3000)
│   ├── index.js            # Точка входа
│   └── components/         # Обработчики маршрутов
│       ├── getFilteredCars.js
│       ├── getCarDetails.js
│       ├── getFilters.js
│       ├── deliveryCost.js
│       ├── heroCard.js
│       ├── horsePower.js
│       └── submitLead.js
│
├── frontend/               # React SPA приложение (:8000)
│   ├── client/
│   │   └── src/
│   │       ├── components/     # UI компоненты (Atomic Design)
│   │       │   ├── atoms/          # Button, Input, Badge, Icon, FavoritesButton
│   │       │   ├── molecules/      # CreditCalculator, DeliveryToCity, LocationSection
│   │       │   ├── organisms/      # CarCard, CarGrid, Header, Footer, FiltersAside
│   │       │   └── templates/      # CarDetailTemplate
│   │       ├── hooks/          # useCars, useFavorites, useHierarchicalFilters
│   │       ├── lib/            # API клиент, утилиты, форматирование, финансы
│   │       ├── pages/          # CarDetailPage, CatalogPage, NotFound
│   │       └── types/          # TypeScript типы
│   └── production/         # Production-сервер (PM2, cluster mode)
│       ├── server.js
│       └── ecosystem.config.cjs
│
└── database/               # Сервисы работы с данными
    ├── encar-webcatalog-recalc/    # Пересчёт каталога и поиск HP
    │   └── src/
    │       ├── index_v2.js             # Основной воркер (PM2: encar-recalc-v2)
    │       ├── components/             # calculateBatch, fetchData, hpSearchService
    │       ├── lib/                    # panAutoApi, openaiApi, koreanMapping
    │       └── utils/                  # dbClient, logger, telegramNotifier
    │
    ├── parser-api/                 # API для парсера данных (:4000)
    │   ├── carApi_v2.js                # Основной сервер (PM2: parser-api-v2)
    │   └── deliveryCost/               # Данные стоимости доставки
    │
    └── che168-api/                 # Receiver синхронизации Che168 (:4100)
        ├── ecosystem.config.cjs        # PM2 конфиг (PM2: che168-receiver)
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
| `tarasov-auto-frontend` | 8000 | cluster (8) | SSR/SPA React-приложение |
| `parser-api-v2` | 4000 | fork | API для парсера Encar |
| `encar-recalc-v2` | — | fork | Фоновый пересчёт каталога и HP |
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
| `encar_db_prod` | Основной каталог автомобилей (Encar, Корея) |
| `encar_webcatalog` | Пересчитанный каталог с растаможкой |
| `che168_autoparser` | Каталог автомобилей (Che168, Китай) |
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
- **TailwindCSS 3** (стили)
- **Radix UI** (доступные UI-компоненты)
- **React Query** (серверное состояние и кэширование)
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

## Синхронизация Che168 (Сервер A → Сервер B)
- Сервер auto.tamx принимает и применяет изменения через UPSERT/DELETE
- Авторизация: заголовок `x-api-key`
- Порт 4100 открыт только для IP Сервера A

## API Endpoints

### Backend API (api.tamx.ru)

GET  /catalog          # Список автомобилей с фильтрами
GET  /car/:id          # Детали автомобиля
GET  /filters          # Опции фильтров
GET  /herocard         # Карточка для главной страницы
GET  /deliveryCost     # Стоимость доставки
GET  /hp               # Поиск лошадиных сил
POST /hp               # Поиск лошадиных сил (POST)
POST /lead             # Отправка заявки
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
cd frontend
pnpm install
pnpm dev

# Production сборка и деплой
pnpm build:production
cd production
npm install
pm2 start ecosystem.config.cjs --env production
```

### Database Services

```bash
# Пересчёт каталога
cd database/encar-webcatalog-recalc
npm install
pm2 start src/index_v2.js --name encar-recalc-v2

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

# Telegram (уведомления)
TELEGRAM_TOKEN=***
TELEGRAM_CHAT_ID=***

# Telegram бот
TG_BOT_TOKEN=***
TG_CHAT_IDS=***

# OpenAI (поиск HP)
CHATGPT_API=***

# Backend
PORT=3000
NODE_ENV=production

# Che168 Receiver (опционально)
RECEIVER_PORT=4100
RECEIVER_API_KEY=***
```

## Мониторинг

```bash
# Статус всех сервисов
pm2 ls

# Логи конкретного сервиса
pm2 logs backend --lines 50
pm2 logs che168-receiver --lines 50

# Healthcheck Che168 receiver
curl http://localhost:4100/health

# Количество записей в каталогах
psql -U encaruser -d encar_local_db -c "
  SELECT 'encar_db_prod' as table_name, COUNT(*) FROM encar_db_prod
  UNION ALL
  SELECT 'che168_autoparser', COUNT(*) FROM che168_autoparser;
"
```

## Особенности фронтенда

### Atomic Design
- **Atoms**: Button, Input, Badge, Icon, FavoritesButton, PriceTag, Skeleton
- **Molecules**: CreditCalculator, DeliveryToCity, FavoritesPopover, LocationSection
- **Organisms**: CarCard, CarGrid, Header, Footer, FiltersAside, CarGallery, FinanceBlock
- **Templates**: CarDetailTemplate

### Оптимизации
- Code splitting (React.lazy)
- Image optimization (WebP)
- React Query caching
- localStorage для фильтров и избранного
- Debouncing для поиска
- Memoization критичных вычислений

## Безопасность

- HTTPS only (Nginx + Let's Encrypt)
- Helmet для HTTP-заголовков
- CSP (Content Security Policy)
- XSS защита
- CORS настроен
- Rate limiting на API
- UFW — ограничение доступа по портам
- API-ключ для межсерверной синхронизации
- Секреты в `.env` (приватный репозиторий)

## Лицензия

Private — All rights reserved © 2024-2026 Tamx

---

**Последнее обновление**: 12 февраля 2026
