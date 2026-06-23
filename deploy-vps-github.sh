#!/bin/bash
# Скрипт деплоя spor3s-app на VPS через GitHub
# Использование: ./deploy-vps-github.sh

set -e

echo "🚀 Деплой spor3s-app на VPS через GitHub"
echo "═══════════════════════════════════════"

VPS_HOST="185.166.197.49"
VPS_USER="root"
PROJECT_DIR="/var/www/spor3s-app"

echo "📡 Подключение к VPS: $VPS_HOST"

# Проверка подключения
if ! ssh $VPS_USER@$VPS_HOST "echo 'Подключено успешно'"; then
    echo "❌ Не удается подключиться к VPS"
    exit 1
fi

echo ""
echo "📦 Обновление кода из GitHub..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    set -e
    
    cd /var/www/spor3s-app
    
    # Обновляем код
    if [ -d .git ]; then
        echo "📥 Получение обновлений из GitHub..."
        git fetch origin
        git reset --hard origin/main
        git clean -fd
    else
        echo "❌ Репозиторий Git не найден"
        exit 1
    fi
    
    # Определяем директорию проекта
    BUILD_DIR="/var/www/spor3s-app"
    if [ -d spor3s-app/app ] && [ -f spor3s-app/package.json ]; then
        BUILD_DIR="/var/www/spor3s-app/spor3s-app"
    fi
    
    cd "$BUILD_DIR"
    
    # Проверяем .env.local
    if [ ! -f .env.local ]; then
        if [ -f env.local ]; then
            cp env.local .env.local
            echo "✅ Скопирован env.local в .env.local"
        else
            echo "⚠️ .env.local не найден, создайте его вручную"
            exit 1
        fi
    fi
    
    # Убеждаемся что домен правильный
    if ! grep -q "NEXT_PUBLIC_BASE_URL=https://ai.spor3s.ru" .env.local; then
        if grep -q "NEXT_PUBLIC_BASE_URL" .env.local; then
            sed -i 's|NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=https://ai.spor3s.ru|g' .env.local
        else
            echo "NEXT_PUBLIC_BASE_URL=https://ai.spor3s.ru" >> .env.local
        fi
        echo "✅ Обновлен NEXT_PUBLIC_BASE_URL"
    fi
    
    # Устанавливаем зависимости
    echo "📦 Установка зависимостей..."
    npm ci --production=false
    
    # Очищаем кэш
    echo "🧹 Очистка кэша..."
    rm -rf .next
    rm -rf node_modules/.cache
    
    # Собираем приложение
    echo "🏗️ Сборка Next.js приложения..."
    npm run build
    
    # Перезапускаем PM2
    echo "🔄 Перезапуск PM2..."
    cd /var/www/spor3s-app
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
    pm2 save
    
    echo "✅ Деплой завершен!"
    echo "🌐 Приложение доступно на: https://ai.spor3s.ru"
ENDSSH

echo ""
echo "✅ Деплой успешно завершен!"

