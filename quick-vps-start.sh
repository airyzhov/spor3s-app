#!/bin/bash
# Быстрый запуск всех агентов на VPS через SSH

VPS_HOST="185.166.197.49"
VPS_USER="root"

echo "🚀 Запуск всех агентов spor3s на VPS"
echo "═══════════════════════════════════════"

# Выполняем команды на VPS
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    cd /var/www/spor3s-app || exit 1
    
    echo "📦 Обновление кода..."
    git pull || echo "⚠️ Git pull пропущен"
    
    echo ""
    echo "📋 Копирование .env для VPS..."
    if [ -f .env.vps ]; then
        cp .env.vps .env
        cp .env.vps tg-bot/.env
        cp .env.vps tg-client/.env.local
        echo "✅ .env обновлен"
    else
        echo "⚠️ Файл .env.vps не найден, используем существующий .env"
    fi
    
    echo ""
    echo "🔄 Перезапуск всех агентов..."
    pm2 restart all || pm2 start ecosystem.config.js
    
    echo ""
    echo "📊 Статус агентов:"
    pm2 status
    
    echo ""
    echo "📝 Последние логи:"
    pm2 logs --lines 20 --nostream
ENDSSH

echo ""
echo "═══════════════════════════════════════"
echo "✅ Команды выполнены!"
echo ""
echo "📊 Для проверки статуса:"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 status'"
echo ""
echo "📋 Для просмотра логов:"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 logs'"

