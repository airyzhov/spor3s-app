#!/bin/bash
# Быстрый деплой бота на VPS

echo "🚀 БЫСТРЫЙ ДЕПЛОЙ БОТА НА VPS"
echo "=============================="

# Проверяем, что мы на VPS
if [ ! -f "/etc/hostname" ]; then
    echo "❌ Этот скрипт нужно запускать на VPS"
    exit 1
fi

echo "📍 Текущая директория: $(pwd)"
echo ""

# 1. Находим проект
echo "1. Поиск проекта..."
PROJECT_DIR=""
if [ -f "final-bot-fix.js" ]; then
    PROJECT_DIR="$(pwd)"
    echo "✅ Проект найден в текущей директории"
elif [ -f "/root/spor3s-app/spor3s-app/final-bot-fix.js" ]; then
    PROJECT_DIR="/root/spor3s-app/spor3s-app"
    echo "✅ Проект найден в /root/spor3s-app/spor3s-app"
elif [ -f "/var/www/spor3s-app/spor3s-app/final-bot-fix.js" ]; then
    PROJECT_DIR="/var/www/spor3s-app/spor3s-app"
    echo "✅ Проект найден в /var/www/spor3s-app/spor3s-app"
else
    echo "❌ Проект не найден. Ищем..."
    PROJECT_DIR=$(find / -name "final-bot-fix.js" 2>/dev/null | head -1 | xargs dirname)
    if [ -n "$PROJECT_DIR" ]; then
        echo "✅ Проект найден в: $PROJECT_DIR"
    else
        echo "❌ Проект не найден. Создайте файл final-bot-fix.js"
        exit 1
    fi
fi

cd "$PROJECT_DIR"
echo "📁 Рабочая директория: $(pwd)"
echo ""

# 2. Проверяем файлы
echo "2. Проверка файлов..."
if [ -f "final-bot-fix.js" ]; then
    echo "✅ final-bot-fix.js найден"
else
    echo "❌ final-bot-fix.js не найден"
    exit 1
fi

if [ -f "env.local" ]; then
    echo "✅ env.local найден"
else
    echo "❌ env.local не найден"
    exit 1
fi

if [ -f "package.json" ]; then
    echo "✅ package.json найден"
else
    echo "❌ package.json не найден"
    exit 1
fi
echo ""

# 3. Устанавливаем зависимости
echo "3. Установка зависимостей..."
if command -v npm &> /dev/null; then
    npm install
    echo "✅ Зависимости установлены"
else
    echo "❌ npm не найден. Установите Node.js"
    exit 1
fi
echo ""

# 4. Проверяем токены
echo "4. Проверка токенов..."
if grep -q "OR_TOKEN=" env.local; then
    echo "✅ OR_TOKEN найден"
else
    echo "❌ OR_TOKEN не найден в env.local"
    echo "💡 Добавьте в env.local: OR_TOKEN=ваш_токен"
fi

if grep -q "TELEGRAM_BOT_TOKEN=" env.local; then
    echo "✅ TELEGRAM_BOT_TOKEN найден"
else
    echo "❌ TELEGRAM_BOT_TOKEN не найден в env.local"
fi
echo ""

# 5. Останавливаем старые процессы
echo "5. Остановка старых процессов..."
if command -v pm2 &> /dev/null; then
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    echo "✅ Старые процессы остановлены"
else
    echo "⚠️ PM2 не установлен. Устанавливаем..."
    npm install -g pm2
fi
echo ""

# 6. Запускаем бота
echo "6. Запуск бота..."
pm2 start final-bot-fix.js --name "spor3s-bot-fixed"
pm2 save
pm2 startup

echo "✅ Бот запущен через PM2"
echo ""

# 7. Проверяем статус
echo "7. Проверка статуса..."
pm2 list
echo ""

# 8. Показываем логи
echo "8. Последние логи:"
pm2 logs spor3s-bot-fixed --lines 10
echo ""

echo "🎉 ДЕПЛОЙ ЗАВЕРШЕН!"
echo "=================="
echo ""
echo "📱 Теперь протестируйте бота в Telegram:"
echo "   1. Откройте Telegram"
echo "   2. Найдите @spor3s_bot"
echo "   3. Отправьте /start"
echo "   4. Отправьте привет"
echo ""
echo "🔧 Управление ботом:"
echo "   pm2 list                    - список процессов"
echo "   pm2 logs spor3s-bot-fixed   - логи бота"
echo "   pm2 restart spor3s-bot-fixed - перезапуск"
echo "   pm2 stop spor3s-bot-fixed   - остановка"
echo ""
echo "📊 Мониторинг:"
echo "   pm2 monit                   - мониторинг в реальном времени"
echo ""
