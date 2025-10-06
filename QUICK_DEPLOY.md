# ⚡ БЫСТРЫЙ ДЕПЛОЙ SPOR3S

## 📦 Что готово

✅ **Архив создан**: `spor3s-app-deploy.zip` (0.25 MB)
✅ **Тестовые файлы удалены** (очищено ~50+ файлов)
✅ **Документация подготовлена**
✅ **SQL скрипт готов**: `db-check.sql`

## 🚀 Пошаговый деплой на VPS

### 1. Подготовка сервера (5 минут)
```bash
# Обновление и установка пакетов
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx postgresql postgresql-contrib

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2
```

### 2. Загрузка проекта (2 минуты)
```bash
# Загрузите архив на сервер
scp spor3s-app-deploy.zip user@your-server:/home/user/

# Распакуйте
unzip spor3s-app-deploy.zip
cd spor3s-app
```

### 3. База данных (3 минуты)
```bash
# Создание БД
sudo -u postgres psql
CREATE DATABASE spor3s_db;
CREATE USER spor3s_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE spor3s_db TO spor3s_user;
\q

# Применение схемы
psql -h localhost -U spor3s_user -d spor3s_db -f db-check.sql
```

### 4. Настройка приложения (5 минут)
```bash
# Установка зависимостей
npm install

# Настройка .env
cp .env.example .env
nano .env  # Заполните переменные

# Сборка
npm run build
```

### 5. Запуск (2 минуты)
```bash
# PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Nginx
sudo cp nginx-spor3s-app.conf /etc/nginx/sites-available/spor3s-app
sudo ln -s /etc/nginx/sites-available/spor3s-app /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### 6. Telegram боты (3 минуты)
```bash
# Основной бот
cd tg-bot && npm install
pm2 start bot.ts --name "spor3s-bot"

# Клиент уведомлений
cd tg-client && npm install
pm2 start client.js --name "spor3s-client"
```

## ⚙️ Обязательные переменные окружения

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_API_ID=your-api-id
TELEGRAM_API_HASH=your-api-hash

# AI API
OPENROUTER_API_KEY=your-openrouter-key

# Приложение
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## 🔍 Проверка работы

```bash
# Статус всех сервисов
pm2 status

# Логи приложения
pm2 logs spor3s-app

# Проверка портов
sudo netstat -tlnp | grep :3000
```

## 📚 Документация

- **Полное руководство**: `README_DEPLOY.md`
- **Управление контентом**: `CONTENT_MANAGEMENT_GUIDE.md`
- **Docker деплой**: `deploy-to-portainer.md`

## 🎯 Результат

**Время деплоя**: ~20 минут
**Размер архива**: 0.25 MB
**Готовые компоненты**:
- ✅ Next.js приложение
- ✅ Telegram боты
- ✅ Система управления контентом
- ✅ База данных
- ✅ Nginx конфигурация
- ✅ PM2 настройки

**🎉 Приложение доступно**: https://your-domain.com
