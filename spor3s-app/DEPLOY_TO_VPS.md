# 🚀 ДЕПЛОЙ WEBHOOK НА VPS

## ✅ ЧТО СДЕЛАНО:
1. ✅ Webhook настроен: `https://ai.spor3s.ru/api/telegram-webhook`
2. ✅ Создан файл: `app/api/telegram-webhook/route.ts`
3. ❌ **Файл НЕ загружен на VPS** - endpoint возвращает 404

## 📦 ЧТО НУЖНО ЗАДЕПЛОИТЬ:

### Файл для загрузки:
```
spor3s-app/app/api/telegram-webhook/route.ts
```

## 🚀 ВАРИАНТЫ ДЕПЛОЯ:

### ВАРИАНТ 1: Git Push (РЕКОМЕНДУЕМЫЙ)

```bash
# Локально:
cd C:\Users\User\Documents\spor3s-app\spor3s-app
git add app/api/telegram-webhook/route.ts
git commit -m "Add Telegram webhook endpoint"
git push origin main

# На VPS:
ssh root@ai.spor3s.ru
cd /var/www/spor3s-app
git pull origin main
npm run build
pm2 restart all
```

### ВАРИАНТ 2: SCP (Прямая загрузка)

```bash
# С локальной машины:
scp -r app/api/telegram-webhook root@ai.spor3s.ru:/var/www/spor3s-app/app/api/

# На VPS:
ssh root@ai.spor3s.ru
cd /var/www/spor3s-app
npm run build
pm2 restart all
```

### ВАРИАНТ 3: Прямое создание на VPS

```bash
ssh root@ai.spor3s.ru
cd /var/www/spor3s-app
mkdir -p app/api/telegram-webhook
nano app/api/telegram-webhook/route.ts

# Скопировать содержимое файла route.ts

npm run build
pm2 restart all
```

## 📋 СОДЕРЖИМОЕ ФАЙЛА

Файл находится здесь:
```
C:\Users\User\Documents\spor3s-app\spor3s-app\app\api\telegram-webhook\route.ts
```

## ✅ ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ:

1. **Проверить endpoint:**
```bash
curl https://ai.spor3s.ru/api/telegram-webhook
# Должен вернуть: {"status":"ok","bot":"@Spor3s_bot","webhook":"active"}
```

2. **Проверить webhook:**
```bash
curl "https://api.telegram.org/bot6522297183:AAE60O9EJy8c8SfdbLOsRGb6B06eHYBWLyo/getWebhookInfo"
# pending_update_count должен уменьшаться
```

3. **Тест бота:**
Написать @Spor3s_bot "привет"

## 🔄 АЛЬТЕРНАТИВА: ВЕРНУТЬСЯ К LONG POLLING

Если webhook не работает, можно вернуться к long polling:

```bash
# Удалить webhook
curl -X POST "https://api.telegram.org/bot6522297183:AAE60O9EJy8c8SfdbLOsRGb6B06eHYBWLyo/deleteWebhook"

# Запустить бота на VPS
ssh root@ai.spor3s.ru
cd /var/www/spor3s-app/tg-bot
pm2 start enhanced-bot.js --name spor3s-bot
pm2 save
```

## 📊 ТЕКУЩИЙ СТАТУС:

- **Webhook URL:** https://ai.spor3s.ru/api/telegram-webhook
- **Состояние:** Настроен, но endpoint не найден (404)
- **Ожидающих сообщений:** 12
- **Последняя ошибка:** "Wrong response from the webhook: 404 Not Found"
- **Файл создан:** ✅ Локально
- **Файл на VPS:** ❌ НЕТ

## 🎯 СЛЕДУЮЩИЙ ШАГ:

**СРОЧНО:** Загрузить `telegram-webhook/route.ts` на VPS и перезапустить Next.js приложение!




