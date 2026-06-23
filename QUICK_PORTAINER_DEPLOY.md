# ⚡ БЫСТРЫЙ ДЕПЛОЙ SPOR3S ЧЕРЕЗ PORTAINER

## 📦 Что готово

✅ **Архив создан**: `spor3s-portainer-deploy.zip` (20.7 MB)
✅ **Docker конфигурация**: `docker-compose.portainer.yml`
✅ **Dockerfile'ы**: для всех компонентов
✅ **Изображения товаров**: папка `public/products` (18.9 MB)
✅ **Документация**: `PORTAINER_DEPLOY.md`

## 🚀 Пошаговый деплой (15 минут)

### 1. Установка Docker и Portainer (5 минут)
```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Portainer
docker volume create portainer_data
docker run -d -p 9000:9000 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data portainer/portainer-ce:latest
```

### 2. Загрузка проекта (2 минуты)
```bash
# Создайте папку
mkdir -p /opt/spor3s-app
cd /opt/spor3s-app

# Загрузите архив (20.7 MB)
scp spor3s-portainer-deploy.zip user@your-server:/opt/spor3s-app/

# Распакуйте
unzip spor3s-portainer-deploy.zip
```

### 3. Настройка переменных (3 минуты)
```bash
# Скопируйте и отредактируйте
cp env.example .env
nano .env
```

**Обязательные переменные:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_API_ID=your-api-id
TELEGRAM_API_HASH=your-api-hash
OPENROUTER_API_KEY=your-openrouter-key
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### 4. Запуск через Portainer (5 минут)

#### Через веб-интерфейс:
1. Откройте: `http://your-server:9000`
2. Создайте аккаунт
3. **Stacks** → **Add stack**
4. Имя: `spor3s`
5. Загрузите: `docker-compose.portainer.yml`
6. **Deploy the stack**

#### Через командную строку:
```bash
docker-compose -f docker-compose.portainer.yml up -d
```

## 📊 Проверка работы

```bash
# Статус контейнеров
docker ps

# Логи приложения
docker logs spor3s-app

# Логи бота
docker logs spor3s-bot

# Логи клиента
docker logs spor3s-client
```

## 🔧 Управление

### Обновление
```bash
docker-compose -f docker-compose.portainer.yml down
docker-compose -f docker-compose.portainer.yml up -d --build
```

### Управление контентом
```bash
docker exec -it spor3s-app sh
npm run content-editor
```

### Бэкап
```bash
docker run --rm -v spor3s-app_spor3s-data:/data -v $(pwd):/backup alpine tar czf /backup/spor3s-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## 📁 Содержимое архива

```
spor3s-portainer-deploy.zip (20.7 MB)
├── app/                    # Next.js приложение
├── components/             # React компоненты
├── lib/                    # Утилиты и клиенты
├── scripts/                # Скрипты управления контентом
├── database/               # SQL схемы
├── public/                 # Статические файлы
│   ├── products/          # Изображения товаров (18.9 MB)
│   ├── logo.png           # Логотип
│   └── psy-forest-bg.jpg.png # Фоновое изображение
├── tg-bot/                 # Telegram бот + Dockerfile
├── tg-client/              # Telegram клиент + Dockerfile
├── package.json            # Зависимости
├── Dockerfile              # Основной Dockerfile
├── docker-compose.portainer.yml  # Docker Compose
├── nginx-spor3s-app.conf   # Nginx конфигурация
├── db-check.sql           # SQL для настройки БД
├── env.example            # Пример переменных окружения
└── PORTAINER_DEPLOY.md    # Подробная инструкция
```

## 🎯 Результат

**Время деплоя**: ~15 минут
**Размер архива**: 20.7 MB (включая изображения товаров)
**Доступ к приложению**: `https://your-domain.com`
**Доступ к Portainer**: `http://your-server:9000`

**Готовые компоненты**:
- ✅ Next.js приложение (контейнер)
- ✅ Telegram бот (контейнер)
- ✅ Telegram клиент (контейнер)
- ✅ Nginx прокси (контейнер)
- ✅ Система управления контентом
- ✅ Изображения товаров (18.9 MB)
- ✅ Автоматические перезапуски
- ✅ Мониторинг через Portainer

**🎉 Проект готов к деплою через Portainer!**
