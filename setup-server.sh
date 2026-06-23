#!/bin/bash

# Скрипт первоначальной настройки сервера для Spor3s App
# Использование: ./setup-server.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Проверка прав
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен выполняться с правами root"
    exit 1
fi

log "Начинаем настройку сервера для Spor3s App..."

# Обновление системы
log "Обновляем систему..."
apt update && apt upgrade -y

# Установка необходимых пакетов
log "Устанавливаем необходимые пакеты..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Установка Node.js 18
log "Устанавливаем Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Проверка версии Node.js
NODE_VERSION=$(node --version)
log "Node.js установлен: $NODE_VERSION"

# Установка PM2
log "Устанавливаем PM2..."
npm install -g pm2

# Установка Nginx
log "Устанавливаем Nginx..."
apt install -y nginx

# Установка Certbot для SSL
log "Устанавливаем Certbot..."
apt install -y certbot python3-certbot-nginx

# Создание пользователя для приложения
log "Создаем пользователя для приложения..."
if ! id "spor3s" &>/dev/null; then
    useradd -m -s /bin/bash spor3s
    usermod -aG sudo spor3s
    log "Пользователь spor3s создан"
else
    log "Пользователь spor3s уже существует"
fi

# Создание директорий
log "Создаем необходимые директории..."
mkdir -p /var/www
mkdir -p /var/log/pm2
mkdir -p /var/backups/spor3s-app
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Настройка прав доступа
chown -R spor3s:spor3s /var/www
chown -R spor3s:spor3s /var/log/pm2
chown -R spor3s:spor3s /var/backups/spor3s-app

# Настройка файрвола
log "Настраиваем файрвол..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw status

# Настройка автоматических обновлений
log "Настраиваем автоматические обновления..."
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Создание конфигурации Nginx
log "Создаем конфигурацию Nginx..."
cat > /etc/nginx/sites-available/spor3s-app << 'EOF'
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
        proxy_pass http://localhost:3000;
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
        proxy_pass http://localhost:3000;
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
        proxy_pass http://localhost:5000/;
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
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Фавиконка
    location = /favicon.ico {
        proxy_pass http://localhost:3000;
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
EOF

# Активация конфигурации Nginx
log "Активируем конфигурацию Nginx..."
ln -sf /etc/nginx/sites-available/spor3s-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации Nginx
nginx -t

# Перезапуск Nginx
systemctl restart nginx
systemctl enable nginx

# Настройка PM2 автозапуска
log "Настраиваем автозапуск PM2..."
pm2 startup
pm2 install pm2-logrotate

# Создание скрипта мониторинга
log "Создаем скрипт мониторинга..."
cat > /usr/local/bin/check-spor3s << 'EOF'
#!/bin/bash
# Скрипт проверки состояния приложений

if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "Next.js приложение недоступно!" | logger -t spor3s-monitor
    pm2 restart spor3s-nextjs
fi

if ! curl -f http://localhost:5000 > /dev/null 2>&1; then
    echo "Emergency сервер недоступен!" | logger -t spor3s-monitor
    pm2 restart spor3s-emergency
fi
EOF

chmod +x /usr/local/bin/check-spor3s

# Добавление в cron
log "Добавляем мониторинг в cron..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-spor3s") | crontab -

log "Настройка сервера завершена!"

echo ""
echo "=== Следующие шаги ==="
echo "1. Отредактируйте домен в /etc/nginx/sites-available/spor3s-app"
echo "2. Клонируйте проект: git clone <repo> /var/www/spor3s-app"
echo "3. Настройте переменные окружения в .env.production"
echo "4. Запустите деплой: ./deploy.sh"
echo "5. Получите SSL сертификат: certbot --nginx -d your-domain.com"
echo ""
echo "=== Полезные команды ==="
echo "pm2 status          - статус приложений"
echo "pm2 logs            - логи приложений"
echo "nginx -t            - проверка конфигурации Nginx"
echo "systemctl status nginx - статус Nginx"
echo "ufw status          - статус файрвола"
