# Руководство по деплою Spor3s App на продакшн сервер

## Варианты деплоя

### 1. VPS/Выделенный сервер (Рекомендуемый)
- **Преимущества:** Полный контроль, стабильность, масштабируемость
- **Провайдеры:** DigitalOcean, Vultr, Linode, Hetzner
- **Стоимость:** $5-20/месяц

### 2. Облачные платформы
- **Vercel:** Простой деплой Next.js, но сложно с Express серверами
- **Railway:** Поддержка Node.js, автоматический SSL
- **Render:** Бесплатный тир, поддержка Node.js

### 3. Docker контейнеризация
- **Преимущества:** Изоляция, простота развертывания
- **Сложность:** Требует Docker знаний

## Пошаговый план деплоя на VPS

### Этап 1: Подготовка сервера

#### 1.1 Создание VPS
```bash
# Ubuntu 22.04 LTS (рекомендуется)
# Минимум: 1 CPU, 1GB RAM, 20GB SSD
```

#### 1.2 Настройка сервера
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2 для управления процессами
sudo npm install -g pm2

# Установка Nginx
sudo apt install nginx -y

# Установка Certbot для SSL
sudo apt install certbot python3-certbot-nginx -y

# Установка Git
sudo apt install git -y
```

#### 1.3 Настройка файрвола
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Этап 2: Подготовка проекта

#### 2.1 Создание production конфигурации
```bash
# Создание .env.production
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TELEGRAM_BOT_TOKEN=your_bot_token
```

#### 2.2 Оптимизация для продакшна
```javascript
// next.config.js - добавить
const nextConfig = {
  output: 'standalone', // Для Docker
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  }
};
```

### Этап 3: Деплой на сервер

#### 3.1 Клонирование проекта
```bash
# На сервере
cd /var/www
sudo git clone https://github.com/your-username/spor3s-app.git
sudo chown -R $USER:$USER spor3s-app
cd spor3s-app
```

#### 3.2 Установка зависимостей
```bash
npm install
npm run build
```

#### 3.3 Настройка PM2
```bash
# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'spor3s-nextjs',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/spor3s-app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'spor3s-emergency',
      script: 'emergency_server.js',
      cwd: '/var/www/spor3s-app',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
```

#### 3.4 Запуск приложений
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Этап 4: Настройка Nginx

#### 4.1 Конфигурация Nginx
```nginx
# /etc/nginx/sites-available/spor3s-app
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Next.js приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API роуты
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Emergency API
    location /emergency/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4.2 Активация конфигурации
```bash
sudo ln -s /etc/nginx/sites-available/spor3s-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Этап 5: Настройка SSL

#### 5.1 Получение SSL сертификата
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### 5.2 Автоматическое обновление
```bash
sudo crontab -e
# Добавить строку:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Этап 6: Настройка домена

#### 6.1 DNS настройки
```
A    @     your-server-ip
A    www   your-server-ip
```

#### 6.2 Обновление Telegram Bot
```javascript
// В настройках бота обновить webhook
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-domain.com/api/telegram-webhook
```

## Управление проектом

### Обновление кода
```bash
# На сервере
cd /var/www/spor3s-app
git pull origin main
npm install
npm run build
pm2 restart all
```

### Мониторинг
```bash
# Статус приложений
pm2 status
pm2 logs

# Мониторинг ресурсов
pm2 monit

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Резервное копирование
```bash
# Скрипт для бэкапа
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backup/spor3s-app-$DATE.tar.gz /var/www/spor3s-app
```

## Альтернативные варианты деплоя

### Railway (Простой вариант)
1. Подключить GitHub репозиторий
2. Настроить переменные окружения
3. Автоматический деплой при push

### Docker (Продвинутый вариант)
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000 5000
CMD ["npm", "start"]
```

## Безопасность

### Настройка файрвола
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Регулярные обновления
```bash
# Автоматические обновления безопасности
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Мониторинг и логирование

### Настройка логирования
```bash
# PM2 логи
pm2 install pm2-logrotate

# Nginx логи
sudo nano /etc/nginx/nginx.conf
# Настроить access_log и error_log
```

### Алерты
```bash
# Скрипт проверки доступности
#!/bin/bash
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "App is down!" | mail -s "Alert" admin@your-domain.com
fi
```
