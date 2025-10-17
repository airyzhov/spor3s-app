#!/bin/bash
# БЫСТРЫЙ ДЕПЛОЙ УЛУЧШЕННОГО БОТА

echo "🚀 ДЕПЛОЙ УЛУЧШЕННОГО БОТА"
echo "=========================="
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

# Запуск улучшенного бота
echo "🚀 Запуск улучшенного бота..."
pm2 start improved-bot.js --name "spor3s-bot-improved"

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
pm2 logs spor3s-bot-improved --lines 10 --nostream

echo ""
echo "🎉 УЛУЧШЕННЫЙ БОТ ЗАПУЩЕН!"
echo ""
echo "💡 Команды:"
echo "   pm2 logs spor3s-bot-improved    - просмотр логов"
echo "   pm2 restart spor3s-bot-improved  - перезапуск"
echo "   pm2 stop spor3s-bot-improved    - остановка"
echo ""
echo "📱 Протестируйте бота в Telegram: @spor3s_bot"
echo "   /start"
echo "   привет"
echo "   есть ежовик?"
echo "   /help"
echo "   /my_coins"
echo ""

