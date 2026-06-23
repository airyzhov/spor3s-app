#!/bin/bash
# Скрипт для первоначальной настройки VPS для GitHub Actions
# Запустить на VPS один раз

set -e

echo "🔧 Настройка VPS для GitHub Actions деплоя"
echo "═══════════════════════════════════════"

# Создаем директорию проекта
echo "📁 Создание директории проекта..."
mkdir -p /var/www/spor3s-app
cd /var/www/spor3s-app

# Клонируем репозиторий если его нет
if [ ! -d .git ]; then
    echo "📦 Клонирование репозитория..."
    git clone https://github.com/airyzhov/spor3s-app.git .
else
    echo "✅ Репозиторий уже существует"
fi

# Устанавливаем Node.js если нужно
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "✅ Node.js уже установлен: $(node --version)"
fi

# Устанавливаем PM2 если нужно
if ! command -v pm2 &> /dev/null; then
    echo "📦 Установка PM2..."
    npm install -g pm2
else
    echo "✅ PM2 уже установлен: $(pm2 --version)"
fi

# Создаем директорию для логов
mkdir -p /var/log/pm2
chmod 755 /var/log/pm2

# Настраиваем .env файл
if [ ! -f .env ]; then
    if [ -f .env.vps ]; then
        cp .env.vps .env
        echo "✅ Скопирован .env.vps в .env"
    elif [ -f env-production ]; then
        cp env-production .env
        echo "✅ Скопирован env-production в .env"
    else
        echo "⚠️ Файл .env не найден. Создайте его вручную перед деплоем."
    fi
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ Настройка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Добавьте SSH ключ GitHub Actions в ~/.ssh/authorized_keys"
echo "2. Настройте secrets в GitHub репозитории"
echo "3. Сделайте push в ветку main для запуска деплоя"
echo ""
echo "📋 Для добавления SSH ключа:"
echo "   echo 'ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"

