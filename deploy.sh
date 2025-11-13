#!/bin/bash
# Скрипт деплоя для выполнения на VPS
# Используется GitHub Actions или может быть запущен вручную

set -e

VPS_PATH="/var/www/spor3s-app"

echo "🚀 Деплой spor3s-app"
echo "═══════════════════════════════════════"

cd "$VPS_PATH" || {
    echo "❌ Директория $VPS_PATH не найдена"
    exit 1
}

echo "📦 Обновление кода из GitHub..."
git fetch origin
git reset --hard origin/main
git clean -fd

echo "📋 Проверка .env файла..."
if [ ! -f .env ]; then
    if [ -f .env.vps ]; then
        cp .env.vps .env
        echo "✅ Скопирован .env.vps в .env"
    elif [ -f env-production ]; then
        cp env-production .env
        echo "✅ Скопирован env-production в .env"
    else
        echo "⚠️ Файл .env не найден, создайте его вручную"
    fi
fi

# Копируем .env в подпроекты
if [ -f .env ]; then
    cp .env tg-bot/.env 2>/dev/null || true
    cp .env tg-client/.env.local 2>/dev/null || true
    echo "✅ .env скопирован в подпроекты"
fi

echo "📦 Установка зависимостей основного проекта..."
npm ci --production=false || npm install

echo "📦 Установка зависимостей tg-bot..."
if [ -f tg-bot/package.json ]; then
    cd tg-bot
    npm ci --production=false || npm install
    cd ..
fi

echo "📦 Установка зависимостей tg-client..."
if [ -f tg-client/package.json ]; then
    cd tg-client
    npm ci --production=false || npm install
    cd ..
fi

echo "🏗️ Сборка Next.js приложения..."
npm run build

echo "🔄 Перезапуск PM2 процессов..."
# Останавливаем старые процессы
pm2 delete all || true

# Запускаем через ecosystem.config.js
pm2 start ecosystem.config.js

# Сохраняем конфигурацию
pm2 save

echo "📊 Статус процессов:"
pm2 status

echo ""
echo "═══════════════════════════════════════"
echo "✅ Деплой завершен успешно!"
echo "🌐 Приложение доступно на: https://ai.spor3s.ru"
