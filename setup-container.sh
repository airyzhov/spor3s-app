#!/bin/bash

# Скрипт для создания изолированного контейнера spor3s-app
echo "🏗️ Создаем изолированный контейнер для spor3s-app..."

# Создаем пользователя spor3s
echo "👤 Создаем пользователя spor3s..."
useradd -m -s /bin/bash spor3s

# Создаем папку проекта
echo "📁 Создаем папку проекта..."
mkdir -p /var/www/spor3s-app
chown -R spor3s:spor3s /var/www/spor3s-app

# Устанавливаем Node.js для пользователя spor3s
echo "📦 Устанавливаем Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Устанавливаем PM2 глобально
echo "📦 Устанавливаем PM2..."
npm install -g pm2

# Переключаемся на пользователя spor3s
echo "🔄 Переключаемся на пользователя spor3s..."
su - spor3s << 'EOF'
cd /var/www/spor3s-app

# Клонируем проект
echo "📥 Клонируем проект с GitHub..."
git clone https://github.com/airyzhov/spor3s-app.git .

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Создаем .env.local
echo "⚙️ Создаем конфигурацию..."
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
TELEGRAM_BOT_TOKEN=your_bot_token
NEXTAUTH_SECRET=your_nextauth_secret
ENVEOF

# Собираем проект
echo "🔨 Собираем проект..."
npm run build

# Запускаем через PM2
echo "🚀 Запускаем приложение..."
pm2 start npm --name "spor3s-app" -- start
pm2 save
pm2 startup

echo "✅ Контейнер spor3s-app создан и запущен!"
EOF

echo "🌐 Приложение доступно по адресу: http://185.166.197.49:3000"
echo "📊 Управление: su - spor3s -c 'pm2 status'"
