#!/bin/bash
# Деплой исправлений формы продукта (порошок/капсулы) на VPS

VPS_HOST="185.166.197.49"
VPS_USER="root"
VPS_PATH="/var/www/spor3s-app"

echo "🚀 Деплой исправлений формы продукта на VPS"
echo "═══════════════════════════════════════"

echo ""
echo "📤 Копирование файлов..."

# 1. Копируем AI API route (убрали fallback теги)
echo "1. AI API route..."
scp spor3s-app/app/api/ai/route.ts $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/api/ai/

# 2. Копируем Telegram bot (проверка формы продукта)
echo "2. Telegram bot..."
scp tg-bot/bot.ts $VPS_USER@$VPS_HOST:$VPS_PATH/tg-bot/

# 3. Копируем Mini App chat (проверка формы продукта)
echo "3. Mini App chat..."
scp "spor3s-app/app/(client)/chat.tsx" $VPS_USER@$VPS_HOST:"$VPS_PATH/spor3s-app/app/(client)/"

echo ""
echo "✅ Файлы скопированы"
echo ""
echo "🏗️ Пересборка и перезапуск на VPS..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    cd /var/www/spor3s-app
    
    echo ""
    echo "📦 Сборка Next.js..."
    cd spor3s-app
    npm run build
    
    echo ""
    echo "🔄 Перезапуск всех агентов..."
    pm2 restart spor3s-nextjs --update-env
    pm2 restart spor3s-bot --update-env
    
    echo ""
    echo "⏳ Ждем запуска (5 сек)..."
    sleep 5
    
    echo ""
    echo "📊 Статус агентов:"
    pm2 status
    
    echo ""
    echo "📝 Последние логи бота:"
    pm2 logs spor3s-bot --lines 20 --nostream
    
    echo ""
    echo "📝 Последние логи Next.js:"
    pm2 logs spor3s-nextjs --lines 10 --nostream
ENDSSH

echo ""
echo "═══════════════════════════════════════"
echo "✅ Деплой завершен!"
echo ""
echo "🧪 Тестирование:"
echo ""
echo "  Telegram Bot (@spor3s_bot):"
echo "    1. Напиши: 'ежовик на месяц'"
echo "    2. Должен спросить: 'Порошок или капсулы?'"
echo "    3. Напиши: 'порошок'"
echo "    4. Должен добавить ежовик порошок"
echo ""
echo "  Mini App:"
echo "    1. Напиши: 'хочу мухомор'"
echo "    2. Должен спросить форму"
echo "    3. Напиши: 'капсулы'"
echo "    4. Должен добавить мухомор капсулы"
echo ""

