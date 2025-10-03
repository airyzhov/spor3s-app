# Краткая сводка: Деплой Spor3s App на продакшн

## 🎯 Цель
Перенести проект с ngrok на стабильный сервер с доменом

## 📋 Варианты деплоя

### 1. VPS/Выделенный сервер ⭐ (Рекомендуемый)
**Стоимость:** $5-20/месяц
**Преимущества:**
- Полный контроль
- Стабильность
- Масштабируемость
- Нет ограничений

**Провайдеры:**
- DigitalOcean ($5/месяц)
- Vultr ($2.50/месяц)
- Linode ($5/месяц)
- Hetzner ($3.50/месяц)

### 2. Облачные платформы
**Railway** - $5/месяц
- Простой деплой
- Автоматический SSL
- Поддержка Node.js

**Render** - Бесплатный тир
- Простота настройки
- Ограничения по ресурсам

**Vercel** - Сложно с Express серверами

### 3. Docker контейнеризация
- Изоляция приложений
- Простота развертывания
- Требует Docker знаний

## 🚀 Алгоритм деплоя на VPS

### Этап 1: Подготовка сервера (30 минут)
```bash
# 1. Создать VPS (Ubuntu 22.04 LTS)
# 2. Подключиться по SSH
# 3. Запустить setup-server.sh
sudo chmod +x setup-server.sh
sudo ./setup-server.sh
```

### Этап 2: Настройка домена (15 минут)
```bash
# 1. Купить домен (например, spor3s.com)
# 2. Настроить DNS записи:
#    A    @     your-server-ip
#    A    www   your-server-ip
# 3. Отредактировать nginx конфигурацию
sudo nano /etc/nginx/sites-available/spor3s-app
# Заменить your-domain.com на spor3s.com
```

### Этап 3: Деплой проекта (20 минут)
```bash
# 1. Клонировать проект
cd /var/www
sudo git clone <your-repo> spor3s-app
sudo chown -R spor3s:spor3s spor3s-app

# 2. Настроить переменные окружения
cd spor3s-app
cp .env.example .env.production
nano .env.production

# 3. Запустить деплой
sudo chmod +x deploy.sh
sudo ./deploy.sh production
```

### Этап 4: SSL сертификат (10 минут)
```bash
# Получить SSL сертификат
sudo certbot --nginx -d spor3s.com -d www.spor3s.com
```

### Этап 5: Обновление Telegram Bot (5 минут)
```bash
# Обновить webhook URL
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://spor3s.com/api/telegram-webhook"
```

## 🔧 Внесение правок

### Локальная разработка
```bash
# 1. Клонировать репозиторий
git clone <repo>
cd spor3s-app

# 2. Создать ветку для новой функции
git checkout -b feature/new-feature

# 3. Разработка и тестирование
npm run dev
npm run build

# 4. Коммит и пуш
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### Деплой изменений
```bash
# Автоматический деплой
ssh user@your-server
cd /var/www/spor3s-app
./deploy.sh production

# Или ручной деплой
pm2 stop all
git pull origin main
npm ci --only=production
npm run build
pm2 start ecosystem.config.js
```

## 📊 Мониторинг

### Проверка статуса
```bash
# Статус приложений
pm2 status

# Логи
pm2 logs
sudo tail -f /var/log/nginx/spor3s-app-access.log

# Мониторинг ресурсов
pm2 monit
htop
```

### Автоматический мониторинг
- PM2 автоматически перезапускает упавшие приложения
- Cron задача проверяет доступность каждые 5 минут
- Nginx логи для анализа трафика

## 🔄 Рабочий процесс

### Ежедневные задачи
1. **Разработка** → Локальная разработка в feature ветках
2. **Тестирование** → Проверка на локальной машине
3. **Merge** → Слияние в main ветку
4. **Деплой** → Автоматический деплой на сервер
5. **Мониторинг** → Проверка логов и статуса

### Экстренные ситуации
```bash
# Быстрый откат
cd /var/www/spor3s-app
git reset --hard HEAD~1
./deploy.sh production

# Восстановление из бэкапа
cd /var/backups/spor3s-app
tar -xzf spor3s-app-YYYYMMDD-HHMMSS.tar.gz -C /var/www/
./deploy.sh production
```

## 💰 Стоимость

### Минимальная конфигурация
- **VPS:** $5/месяц (1 CPU, 1GB RAM, 20GB SSD)
- **Домен:** $10-15/год
- **Итого:** ~$75/год

### Рекомендуемая конфигурация
- **VPS:** $10/месяц (2 CPU, 2GB RAM, 40GB SSD)
- **Домен:** $10-15/год
- **Итого:** ~$135/год

## ⚡ Быстрый старт

### 1. Выбрать провайдера VPS
### 2. Создать сервер Ubuntu 22.04
### 3. Выполнить команды:
```bash
# Подключиться к серверу
ssh root@your-server-ip

# Скачать и запустить setup
wget https://raw.githubusercontent.com/your-repo/spor3s-app/main/setup-server.sh
chmod +x setup-server.sh
./setup-server.sh

# Клонировать проект
cd /var/www
git clone <your-repo> spor3s-app
cd spor3s-app
./deploy.sh production
```

### 4. Настроить домен и SSL
### 5. Обновить Telegram Bot webhook

## 🎉 Результат
- Стабильный сервер вместо ngrok
- Собственный домен
- Автоматические бэкапы
- Мониторинг и алерты
- Простой процесс обновлений
