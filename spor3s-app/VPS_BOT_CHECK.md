# 🔍 ПРОВЕРКА БОТА НА VPS

## 🎯 ЗАДАЧА
Бот @Spor3s_bot не отвечает. Нужно проверить на VPS `ai.spor3s.ru`

## 📋 ЧТО ПРОВЕРИТЬ НА VPS:

### 1. Подключение к VPS
```bash
ssh root@ai.spor3s.ru
# или
ssh ubuntu@ai.spor3s.ru
```

### 2. Проверка запущенных процессов
```bash
# Найти процессы Node.js
ps aux | grep node

# Проверить PM2 процессы
pm2 list

# Проверить systemd сервисы
systemctl status spor3s-bot
systemctl status spor3z-bot
```

### 3. Проверка логов
```bash
# PM2 логи
pm2 logs spor3s-bot
pm2 logs spor3z-bot

# Systemd логи
journalctl -u spor3s-bot -f
journalctl -u spor3z-bot -f

# Файловые логи
tail -f /var/log/spor3s-bot.log
```

### 4. Проверка конфигурации
```bash
cd /var/www/spor3s-app  # или путь к проекту
cat env.local

# Проверить правильность:
# NEXT_PUBLIC_BASE_URL=https://ai.spor3s.ru
# TELEGRAM_BOT_TOKEN=6522297183:...
```

### 5. Проверка API
```bash
curl -X POST https://ai.spor3s.ru/api/ai \
  -H "Content-Type: application/json" \
  -d '{"message":"тест","source":"telegram_bot"}'
```

### 6. Тест подключения бота
```bash
cd /var/www/spor3s-app/tg-bot
node test-bot.js
```

## 🔧 ТИПИЧНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ:

### Проблема 1: Бот не запущен
```bash
# PM2
pm2 start enhanced-bot.js --name spor3s-bot

# Systemd
systemctl start spor3s-bot
```

### Проблема 2: Неправильный API URL
```bash
nano env.local
# Изменить на: NEXT_PUBLIC_BASE_URL=https://ai.spor3s.ru
pm2 restart spor3s-bot
```

### Проблема 3: Проблемы с зависимостями
```bash
cd /var/www/spor3s-app
npm install
cd tg-bot
npm install
pm2 restart all
```

### Проблема 4: Webhook конфликт
```bash
# Удалить webhook если есть
curl -X POST https://api.telegram.org/bot6522297183:AAE60O9EJy8c8SfdbLOsRGb6B06eHYBWLyo/deleteWebhook
```

## 🚀 ПЕРЕЗАПУСК БОТА:

```bash
# Остановить
pm2 stop spor3s-bot

# Обновить код (если нужно)
git pull origin main

# Запустить
pm2 start tg-bot/enhanced-bot.js --name spor3s-bot

# Сохранить конфигурацию
pm2 save
```

## 📊 МОНИТОРИНГ:

```bash
# Статус всех процессов
pm2 status

# Использование ресурсов
pm2 monit

# Логи в реальном времени
pm2 logs --lines 100
```

## 🆘 КРИТИЧЕСКОЕ РЕШЕНИЕ:

Если бот совсем не работает:

```bash
# 1. Убить все процессы
pm2 delete all

# 2. Перезапустить с нуля
cd /var/www/spor3s-app
pm2 start ecosystem.config.js

# или
pm2 start tg-bot/enhanced-bot.js --name spor3s-bot
pm2 start start-spor3z-improved.js --name spor3z-bot

# 3. Сохранить и настроить автозапуск
pm2 save
pm2 startup
```

---

**Следующий шаг:** Подключиться к VPS и выполнить диагностику


