#!/bin/bash
# Быстрое обновление AI чата на VPS

VPS_HOST="185.166.197.49"
VPS_USER="root"
VPS_PATH="/var/www/spor3s-app"

echo "🔧 Обновление AI чата на VPS..."
echo "═══════════════════════════════════════"

# Копируем исправленные файлы
echo "📤 Копирование файлов..."

scp spor3s-app/app/api/ai/route.ts $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/api/ai/
scp spor3s-app/lib/contentManager.ts $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/lib/

echo ""
echo "🔄 Перезапуск агентов..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    cd /var/www/spor3s-app
    
    # Перезапуск Next.js и бота
    pm2 restart spor3s-nextjs
    pm2 restart spor3s-bot
    
    echo ""
    echo "📊 Статус:"
    pm2 status
    
    echo ""
    echo "📝 Последние логи бота:"
    pm2 logs spor3s-bot --lines 20 --nostream
ENDSSH

echo ""
echo "═══════════════════════════════════════"
echo "✅ Обновление завершено!"
echo ""
echo "🧪 Тестирование:"
echo "  1. Напиши боту: 'хочу ежовик'"
echo "  2. Затем: 'порошок'"
echo "  3. Проверь что бот продолжает разговор без повторов"
echo ""
echo "📋 Не забудь обновить промпт в Supabase:"
echo "  https://supabase.com/dashboard → SQL Editor"
echo "  Выполни: update_ai_prompt_human.sql"

