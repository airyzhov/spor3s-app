# 🚀 ДЕПЛОЙ SPOR3S НА N8N.SPOR3S.RU

## 📋 Информация о сервере

- **Домен n8n**: `n8n.spor3s.ru`
- **Домен Mini App**: `ai.spor3s.ru`
- **Portainer**: `http://n8n.spor3s.ru:9000/`
- **Архив**: `spor3s-portainer-deploy.zip` (20.7 MB)

## 🔧 Подготовка к деплою

### 1. Загрузка архива на сервер
```bash
# Создайте папку для проекта
mkdir -p /opt/spor3s-app
cd /opt/spor3s-app

# Загрузите архив (20.7 MB)
scp spor3s-portainer-deploy.zip root@n8n.spor3s.ru:/opt/spor3s-app/

# Распакуйте архив
unzip spor3s-portainer-deploy.zip
```

### 2. Настройка переменных окружения
```bash
# Скопируйте пример
cp env.example .env

# Отредактируйте файл с реальными данными
nano .env
```

**Заполните файл .env следующими данными:**
```env
# Supabase Configuration
SUPABASE_URL=https://hwospkbheqaauluoytvz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTU2NDIwMiwiZXhwIjoyMDY3MTQwMjAyfQ.OpvQj5iNN5sMSP-PhPVtKUWuRT5aORYvOZLEubHaFALc

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=6522297183:AAE60O9EJy8c8SfdbLOsRGb6B06eHYBWLyo
TELEGRAM_API_ID=25152508
TELEGRAM_API_HASH=e6d11fbfdac29ec3f8e9f6eb4dc54385

# AI API Configuration
OPENROUTER_API_KEY=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

# Application Configuration
NEXT_PUBLIC_BASE_URL=https://ai.spor3s.ru
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://ai.spor3s.ru

# Node Environment
NODE_ENV=production
```

## 🐳 Деплой через Portainer

### 1. Откройте Portainer
Перейдите по адресу: `http://n8n.spor3s.ru:9000/`

### 2. Создайте новый стек
1. Войдите в Portainer
2. Перейдите в **Stacks** → **Add stack**
3. Введите имя стека: `spor3s`
4. Загрузите файл `docker-compose.portainer.yml`
5. Нажмите **Deploy the stack**

### 3. Альтернативный способ через командную строку
```bash
# Перейдите в папку проекта
cd /opt/spor3s-app

# Запустите стек
docker-compose -f docker-compose.portainer.yml up -d
```

## 📊 Проверка работы

### Проверка контейнеров
```bash
# Статус всех контейнеров
docker ps

# Ожидаемый результат:
# spor3s-app      - Next.js приложение (порт 3000)
# spor3s-bot      - Telegram бот
# spor3s-client   - Telegram клиент
# spor3s-nginx    - Nginx прокси (порты 80, 443)
```

### Проверка логов
```bash
# Логи приложения
docker logs spor3s-app

# Логи бота
docker logs spor3s-bot

# Логи клиента
docker logs spor3s-client

# Логи Nginx
docker logs spor3s-nginx
```

### Проверка доступности
- **Приложение**: `https://ai.spor3s.ru`
- **Portainer**: `http://n8n.spor3s.ru:9000/`

## 🔧 Управление приложением

### Обновление приложения
```bash
# Остановите стек
docker-compose -f docker-compose.portainer.yml down

# Обновите код (если нужно)
git pull origin main

# Пересоберите и запустите
docker-compose -f docker-compose.portainer.yml up -d --build
```

### Управление контентом
```bash
# Войдите в контейнер приложения
docker exec -it spor3s-app sh

# Запустите редактор контента
npm run content-editor
```

### Резервное копирование
```bash
# Создайте бэкап данных
docker run --rm -v spor3s-app_spor3s-data:/data -v $(pwd):/backup alpine tar czf /backup/spor3s-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## 🚨 Устранение неполадок

### Проблемы с подключением
```bash
# Проверьте статус контейнеров
docker ps -a

# Проверьте логи
docker logs spor3s-app

# Проверьте сеть
docker network ls
docker network inspect spor3s-app_spor3s-network
```

### Проблемы с переменными окружения
```bash
# Проверьте переменные в контейнере
docker exec spor3s-app env | grep SUPABASE
docker exec spor3s-app env | grep TELEGRAM
```

### Проблемы с базой данных
```bash
# Проверьте подключение к Supabase
curl -X GET "https://hwospkbheqaauluoytvz.supabase.co/rest/v1/" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs"
```

## 📈 Мониторинг

### Через Portainer
1. Откройте `http://n8n.spor3s.ru:9000/`
2. Перейдите в **Stacks** → **spor3s**
3. Просматривайте логи и статистику контейнеров

### Через командную строку
```bash
# Статистика использования ресурсов
docker stats

# Мониторинг логов в реальном времени
docker logs -f spor3s-app
```

## ✅ Чек-лист деплоя

- [ ] Архив загружен на сервер
- [ ] Файлы распакованы в `/opt/spor3s-app`
- [ ] Файл `.env` настроен с реальными данными
- [ ] Стек создан в Portainer
- [ ] Все контейнеры запущены
- [ ] Приложение доступно по адресу `https://ai.spor3s.ru`
- [ ] Telegram бот работает
- [ ] Логи не содержат ошибок

## 🎯 Результат

**Домен приложения**: `https://ai.spor3s.ru`
**Portainer**: `http://n8n.spor3s.ru:9000/`
**Время деплоя**: ~10 минут

**Готовые компоненты**:
- ✅ Next.js приложение (контейнер)
- ✅ Telegram бот (контейнер)
- ✅ Telegram клиент (контейнер)
- ✅ Nginx прокси (контейнер)
- ✅ Система управления контентом
- ✅ Изображения товаров (18.9 MB)
- ✅ Автоматические перезапуски
- ✅ Мониторинг через Portainer

**🎉 Проект успешно развернут на n8n.spor3s.ru!**
