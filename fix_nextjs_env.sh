#!/bin/bash

# =====================================================
# ИСПРАВЛЕНИЕ КОНФИГУРАЦИИ NEXT.JS НА VPS
# Запусти: bash fix_nextjs_env.sh
# =====================================================

echo "🔧 Исправляем конфигурацию Next.js..."

cd /var/www/spor3s-app

# Создаем правильный .env.local с приоритетом переменных
cat > .env.local << 'ENVEOF'
# Supabase Configuration (используем SERVER-SIDE переменные)
NEXT_PUBLIC_SUPABASE_URL=https://hwospkbheqaauluoytvz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs

# Server-side только (для API routes)
SUPABASE_URL=https://hwospkbheqaauluoytvz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTU2NDIwMiwiZXhwIjoyMDY3MTQwMjAyfQ.OpvQj5iNN5sMSP-PhPVtKUWuRT5aORYvOZLEubHaFALc

# OpenRouter API
OPENROUTER_API_KEY=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

# Telegram Configuration
TELEGRAM_BOT_TOKEN=6522297183:AAE60O9EJy8c8SfdbLOsRGb6B06eHYBWLyo
TELEGRAM_API_ID=25152508
TELEGRAM_API_HASH=e6d11fbfdac29ec3f8e9f6eb4dc54385
TELEGRAM_SESSION_STRING=

# App Configuration
NEXT_PUBLIC_BASE_URL=https://ai.spor3s.ru
NEXTAUTH_SECRET=spor3s-secret-key-2024-production
NEXTAUTH_URL=https://ai.spor3s.ru
NODE_ENV=production
ENVEOF

echo "✅ .env.local обновлен"

# Проверяем права доступа
chown -R spor3s:spor3s .env.local
chmod 600 .env.local

echo "✅ Права доступа установлены"

# Перезапускаем Next.js с полной очисткой
echo "🔄 Перезапускаем Next.js..."
pm2 delete spor3s-nextjs 2>/dev/null || true
sleep 2

# Очищаем .next кеш
rm -rf .next
echo "✅ Кеш .next очищен"

# Запускаем заново
cd /var/www/spor3s-app && pm2 start npm --name spor3s-nextjs -- run dev

echo "⏳ Жду 10 секунд для инициализации..."
sleep 10

# Показываем статус
pm2 status

# Показываем последние логи
echo ""
echo "📋 Последние логи:"
pm2 logs spor3s-nextjs --lines 20 --nostream

echo ""
echo "✅ ГОТОВО! Проверь Mini App теперь"

