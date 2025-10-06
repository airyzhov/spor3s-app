# Правильный деплой Spor3s App через Portainer

## ❌ Проблема с текущим подходом

Один файл `docker-compose.yml` НЕ содержит весь проект. Нужно загрузить все файлы:
- Исходный код приложения
- Конфигурационные файлы
- Nginx конфигурацию
- Переменные окружения

## ✅ Правильный процесс деплоя

### Этап 1: Подготовка файлов на сервере

#### 1.1 Подключение к серверу
```bash
# Подключиться к серверу
ssh root@your-server-ip

# Создать директорию проекта
mkdir -p /opt/spor3s-app
cd /opt/spor3s-app
```

#### 1.2 Загрузка всех файлов проекта

**Вариант A: Через SCP (рекомендуется)**
```powershell
# В PowerShell на Windows:
scp -r C:\Users\User\Documents\spor3s-app\spor3s-app\* root@your-server-ip:/opt/spor3s-app/
```

**Вариант B: Через WinSCP**
1. Открыть WinSCP
2. Подключиться к серверу
3. Перейти в `/opt/spor3s-app`
4. Перетащить ВСЕ файлы из папки проекта

**Вариант C: Через Git (если есть репозиторий)**
```bash
# На сервере
cd /opt/spor3s-app
git clone <your-repo-url> .
```

#### 1.3 Проверка загруженных файлов
```bash
# На сервере проверить, что все файлы загружены
ls -la /opt/spor3s-app/

# Должны быть файлы:
# - docker-compose.yml
# - nginx-spor3s-app.conf
# - emergency_server.js
# - app/ (папка с Next.js)
# - package.json
# - и другие файлы проекта
```

### Этап 2: Настройка переменных окружения

#### 2.1 Создание .env файла
```bash
# На сервере
cd /opt/spor3s-app
nano .env

# Добавить переменные:
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TELEGRAM_BOT_TOKEN=your_bot_token
```

### Этап 3: Деплой через Portainer

#### 3.1 Открыть Portainer
1. Открыть браузер → `http://your-domain.com:9000`
2. Войти в Portainer

#### 3.2 Создать новый Stack
1. Перейти в **Stacks**
2. Нажать **Add stack**
3. Ввести имя: `spor3s-app`
4. Вставить содержимое `docker-compose.yml`

#### 3.3 Настроить volumes (важно!)
В Portainer создать volumes:
- `spor3s-app-data` - для данных приложения
- `spor3s-app-ssl` - для SSL сертификатов

#### 3.4 Развернуть Stack
1. Нажать **Deploy the stack**
2. Дождаться создания контейнеров
3. Проверить статус в разделе **Containers**

## 🔧 Исправленная конфигурация Docker Compose

### Обновленный docker-compose.yml для Portainer:
```yaml
version: '3.8'

services:
  spor3s-nextjs:
    image: node:18-alpine
    container_name: spor3s-nextjs
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      - /opt/spor3s-app:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=production
      - PORT=3000
    command: >
      sh -c "npm ci --only=production &&
             npm run build &&
             npm start"
    restart: unless-stopped
    networks:
      - spor3s-network

  spor3s-emergency:
    image: node:18-alpine
    container_name: spor3s-emergency
    working_dir: /app
    ports:
      - "5000:5000"
    volumes:
      - /opt/spor3s-app:/app
    environment:
      - NODE_ENV=production
      - PORT=5000
    command: "node emergency_server.js"
    restart: unless-stopped
    networks:
      - spor3s-network

  spor3s-nginx:
    image: nginx:alpine
    container_name: spor3s-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /opt/spor3s-app/nginx-spor3s-app.conf:/etc/nginx/conf.d/default.conf
      - /opt/spor3s-app/ssl:/etc/nginx/ssl
    depends_on:
      - spor3s-nextjs
      - spor3s-emergency
    restart: unless-stopped
    networks:
      - spor3s-network

networks:
  spor3s-network:
    driver: bridge
```

## 🚀 Альтернативный подход: Docker Compose CLI

Если Portainer вызывает проблемы, используйте командную строку:

```bash
# На сервере
cd /opt/spor3s-app

# Запустить приложение
docker-compose up -d

# Проверить статус
docker-compose ps

# Просмотреть логи
docker-compose logs -f
```

## 📋 Чек-лист правильного деплоя

### Перед деплоем:
- [ ] Все файлы проекта загружены в `/opt/spor3s-app/`
- [ ] Создан `.env` файл с переменными окружения
- [ ] Файл `nginx-spor3s-app.conf` существует
- [ ] Файл `docker-compose.yml` обновлен с правильными путями

### После деплоя:
- [ ] Все контейнеры запущены (`docker-compose ps`)
- [ ] Логи не содержат ошибок (`docker-compose logs`)
- [ ] Приложение доступно на `http://your-domain.com`
- [ ] Emergency API доступен на `http://your-domain.com/emergency/`

## 🔍 Отладка проблем

### Если контейнеры не запускаются:
```bash
# Проверить логи
docker-compose logs

# Проверить файлы
ls -la /opt/spor3s-app/

# Проверить права доступа
chmod +x /opt/spor3s-app/quick-deploy.sh
```

### Если Nginx не работает:
```bash
# Проверить конфигурацию
docker exec spor3s-nginx nginx -t

# Проверить логи Nginx
docker logs spor3s-nginx
```

## 🎯 Рекомендуемый порядок действий

1. **Загрузить все файлы** → SCP/WinSCP
2. **Настроить .env** → переменные окружения
3. **Проверить файлы** → убедиться, что все на месте
4. **Запустить через CLI** → `docker-compose up -d`
5. **Проверить логи** → убедиться, что нет ошибок
6. **Настроить через Portainer** → для удобного управления

## 💡 Важные моменты

- **Все файлы проекта** должны быть на сервере
- **Пути в volumes** должны указывать на реальные файлы
- **Переменные окружения** должны быть настроены
- **Права доступа** должны быть корректными

Теперь деплой должен работать корректно! 🚀
