# Деплой Spor3s App через Portainer

## 📋 Необходимые порты

### Основные порты приложения:
- **3000** - Next.js приложение
- **5000** - Emergency API сервер
- **80** - HTTP (Nginx)
- **443** - HTTPS (Nginx)

### Дополнительные порты (если нужны):
- **22** - SSH (уже открыт)
- **9000** - Portainer (уже настроен)
- **5678** - N8n (уже настроен)

## 🚀 Пошаговый деплой через Portainer

### Этап 1: Подготовка файлов

#### 1.1 Загрузка проекта на сервер
```bash
# Подключиться к серверу
ssh root@your-server-ip

# Создать директорию для проекта
mkdir -p /opt/spor3s-app
cd /opt/spor3s-app

# Клонировать проект (если есть Git репозиторий)
git clone <your-repo-url> .

# Или загрузить файлы через SCP
# На Windows PowerShell:
scp -r C:\path\to\spor3s-app\* root@your-server-ip:/opt/spor3s-app/
```

#### 1.2 Создание .env файла
```bash
# На сервере создать .env файл
nano /opt/spor3s-app/.env

# Добавить переменные:
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TELEGRAM_BOT_TOKEN=your_bot_token
```

### Этап 2: Настройка через Portainer

#### 2.1 Открыть Portainer
1. Открыть браузер
2. Перейти на `http://your-domain.com:9000`
3. Войти в Portainer

#### 2.2 Создать новый Stack
1. В Portainer перейти в **Stacks**
2. Нажать **Add stack**
3. Ввести имя: `spor3s-app`
4. Вставить содержимое `docker-compose.yml`

#### 2.3 Настроить volumes
В Portainer создать volumes:
- `spor3s-app-data` - для данных приложения
- `spor3s-app-ssl` - для SSL сертификатов

### Этап 3: Настройка Nginx

#### 3.1 Обновить nginx конфигурацию
```nginx
# /opt/spor3s-app/nginx-spor3s-app.conf
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Логи
    access_log /var/log/nginx/spor3s-app-access.log;
    error_log /var/log/nginx/spor3s-app-error.log;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Next.js приложение
    location / {
        proxy_pass http://spor3s-nextjs:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API роуты
    location /api/ {
        proxy_pass http://spor3s-nextjs:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        
        # Обработка OPTIONS запросов
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
    }

    # Emergency API
    location /emergency/ {
        proxy_pass http://spor3s-emergency:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
    }

    # Статические файлы
    location /_next/static/ {
        proxy_pass http://spor3s-nextjs:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Фавиконка
    location = /favicon.ico {
        proxy_pass http://spor3s-nextjs:3000;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Ограничение размера запроса
    client_max_body_size 10M;
}
```

### Этап 4: Запуск через Portainer

#### 4.1 Развернуть Stack
1. В Portainer нажать **Deploy the stack**
2. Дождаться создания контейнеров
3. Проверить статус в разделе **Containers**

#### 4.2 Проверить логи
1. В Portainer перейти в **Containers**
2. Выбрать контейнер `spor3s-nextjs`
3. Нажать **Logs** для просмотра логов

### Этап 5: Настройка SSL

#### 5.1 Через Certbot в контейнере
```bash
# Подключиться к серверу
ssh root@your-server-ip

# Запустить certbot в контейнере
docker exec -it spor3s-nginx certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### 5.2 Или через Portainer
1. В Portainer перейти в **Containers**
2. Выбрать `spor3s-nginx`
3. Нажать **Console**
4. Выполнить команды certbot

### Этап 6: Обновление Telegram Bot

#### 6.1 Обновить webhook
```bash
# Обновить webhook URL
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/telegram-webhook"
```

## 🔧 Управление через Portainer

### Обновление приложения
1. В Portainer перейти в **Stacks**
2. Выбрать `spor3s-app`
3. Нажать **Update the stack**
4. Загрузить обновленный `docker-compose.yml`

### Просмотр логов
1. **Containers** → выбрать контейнер → **Logs**
2. Или через терминал:
```bash
docker logs spor3s-nextjs
docker logs spor3s-emergency
docker logs spor3s-nginx
```

### Перезапуск сервисов
1. **Containers** → выбрать контейнер → **Restart**
2. Или через терминал:
```bash
docker restart spor3s-nextjs
docker restart spor3s-emergency
docker restart spor3s-nginx
```

### Мониторинг ресурсов
1. В Portainer перейти в **Dashboard**
2. Просматривать использование CPU, RAM, диска
3. Настроить алерты при превышении лимитов

## 🔄 Рабочий процесс обновлений

### Локальная разработка
```bash
# На локальной машине
git checkout -b feature/new-feature
# разработка...
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### Деплой на сервер
```bash
# Подключиться к серверу
ssh root@your-server-ip

# Обновить код
cd /opt/spor3s-app
git pull origin main

# Обновить через Portainer
# Или через Docker Compose:
docker-compose down
docker-compose up -d --build
```

## 🛠️ Альтернативный вариант: Docker Compose CLI

Если предпочитаете командную строку:

```bash
# Подключиться к серверу
ssh root@your-server-ip

# Перейти в директорию проекта
cd /opt/spor3s-app

# Запустить приложение
docker-compose up -d

# Проверить статус
docker-compose ps

# Просмотреть логи
docker-compose logs -f

# Обновить приложение
docker-compose down
docker-compose up -d --build
```

## 📊 Мониторинг и бэкапы

### Автоматические бэкапы
```bash
# Создать скрипт бэкапа
nano /opt/backup-spor3s.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backup/spor3s-app-$DATE.tar.gz /opt/spor3s-app
docker exec spor3s-nextjs pg_dump -U postgres spor3s_db > /backup/db-$DATE.sql
```

### Мониторинг через N8n
Настроить в N8n автоматические проверки:
- Доступность приложения
- Использование ресурсов
- Отправка уведомлений при проблемах

## 🎯 Результат

После деплоя у вас будет:
- ✅ Spor3s App доступен на `https://your-domain.com`
- ✅ Emergency API на `https://your-domain.com/emergency/`
- ✅ Автоматические перезапуски через Docker
- ✅ Управление через Portainer
- ✅ Интеграция с существующим N8n
- ✅ SSL сертификат
- ✅ Мониторинг и логирование
