#!/bin/bash

# Скрипт для развертывания на VPS Timeweb
echo "🚀 Начинаем развертывание spor3s-app на VPS..."

# Обновляем систему
echo "📦 Обновляем систему..."
apt update && apt upgrade -y

# Устанавливаем Node.js 18
echo "📦 Устанавливаем Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Устанавливаем PM2
echo "📦 Устанавливаем PM2..."
npm install -g pm2

# Создаем отдельный контейнер для проекта
echo "📁 Создаем контейнер spor3s-app..."
mkdir -p /var/www/spor3s-app
cd /var/www/spor3s-app

# Создаем пользователя для приложения
echo "👤 Создаем пользователя spor3s..."
useradd -m -s /bin/bash spor3s
chown -R spor3s:spor3s /var/www/spor3s-app

# Клонируем проект
echo "📥 Клонируем проект с GitHub..."
git clone https://github.com/airyzhov/spor3s-app.git .

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Создаем .env.local
echo "⚙️ Создаем конфигурацию..."
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
TELEGRAM_BOT_TOKEN=your_bot_token
NEXTAUTH_SECRET=your_nextauth_secret
EOF

# Собираем проект
echo "🔨 Собираем проект..."
npm run build

# Переключаемся на пользователя spor3s
echo "🔄 Переключаемся на пользователя spor3s..."
su - spor3s -c "cd /var/www/spor3s-app && npm run build"

# Запускаем через PM2 от имени пользователя spor3s
echo "🚀 Запускаем приложение..."
su - spor3s -c "cd /var/www/spor3s-app && pm2 start npm --name 'spor3s-app' -- start"
su - spor3s -c "pm2 save"
su - spor3s -c "pm2 startup"

echo "✅ Развертывание завершено!"
echo "🌐 Приложение доступно по адресу: http://185.166.197.49:3000"
