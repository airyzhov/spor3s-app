#!/bin/bash
# Деплой исправлений контекста для всех чатов на VPS

VPS_HOST="185.166.197.49"
VPS_USER="root"
VPS_PATH="/var/www/spor3s-app"

echo "🚀 Деплой исправлений контекста на VPS"
echo "═══════════════════════════════════════"

echo ""
echo "📤 Копирование файлов..."

# 1. Копируем AI API route
echo "1. AI API route..."
scp spor3s-app/app/api/ai/route.ts $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/api/ai/

# 2. Копируем contentManager
echo "2. contentManager..."
scp spor3s-app/lib/contentManager.ts $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/lib/

# 3. Копируем Telegram bot
echo "3. Telegram bot..."
scp tg-bot/bot.ts $VPS_USER@$VPS_HOST:$VPS_PATH/tg-bot/

# 4. Копируем Mini App chat
echo "4. Mini App chat..."
scp -r "spor3s-app/app/(client)/chat.tsx" $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/\(client\)/

echo ""
echo "🏗️ Пересборка и перезапуск на VPS..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    cd /var/www/spor3s-app
    
    echo ""
    echo "📦 Сборка Next.js..."
    npm run build
    
    echo ""
    echo "🔄 Перезапуск всех агентов..."
    pm2 restart spor3s-nextjs
    pm2 restart spor3s-bot
    
    echo ""
    echo "⏳ Ждем запуска (5 сек)..."
    sleep 5
    
    echo ""
    echo "📊 Статус агентов:"
    pm2 status
    
    echo ""
    echo "📝 Последние логи:"
    pm2 logs --lines 30 --nostream
ENDSSH

echo ""
echo "═══════════════════════════════════════"
echo "✅ Деплой завершен!"
echo ""
echo "🧪 Тестирование:"
echo ""
echo "  Telegram Bot (@spor3s_bot):"
echo "    1. Напиши: 'хочу ежовик'"
echo "    2. Затем: 'порошок'"
echo "    3. Проверь: бот продолжает разговор про ежовик"
echo ""
echo "  Mini App (t.me/spor3s_bot):"
echo "    1. Напиши: 'что помогает со сном?'"
echo "    2. Затем: 'а в капсулах есть?'"
echo "    3. Проверь: бот понимает что речь о мухоморе"
echo ""
echo "📋 Проверить логи:"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 logs spor3s-bot --lines 50'"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 logs spor3s-nextjs --lines 50'"

