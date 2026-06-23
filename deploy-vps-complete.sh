#!/bin/bash
# Полный деплой всех агентов spor3s на VPS

set -e

echo "🚀 Деплой spor3s на VPS"
echo "═══════════════════════════════════════"

VPS_HOST="185.166.197.49"
VPS_USER="root"
VPS_PATH="/var/www/spor3s-app"

echo "📡 Подключение к VPS: $VPS_HOST"

# Проверка подключения
if ! ssh $VPS_USER@$VPS_HOST "echo 'Подключено успешно'"; then
    echo "❌ Не удается подключиться к VPS"
    exit 1
fi

echo ""
echo "1️⃣ Копирование файлов на VPS..."

# Создаем архив проекта
tar -czf spor3s-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=tg-bot/node_modules \
    --exclude=.git \
    --exclude=*.log \
    --exclude=*.out \
    --exclude=*.err \
    .

# Копируем на VPS
scp spor3s-deploy.tar.gz $VPS_USER@$VPS_HOST:/tmp/

echo ""
echo "2️⃣ Распаковка на VPS..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    set -e
    
    # Создаем директорию если не существует
    mkdir -p /var/www/spor3s-app
    
    # Распаковываем
    cd /var/www/spor3s-app
    tar -xzf /tmp/spor3s-deploy.tar.gz
    rm /tmp/spor3s-deploy.tar.gz
    
    echo "✅ Файлы распакованы"
ENDSSH

echo ""
echo "3️⃣ Настройка окружения на VPS..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    set -e
    cd /var/www/spor3s-app
    
    # Устанавливаем Node.js если нужно
    if ! command -v node &> /dev/null; then
        echo "📦 Установка Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    # Устанавливаем PM2 глобально
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Установка PM2..."
        npm install -g pm2
    fi
    
    # Копируем env-production в .env если не существует
    if [ ! -f .env ]; then
        if [ -f env-production ]; then
            cp env-production .env
            echo "✅ Создан .env из env-production"
        else
            echo "⚠️ Файл env-production не найден"
        fi
    fi
    
    echo "✅ Окружение настроено"
ENDSSH

echo ""
echo "4️⃣ Установка зависимостей..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    set -e
    cd /var/www/spor3s-app
    
    # Основной проект
    echo "📦 Установка зависимостей основного проекта..."
    npm install --production
    
    # tg-bot
    if [ -f tg-bot/package.json ]; then
        echo "📦 Установка зависимостей tg-bot..."
        cd tg-bot
        npm install --production
        cd ..
    fi
    
    echo "✅ Зависимости установлены"
ENDSSH

echo ""
echo "5️⃣ Сборка Next.js приложения..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    set -e
    cd /var/www/spor3s-app
    
    echo "🏗️ Сборка Next.js..."
    npm run build
    
    echo "✅ Сборка завершена"
ENDSSH

echo ""
echo "6️⃣ Запуск всех агентов..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    set -e
    cd /var/www/spor3s-app
    
    # Останавливаем старые процессы
    pm2 delete all || true
    
    # Запускаем через ecosystem.config.js
    pm2 start ecosystem.config.js
    
    # Сохраняем конфигурацию
    pm2 save
    
    # Настраиваем автозапуск
    pm2 startup || true
    
    echo "✅ Все агенты запущены"
    
    # Показываем статус
    pm2 status
ENDSSH

echo ""
echo "═══════════════════════════════════════"
echo "✅ Деплой завершен!"
echo ""
echo "📊 Проверка статуса на VPS:"
echo "  ssh $VPS_USER@$VPS_HOST 'cd $VPS_PATH && pm2 status'"
echo ""
echo "📋 Логи:"
echo "  ssh $VPS_USER@$VPS_HOST 'cd $VPS_PATH && pm2 logs'"
echo ""
echo "🌐 Приложение доступно на:"
echo "  http://$VPS_HOST:3000"

# Удаляем локальный архив
rm -f spor3s-deploy.tar.gz

