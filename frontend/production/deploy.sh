#!/bin/bash

# Tarasov Auto Frontend Deployment Script
set -e

PROJECT_NAME="tarasov-auto-frontend"

echo "🚀 Starting deployment for $PROJECT_NAME..."

# Переходим в корневую директорию проекта
cd "$(dirname "$0")/.."

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed!"
    exit 1
fi

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not installed!"
    exit 1
fi

# Устанавливаем зависимости для сборки
echo "📦 Installing build dependencies..."
npm install --legacy-peer-deps
echo "✅ Build dependencies installed."

# Собираем проект с production переменными окружения
echo "🔨 Building project for production..."
npm run build:production
echo "✅ Frontend build complete."

# Переходим в production директорию
cd production

# Создаем директорию для логов если её нет
mkdir -p logs

# Устанавливаем production зависимости
echo "📦 Installing production dependencies..."
npm install --only=production
echo "✅ Production dependencies installed."

# Проверяем наличие PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Останавливаем старую версию (если есть)
echo "🛑 Stopping old version..."
pm2 delete $PROJECT_NAME 2>/dev/null || true

# Запускаем новую версию
echo "🚀 Starting new version..."
pm2 start ecosystem.config.cjs --env production

# Сохраняем конфигурацию PM2
pm2 save

# Настраиваем автозапуск PM2 (выполняется один раз)
pm2 startup

echo "✅ Deployment completed successfully!"
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs $PROJECT_NAME"
echo "🏥 Health check: curl http://localhost:8000/health"
echo "🌍 Application available at: http://localhost:8000"
