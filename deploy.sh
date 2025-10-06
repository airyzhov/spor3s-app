#!/bin/bash

# Скрипт автоматического деплоя Spor3s App
# Использование: ./deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
PROJECT_DIR="/var/www/spor3s-app"
BACKUP_DIR="/var/backups/spor3s-app"
LOG_FILE="/var/log/deploy.log"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

# Проверка прав
if [ "$EUID" -ne 0 ]; then
    error "Этот скрипт должен выполняться с правами root"
    exit 1
fi

log "Начинаем деплой в окружении: $ENVIRONMENT"

# Создание директорий если не существуют
mkdir -p $BACKUP_DIR
mkdir -p /var/log/pm2

# Бэкап текущей версии
if [ -d "$PROJECT_DIR" ]; then
    log "Создаем бэкап текущей версии..."
    BACKUP_NAME="spor3s-app-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C /var/www spor3s-app
    log "Бэкап создан: $BACKUP_NAME"
fi

# Переход в директорию проекта
cd $PROJECT_DIR

# Остановка приложений
log "Останавливаем приложения..."
pm2 stop all || true

# Обновление кода
log "Обновляем код из Git..."
git fetch origin
git reset --hard origin/main

# Установка зависимостей
log "Устанавливаем зависимости..."
npm ci --only=production

# Сборка проекта
log "Собираем проект..."
npm run build

# Очистка старых логов
log "Очищаем старые логи..."
pm2 flush

# Запуск приложений
log "Запускаем приложения..."
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2
pm2 save

# Проверка статуса
log "Проверяем статус приложений..."
sleep 5
pm2 status

# Проверка доступности
log "Проверяем доступность приложений..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "Next.js приложение доступно"
else
    error "Next.js приложение недоступно"
    exit 1
fi

if curl -f http://localhost:5000 > /dev/null 2>&1; then
    log "Emergency сервер доступен"
else
    error "Emergency сервер недоступен"
    exit 1
fi

# Перезагрузка Nginx
log "Перезагружаем Nginx..."
systemctl reload nginx

# Очистка старых бэкапов (оставляем последние 5)
log "Очищаем старые бэкапы..."
cd $BACKUP_DIR
ls -t | tail -n +6 | xargs -r rm

log "Деплой завершен успешно!"

# Вывод информации
echo ""
echo "=== Информация о деплое ==="
echo "Окружение: $ENVIRONMENT"
echo "Директория: $PROJECT_DIR"
echo "Статус PM2:"
pm2 status
echo ""
echo "Логи доступны в:"
echo "- PM2 логи: pm2 logs"
echo "- Nginx логи: /var/log/nginx/spor3s-app-*.log"
echo "- Деплой логи: $LOG_FILE"
