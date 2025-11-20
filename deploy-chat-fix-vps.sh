#!/bin/bash
# Деплой исправлений чата и интерфейса на VPS

set -e

VPS_HOST="185.166.197.49"
VPS_USER="root"
VPS_PATH="/var/www/spor3s-app"

echo "🚀 Деплой исправлений чата и интерфейса на VPS"
echo "═══════════════════════════════════════"
echo ""

# Проверка подключения
echo "📡 Проверка подключения к VPS..."
if ! ssh -o ConnectTimeout=10 $VPS_USER@$VPS_HOST "echo '✅ Подключено успешно'" 2>/dev/null; then
    echo "❌ Не удается подключиться к VPS $VPS_HOST"
    echo "Проверьте SSH ключи и доступность сервера"
    exit 1
fi

echo ""
echo "📤 Копирование исправленных файлов..."

# 1. Копируем исправленный компонент чата
echo "1. Компонент чата (chat.tsx)..."
scp spor3s-app/app/\(client\)/chat.tsx $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/\(client\)/chat.tsx

# 2. Копируем исправленную главную страницу
echo "2. Главная страница (page.tsx)..."
scp spor3s-app/app/\(client\)/page.tsx $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/\(client\)/page.tsx

# 3. Копируем исправленный AppClient
echo "3. AppClient компонент..."
scp spor3s-app/app/\(client\)/AppClient.tsx $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/\(client\)/AppClient.tsx

# 4. Копируем исправленный supabase клиент
echo "4. Supabase клиент..."
scp spor3s-app/lib/supabase.ts $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/lib/supabase.ts

# 5. Копируем CartContext
echo "5. CartContext..."
scp spor3s-app/app/CartContext.tsx $VPS_USER@$VPS_HOST:$VPS_PATH/spor3s-app/app/CartContext.tsx

echo ""
echo "🏗️ Пересборка и перезапуск на VPS..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    set -e
    cd /var/www/spor3s-app
    
    echo ""
    echo "📦 Очистка кэша Next.js..."
    rm -rf .next
    
    echo ""
    echo "📦 Установка зависимостей (если нужно)..."
    npm install --production=false || echo "⚠️ npm install пропущен"
    
    echo ""
    echo "🏗️ Сборка Next.js приложения..."
    npm run build || {
        echo "❌ Ошибка сборки!"
        echo "Проверьте логи выше"
        exit 1
    }
    
    echo ""
    echo "🔄 Перезапуск Next.js приложения..."
    pm2 restart spor3s-nextjs || pm2 start npm --name "spor3s-nextjs" -- start
    
    echo ""
    echo "⏳ Ожидание запуска (5 сек)..."
    sleep 5
    
    echo ""
    echo "📊 Статус процессов:"
    pm2 status
    
    echo ""
    echo "📝 Последние логи Next.js:"
    pm2 logs spor3s-nextjs --lines 30 --nostream || echo "⚠️ Логи недоступны"
ENDSSH

echo ""
echo "═══════════════════════════════════════"
echo "✅ Деплой завершен!"
echo ""
echo "🧪 Проверка работы:"
echo ""
echo "  1. Откройте https://ai.spor3s.ru"
echo "  2. Проверьте работу кнопок навигации"
echo "  3. Проверьте работу чата"
echo "  4. Проверьте добавление товаров в корзину"
echo ""
echo "📊 Для проверки статуса на VPS:"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 status'"
echo ""
echo "📋 Для просмотра логов:"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 logs spor3s-nextjs'"
echo ""

