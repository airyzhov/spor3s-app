# Рабочий процесс разработки Spor3s App

## Структура разработки

### Локальная разработка
```
spor3s-app/
├── app/                    # Next.js App Router
├── components/             # React компоненты
├── lib/                    # Утилиты и конфигурации
├── api/                    # API роуты
├── emergency_server.js     # Express сервер
├── miniapp_server.js       # Mini App сервер
└── package.json
```

### Продакшн сервер
```
/var/www/spor3s-app/        # Основная директория
├── .env.production         # Продакшн переменные
├── ecosystem.config.js     # PM2 конфигурация
└── deploy.sh              # Скрипт деплоя
```

## Рабочий процесс внесения правок

### 1. Локальная разработка

#### Настройка локального окружения
```bash
# Клонирование репозитория
git clone <repository-url>
cd spor3s-app

# Установка зависимостей
npm install

# Создание .env.local
cp .env.example .env.local
# Отредактировать переменные

# Запуск в режиме разработки
npm run dev
```

#### Структура веток
```
main                    # Продакшн версия
├── develop            # Основная ветка разработки
├── feature/new-feature # Ветки для новых функций
└── hotfix/critical-bug # Критические исправления
```

### 2. Процесс внесения изменений

#### Создание новой функции
```bash
# Создание ветки
git checkout -b feature/new-feature

# Разработка
# ... внесение изменений ...

# Тестирование
npm run test
npm run build

# Коммит изменений
git add .
git commit -m "feat: add new feature"

# Пуш в репозиторий
git push origin feature/new-feature
```

#### Создание Pull Request
1. Перейти на GitHub/GitLab
2. Создать Pull Request из `feature/new-feature` в `develop`
3. Добавить описание изменений
4. Пройти code review
5. Merge в `develop`

### 3. Деплой на продакшн

#### Автоматический деплой (рекомендуется)
```bash
# На сервере
cd /var/www/spor3s-app
./deploy.sh production
```

#### Ручной деплой
```bash
# Подключение к серверу
ssh user@your-server

# Переход в директорию проекта
cd /var/www/spor3s-app

# Остановка приложений
pm2 stop all

# Обновление кода
git pull origin main

# Установка зависимостей
npm ci --only=production

# Сборка проекта
npm run build

# Запуск приложений
pm2 start ecosystem.config.js

# Проверка статуса
pm2 status
```

### 4. Мониторинг и отладка

#### Просмотр логов
```bash
# PM2 логи
pm2 logs                    # Все логи
pm2 logs spor3s-nextjs      # Только Next.js
pm2 logs spor3s-emergency   # Только Emergency сервер

# Nginx логи
sudo tail -f /var/log/nginx/spor3s-app-access.log
sudo tail -f /var/log/nginx/spor3s-app-error.log

# Системные логи
sudo journalctl -u nginx -f
sudo journalctl -u pm2-spor3s -f
```

#### Мониторинг ресурсов
```bash
# PM2 мониторинг
pm2 monit

# Системные ресурсы
htop
df -h
free -h
```

### 5. Откат изменений

#### Быстрый откат
```bash
# Откат к предыдущей версии
cd /var/www/spor3s-app
git log --oneline -5  # Просмотр последних коммитов
git reset --hard <commit-hash>
./deploy.sh production
```

#### Откат через бэкап
```bash
# Восстановление из бэкапа
cd /var/backups/spor3s-app
ls -la  # Просмотр доступных бэкапов
tar -xzf spor3s-app-YYYYMMDD-HHMMSS.tar.gz -C /var/www/
./deploy.sh production
```

## Типичные задачи разработки

### Добавление нового API endpoint

#### 1. Создание API роута
```typescript
// app/api/new-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Логика обработки
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Логика обработки
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

#### 2. Тестирование
```bash
# Локальное тестирование
curl -X GET http://localhost:3000/api/new-endpoint
curl -X POST http://localhost:3000/api/new-endpoint \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Изменение базы данных

#### 1. Создание миграции
```sql
-- migrations/add_new_table.sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавление RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

#### 2. Применение миграции
```bash
# Локально
psql -h localhost -U postgres -d spor3s_db -f migrations/add_new_table.sql

# На продакшне (через Supabase Dashboard)
# Или через CLI
supabase db push
```

### Обновление Telegram Bot

#### 1. Изменение логики бота
```javascript
// В emergency_server.js или miniapp_server.js
// Добавить новую логику обработки сообщений
```

#### 2. Обновление webhook
```bash
# Обновление webhook URL
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/telegram-webhook"
```

## Безопасность

### Переменные окружения
```bash
# Никогда не коммитить секреты
# Добавить в .gitignore
.env
.env.local
.env.production
```

### Проверка безопасности
```bash
# Аудит зависимостей
npm audit
npm audit fix

# Проверка уязвимостей
npm install -g audit-ci
audit-ci --moderate
```

## CI/CD (опционально)

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.4
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /var/www/spor3s-app
            ./deploy.sh production
```

## Полезные команды

### Разработка
```bash
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка проекта
npm run start        # Запуск продакшн версии
npm run lint         # Проверка кода
npm run test         # Запуск тестов
```

### Сервер
```bash
pm2 status           # Статус приложений
pm2 restart all      # Перезапуск всех приложений
pm2 logs             # Просмотр логов
pm2 monit            # Мониторинг
nginx -t             # Проверка конфигурации Nginx
systemctl reload nginx # Перезагрузка Nginx
```

### Отладка
```bash
# Проверка портов
netstat -tlnp | grep :3000
netstat -tlnp | grep :5000

# Проверка процессов
ps aux | grep node
ps aux | grep nginx

# Проверка файрвола
ufw status
iptables -L
```
