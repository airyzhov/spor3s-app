#!/bin/bash

# Скрипт быстрого деплоя изменений Spor3s App
# Использование: ./quick-deploy.sh [file1] [file2] ...

set -e

PROJECT_DIR="/opt/spor3s-app"
BACKUP_DIR="/opt/backups/spor3s-app"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

# Проверка аргументов
if [ $# -eq 0 ]; then
    log "Быстрый деплой всех изменений..."
    UPDATE_MODE="all"
else
    log "Деплой конкретных файлов: $@"
    UPDATE_MODE="files"
    FILES_TO_UPDATE=("$@")
fi

# Переход в директорию проекта
cd $PROJECT_DIR

# Создание бэкапа
log "Создаем бэкап текущей версии..."
BACKUP_NAME="spor3s-app-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C /opt spor3s-app
log "Бэкап создан: $BACKUP_NAME"

# Обновление кода
if [ "$UPDATE_MODE" = "all" ]; then
    log "Обновляем весь код из Git..."
    git fetch origin
    git reset --hard origin/main
else
    log "Обновляем только указанные файлы..."
    for file in "${FILES_TO_UPDATE[@]}"; do
        if [ -f "$file" ]; then
            log "Обновлен файл: $file"
        else
            warning "Файл не найден: $file"
        fi
    done
fi

# Остановка контейнеров
log "Останавливаем контейнеры..."
docker-compose stop spor3s-nextjs spor3s-emergency

# Пересборка и запуск
log "Пересобираем и запускаем контейнеры..."
docker-compose up -d --build spor3s-nextjs spor3s-emergency

# Проверка статуса
log "Проверяем статус контейнеров..."
sleep 5
docker-compose ps

# Проверка доступности
log "Проверяем доступность приложений..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "✅ Next.js приложение доступно"
else
    error "❌ Next.js приложение недоступно"
    exit 1
fi

if curl -f http://localhost:5000 > /dev/null 2>&1; then
    log "✅ Emergency сервер доступен"
else
    error "❌ Emergency сервер недоступен"
    exit 1
fi

log "🎉 Деплой завершен успешно!"

# Очистка старых бэкапов (оставляем последние 5)
log "Очищаем старые бэкапы..."
cd $BACKUP_DIR
ls -t | tail -n +6 | xargs -r rm

echo ""
echo "=== Информация о деплое ==="
echo "Время: $(date)"
echo "Режим: $UPDATE_MODE"
if [ "$UPDATE_MODE" = "files" ]; then
    echo "Обновленные файлы: ${FILES_TO_UPDATE[*]}"
fi
echo "Бэкап: $BACKUP_NAME"
echo ""
echo "=== Полезные команды ==="
echo "docker-compose logs -f spor3s-nextjs    # логи Next.js"
echo "docker-compose logs -f spor3s-emergency # логи Emergency"
echo "docker-compose restart spor3s-nginx     # перезапуск Nginx"
