#!/bin/bash
# Применить финальный фикс на VPS

VPS_HOST="185.166.197.49"
VPS_USER="root"
VPS_PATH="/var/www/spor3s-app"

echo "🚀 Применение финального фикса против повторений"
echo "═══════════════════════════════════════════════════"

echo ""
echo "📤 Копирование обновленных файлов..."

# Копируем все обновленные файлы
scp spor3s-app/app/api/ai/route.ts $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/api/ai/
scp spor3s-app/lib/contentManager.ts $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/lib/
scp spor3s-app/app/ai/scenarios.ts $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/ai/
scp tg-bot/bot.ts $VPS_USER@$VPS_HOST:$VPS_PATH/tg-bot/
scp -r "spor3s-app/app/(client)/chat.tsx" $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/\(client\)/

echo ""
echo "🏗️ Пересборка на VPS..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    cd /var/www/spor3s-app
    
    echo "📦 Building Next.js..."
    npm run build
    
    echo ""
    echo "🔄 Перезапуск всех агентов..."
    pm2 restart all
    
    echo ""
    echo "⏳ Ждем запуска..."
    sleep 5
    
    echo ""
    echo "📊 Статус:"
    pm2 status
    
    echo ""
    echo "📝 Последние логи:"
    pm2 logs --lines 30 --nostream
ENDSSH

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Фикс применен!"
echo ""
echo "🧪 ТЕСТИРОВАНИЕ:"
echo ""
echo "  Telegram Bot:"
echo "    1. Открой @spor3s_bot"
echo "    2. Напиши: 'хочу ежовик'"
echo "    3. Затем: 'порошок'"
echo ""
echo "  ✅ Ожидается:"
echo "    Бот продолжит про ежовик БЕЗ:"
echo "    - ❌ 'Привет!'"
echo "    - ❌ 'Я консультант СПОРС'"
echo "    - ❌ Списка всех продуктов"
echo ""
echo "📋 Не забудь обновить промпт в Supabase:"
echo "  https://supabase.com/dashboard → SQL Editor"
echo "  Выполни: update_ai_prompt_strict.sql"
echo ""
echo "📊 Проверить логи:"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 logs spor3s-bot --lines 100'"

