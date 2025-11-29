# Tarasov Auto Frontend - Production Deployment

Готовая production конфигурация для развертывания Tarasov Auto Frontend на VDS.

## Быстрый старт

### 1. Подготовка сервера

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm nginx

# CentOS/RHEL
sudo yum install -y nodejs npm nginx

# Установка PM2 глобально
sudo npm install -g pm2
```

### 2. Автоматический деплой

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd <project-directory>

# Запустите деплой
./production/deploy.sh
```

### 3. Проверка

```bash
# Проверьте статус PM2
pm2 status

# Проверьте работу приложения
curl http://localhost:8000/health

# Проверьте логи
pm2 logs tarasov-auto-frontend
```

## Ручной деплой

### 1. Сборка проекта

```bash
# Из корня проекта
npm install

# Скопируйте production переменные окружения
cp .env.production .env.local

# Соберите проект
npm run build
```

### 2. Установка production зависимостей

```bash
cd production
npm install --only=production
```

### 3. Запуск через PM2

```bash
# Запуск приложения
pm2 start ecosystem.config.cjs --env production

# Сохранение конфигурации
pm2 save

# Автозапуск при перезагрузке сервера
pm2 startup
```

### 4. Настройка Nginx

```bash
# Скопируйте конфигурацию
sudo cp nginx.conf /etc/nginx/sites-available/cars.tarasov-auto.ru
sudo ln -s /etc/nginx/sites-available/cars.tarasov-auto.ru /etc/nginx/sites-enabled/

# Отредактируйте пути и SSL сертификаты
sudo nano /etc/nginx/sites-available/cars.tarasov-auto.ru

# Проверьте конфигурацию и перезагрузите
sudo nginx -t
sudo systemctl reload nginx
```

## Управление приложением

### PM2 команды

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs tarasov-auto-frontend

# Перезапуск
pm2 restart tarasov-auto-frontend

# Остановка
pm2 stop tarasov-auto-frontend

# Удаление из PM2
pm2 delete tarasov-auto-frontend

# Мониторинг в реальном времени
pm2 monit
```

### Логи

```bash
# Логи приложения
tail -f production/logs/combined.log

# Логи ошибок
tail -f production/logs/error.log

# Системные логи PM2
pm2 logs --lines 100
```

## Структура файлов

```
production/
├── server.js              # Express сервер для статики
├── ecosystem.config.cjs    # PM2 конфигурация
├── package.json           # Production зависимости и скрипты
├── deploy.sh              # Скрипт автоматического деплоя
├── nginx.conf             # Пример конфигурации Nginx
├── logs/                  # Директория для логов PM2
└── README.md              # Эта документация
```

## Переменные окружения

Проект использует `.env.production` для production переменных:

- `VITE_API_BASE_URL` - URL API сервера (https://api.tarasov-auto.ru)
- `NODE_ENV` - окружение (production)
- `PORT` - порт для Express сервера (8000)

## Мониторинг и обслуживание

### Health Check

Приложение предоставляет endpoint для проверки работоспособности:

```bash
curl http://localhost:8000/health
```

Ответ:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "env": "production"
}
```

### Обновление приложения

```bash
# Получите новый код
git pull origin main

# Пересоберите и перезапустите
./production/deploy.sh
```

### Бэкап и восстановление

```bash
# Создание бэкапа конфигурации PM2
pm2 save

# Восстановление после сбоя
pm2 resurrect
```

## Безопасность

### Express сервер
- Helmet для безопасных заголовков
- CSP политики для защиты от XSS
- Сжатие ответов
- Правильное кэширование статики

### Nginx
- HTTPS редиректы
- Безопасные заголовки
- Защита от DDoS
- Оптимизация статики

## Troubleshooting

### Проблемы с запуском

1. Проверьте порт:
   ```bash
   sudo netstat -tlnp | grep :8000
   ```

2. Проверьте логи:
   ```bash
   pm2 logs tarasov-auto-frontend --lines 50
   ```

3. Проверьте права доступа:
   ```bash
   ls -la production/
   ```

### Проблемы с производительностью

1. Мониторинг ресурсов:
   ```bash
   pm2 monit
   htop
   ```

2. Настройка количества инстансов:
   ```javascript
   // В ecosystem.config.cjs
   instances: 'max' // или конкретное число
   ```

### Проблемы с API

1. Проверьте доступность API:
   ```bash
   curl https://api.tarasov-auto.ru/health
   ```

2. Проверьте переменные окружения:
   ```bash
   cat .env.production
   ```

## Поддержка

При возникновении проблем:

1. Проверьте логи приложения и PM2
2. Убедитесь в правильности конфигурации Nginx
3. Проверьте доступность внешнего API
4. Проверьте системные ресурсы (RAM, CPU, диск)

Для получения помощи создайте issue с:
- Описанием проблемы
- Логами из PM2
- Информацией о системе
- Шагами для воспроизведения
