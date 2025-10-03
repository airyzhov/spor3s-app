# Рабочий процесс внесения правок в Spor3s App на VPS

## 🔄 Способы внесения правок

### 1. Через Git (рекомендуемый способ)

#### Локальная разработка:
```bash
# На локальной машине
git checkout -b feature/new-feature
# внести изменения...
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

#### Деплой на сервер:
```bash
# Подключиться к серверу
ssh root@your-server-ip

# Перейти в директорию проекта
cd /opt/spor3s-app

# Обновить код
git pull origin main

# Перезапустить контейнеры
docker-compose down
docker-compose up -d --build
```

### 2. Быстрый деплой через скрипт

#### Использование quick-deploy.sh:
```bash
# На сервере
cd /opt/spor3s-app

# Деплой всех изменений
./quick-deploy.sh

# Деплой конкретных файлов
./quick-deploy.sh emergency_server.js app/page.tsx
```

### 3. Через Portainer (графический интерфейс)

#### Обновление через веб-интерфейс:
1. Открыть браузер → `http://your-domain.com:9000`
2. Перейти в **Stacks** → выбрать `spor3s-app`
3. Нажать **Update the stack**
4. Загрузить обновленный `docker-compose.yml`
5. Нажать **Update the stack**

#### Прямое редактирование файлов:
1. В Portainer перейти в **Containers**
2. Выбрать контейнер `spor3s-nextjs`
3. Нажать **Console**
4. Редактировать файлы:
```bash
nano /app/emergency_server.js
# внести изменения
# Ctrl+X, Y, Enter для сохранения
```

### 4. Через SCP (загрузка файлов)

#### Загрузка измененных файлов:
```powershell
# В PowerShell на Windows:
scp C:\path\to\modified\file.js root@your-server-ip:/opt/spor3s-app/
scp C:\path\to\modified\emergency_server.js root@your-server-ip:/opt/spor3s-app/
```

#### Перезапуск после загрузки:
```bash
# На сервере:
cd /opt/spor3s-app
docker-compose restart spor3s-nextjs
docker-compose restart spor3s-emergency
```

### 5. Через WinSCP (графический файловый менеджер)

1. Открыть WinSCP
2. Подключиться к серверу
3. Перейти в `/opt/spor3s-app`
4. Перетащить измененные файлы
5. Перезапустить контейнеры через Portainer

## 🚀 Типичные сценарии обновлений

### Обновление Emergency API
```bash
# 1. Отредактировать файл локально
# 2. Загрузить на сервер
scp emergency_server.js root@your-server-ip:/opt/spor3s-app/

# 3. Перезапустить только emergency сервер
ssh root@your-server-ip
cd /opt/spor3s-app
docker-compose restart spor3s-emergency

# 4. Проверить логи
docker-compose logs -f spor3s-emergency
```

### Обновление Next.js приложения
```bash
# 1. Внести изменения в код
# 2. Загрузить файлы
scp -r app/ root@your-server-ip:/opt/spor3s-app/

# 3. Пересобрать и перезапустить
ssh root@your-server-ip
cd /opt/spor3s-app
docker-compose down
docker-compose up -d --build spor3s-nextjs

# 4. Проверить логи
docker-compose logs -f spor3s-nextjs
```

### Обновление конфигурации Nginx
```bash
# 1. Отредактировать nginx конфигурацию
nano nginx-spor3s-app.conf

# 2. Перезапустить nginx контейнер
docker-compose restart spor3s-nginx

# 3. Проверить конфигурацию
docker exec spor3s-nginx nginx -t
```

### Обновление переменных окружения
```bash
# 1. Отредактировать .env файл
nano .env

# 2. Перезапустить все контейнеры
docker-compose down
docker-compose up -d

# 3. Проверить, что переменные загрузились
docker exec spor3s-nextjs env | grep NODE_ENV
```

## 🔧 Полезные команды для отладки

### Просмотр логов
```bash
# Логи всех контейнеров
docker-compose logs -f

# Логи конкретного контейнера
docker-compose logs -f spor3s-nextjs
docker-compose logs -f spor3s-emergency
docker-compose logs -f spor3s-nginx

# Последние 100 строк
docker-compose logs --tail=100 spor3s-nextjs
```

### Проверка статуса
```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Проверка доступности
curl -f http://localhost:3000
curl -f http://localhost:5000
```

### Отладка контейнеров
```bash
# Войти в контейнер
docker exec -it spor3s-nextjs sh
docker exec -it spor3s-emergency sh

# Проверить файлы в контейнере
docker exec spor3s-nextjs ls -la /app
docker exec spor3s-emergency ls -la /app
```

## 🔄 Автоматизация обновлений

### Настройка Git hooks
```bash
# На сервере создать post-receive hook
nano /opt/spor3s-app/.git/hooks/post-receive

#!/bin/bash
cd /opt/spor3s-app
git reset --hard
docker-compose down
docker-compose up -d --build
```

### Настройка автоматического деплоя
```bash
# Создать cron задачу для проверки обновлений
crontab -e

# Проверять обновления каждые 5 минут
*/5 * * * * cd /opt/spor3s-app && git pull origin main && docker-compose up -d --build
```

## 🛠️ Откат изменений

### Быстрый откат
```bash
# Откат к предыдущему коммиту
cd /opt/spor3s-app
git reset --hard HEAD~1
docker-compose down
docker-compose up -d --build
```

### Откат через бэкап
```bash
# Восстановление из бэкапа
cd /opt/backups/spor3s-app
tar -xzf spor3s-app-YYYYMMDD-HHMMSS.tar.gz -C /opt/
cd /opt/spor3s-app
docker-compose down
docker-compose up -d --build
```

### Откат через Portainer
1. В Portainer перейти в **Stacks**
2. Выбрать `spor3s-app`
3. Нажать **Redeploy**
4. Выбрать предыдущую версию

## 📊 Мониторинг обновлений

### Проверка после обновления
```bash
# Проверить статус контейнеров
docker-compose ps

# Проверить доступность приложений
curl -f http://localhost:3000
curl -f http://localhost:5000

# Проверить логи на ошибки
docker-compose logs --tail=50 | grep -i error
```

### Настройка алертов
```bash
# Скрипт проверки доступности
nano /opt/check-app.sh

#!/bin/bash
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "App is down!" | mail -s "Alert" admin@your-domain.com
fi
```

## 🎯 Рекомендуемый рабочий процесс

### Для небольших изменений:
1. **Локальная разработка** → внести изменения
2. **Тестирование** → проверить локально
3. **Загрузка файлов** → через SCP/WinSCP
4. **Перезапуск** → только измененного сервиса
5. **Проверка** → логи и доступность

### Для крупных изменений:
1. **Создание ветки** → `git checkout -b feature/major-update`
2. **Разработка** → внести изменения
3. **Тестирование** → локальное тестирование
4. **Коммит и пуш** → `git push origin feature/major-update`
5. **Merge** → слияние в main
6. **Деплой** → `./quick-deploy.sh` на сервере
7. **Мониторинг** → проверка логов и метрик

### Для критических исправлений:
1. **Быстрое исправление** → прямо на сервере
2. **Тестирование** → проверка функциональности
3. **Бэкап** → создание резервной копии
4. **Документирование** → запись изменений
5. **Синхронизация** → обновление локального репозитория

## 📋 Чек-лист обновления

- [ ] Создан бэкап текущей версии
- [ ] Протестированы изменения локально
- [ ] Загружены файлы на сервер
- [ ] Перезапущены необходимые контейнеры
- [ ] Проверены логи на ошибки
- [ ] Проверена доступность приложений
- [ ] Обновлена документация (если нужно)
- [ ] Уведомлена команда об изменениях
