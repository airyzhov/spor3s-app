#!/bin/bash
# БЫСТРЫЙ СТАРТ БОТА НА VPS - ВЫПОЛНИТЕ НА СЕРВЕРЕ

echo "🚀 БЫСТРЫЙ ЗАПУСК @spor3s_bot"
echo "=============================="
echo ""

# Переход в директорию проекта
cd /root/spor3s-app/spor3s-app 2>/dev/null || cd /var/www/spor3s-app/spor3s-app 2>/dev/null || {
    echo "❌ Директория проекта не найдена"
    echo "Попробуйте: cd /path/to/spor3s-app/spor3s-app"
    exit 1
}

echo "✅ Директория: $(pwd)"
echo ""

# Получение обновлений
echo "📥 Получение обновлений из GitHub..."
git pull origin main

echo ""

# Остановка старых процессов
echo "🛑 Остановка старых процессов..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null

echo ""

# Запуск бота
echo "🚀 Запуск бота..."
pm2 start final-bot-fix.js --name "spor3s-bot"

echo ""

# Сохранение конфигурации
echo "💾 Сохранение конфигурации..."
pm2 save

echo ""

# Просмотр статуса
echo "📊 СТАТУС БОТА:"
pm2 list

echo ""
echo "📝 ПОСЛЕДНИЕ ЛОГИ:"
pm2 logs spor3s-bot --lines 10 --nostream

echo ""
echo "🎉 БОТ ЗАПУЩЕН!"
echo ""
echo "💡 Команды:"
echo "   pm2 logs spor3s-bot    - просмотр логов"
echo "   pm2 restart spor3s-bot - перезапуск"
echo "   pm2 stop spor3s-bot    - остановка"
echo ""
echo "📱 Протестируйте бота в Telegram: @spor3s_bot"
echo "   /start"
echo "   привет"
echo "   есть ежовик?"
echo ""

