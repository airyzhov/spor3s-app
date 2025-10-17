#!/bin/bash
# Скрипт деплоя бота на VPS через SSH

echo "🚀 ДЕПЛОЙ БОТА НА VPS"
echo "===================="
echo ""

# 1. Переход в директорию проекта на VPS
cd /root/spor3s-app/spor3s-app || cd /var/www/spor3s-app/spor3s-app || exit 1

echo "📁 Текущая директория: $(pwd)"
echo ""

# 2. Получаем обновления из GitHub
echo "📥 Получение обновлений из GitHub..."
git pull origin main

echo ""

# 3. Устанавливаем зависимости
echo "📦 Установка зависимостей..."
npm install

echo ""

# 4. Останавливаем старые процессы
echo "🛑 Остановка старых процессов..."
pm2 stop spor3s-bot 2>/dev/null || true
pm2 stop spor3z-agent 2>/dev/null || true
pm2 delete spor3s-bot 2>/dev/null || true
pm2 delete spor3z-agent 2>/dev/null || true

echo ""

# 5. Запускаем новый бот
echo "🚀 Запуск бота..."
pm2 start final-bot-fix.js --name "spor3s-bot"

echo ""

# 6. Сохраняем конфигурацию PM2
echo "💾 Сохранение конфигурации PM2..."
pm2 save

echo ""

# 7. Настраиваем автозапуск
echo "⚙️  Настройка автозапуска..."
pm2 startup

echo ""

# 8. Показываем статус
echo "📊 Статус процессов:"
pm2 list

echo ""

# 9. Показываем последние логи
echo "📝 Последние логи:"
pm2 logs spor3s-bot --lines 10 --nostream

echo ""
echo "🎉 ДЕПЛОЙ ЗАВЕРШЕН!"
echo "===================="
echo ""
echo "💡 Команды управления:"
echo "   pm2 list                - список процессов"
echo "   pm2 logs spor3s-bot     - логи бота"
echo "   pm2 restart spor3s-bot  - перезапуск"
echo "   pm2 stop spor3s-bot     - остановка"
echo ""
echo "📱 Протестируйте бота в Telegram: @spor3s_bot"
echo ""