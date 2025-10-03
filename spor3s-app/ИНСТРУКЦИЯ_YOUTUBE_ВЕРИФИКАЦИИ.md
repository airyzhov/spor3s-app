# 🚀 Быстрый старт: YouTube Верификация

## ✅ Что добавлено

1. **Новая команда в боте:** `/verify_youtube @spor3s`
2. **Таблица в базе:** `youtube_verification_requests`
3. **API endpoint:** `/api/youtube-verification-status`
4. **Команды модератора:** `/approve_youtube`, `/reject_youtube`

## 🔧 Настройка

### 1. Создайте таблицу в Supabase

Выполните SQL скрипт `create_youtube_verification_table.sql`:

```sql
-- Скопируйте содержимое файла create_youtube_verification_table.sql
-- и выполните в Supabase SQL Editor
```

### 2. Настройте переменные окружения

В файле `tg-bot/.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
MANAGER_CHAT_ID=your_telegram_id  # ID модератора
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Запустите бота

```bash
cd tg-bot
npm run dev
```

## 🧪 Тестирование

### Тест 1: Команда бота

1. Откройте Telegram бота
2. Отправьте: `/verify_youtube @spor3s`
3. Следуйте инструкциям
4. Отправьте скриншот подписки

### Тест 2: Модерация

1. Модератор получит уведомление с фото
2. Подтвердите: `/approve_youtube <user_id>`
3. Или отклоните: `/reject_youtube <user_id>`

### Тест 3: Веб-интерфейс

1. Откройте `test-subscription-system.html`
2. Нажмите "🤖 Проверка через бота"
3. Проверьте результаты в логах

## 📱 Примеры сообщений

### Пользователь отправляет команду:
```
/verify_youtube @spor3s
```

### Бот отвечает:
```
📺 Проверка подписки на YouTube канал @spor3s

🔍 Для подтверждения подписки:

1️⃣ Перейдите на канал: https://www.youtube.com/@spor3s
2️⃣ Убедитесь, что вы подписаны на канал
3️⃣ Отправьте скриншот подписки в этот чат

📸 Скриншот должен показывать:
• Название канала @spor3s
• Кнопку "Подписка" (должна быть активна)
• Или статус "Вы подписаны"

💰 После подтверждения вы получите: +50 SC

⚠️ Внимание: Проверка выполняется вручную модератором в течение 24 часов.
```

### Модератор получает уведомление:
```
📸 НОВАЯ ЗАЯВКА НА ПРОВЕРКУ YOUTUBE ПОДПИСКИ!

👤 Пользователь: Иван Иванов (@ivan)
🆔 Telegram ID: 123456789
🆔 User ID: uuid-here

📸 Скриншот: https://api.telegram.org/file/bot...

✅ Для подтверждения: /approve_youtube uuid-here
❌ Для отклонения: /reject_youtube uuid-here

🕐 Время: 15.12.2024, 14:30:25
```

## 🔍 Проверка статуса

### API запрос:
```javascript
fetch('/api/youtube-verification-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: 'uuid' })
})
```

### Ответ:
```json
{
  "success": true,
  "hasReceivedBonus": false,
  "verificationRequest": {
    "id": "uuid",
    "status": "screenshot_received",
    "created_at": "2024-12-15T11:30:00Z"
  },
  "status": "screenshot_received"
}
```

## 🚨 Возможные проблемы

### 1. Бот не отвечает
- Проверьте `TELEGRAM_BOT_TOKEN`
- Убедитесь, что бот запущен
- Проверьте логи в консоли

### 2. Ошибка базы данных
- Выполните SQL скрипт создания таблицы
- Проверьте `SUPABASE_URL` и `SUPABASE_ANON_KEY`
- Убедитесь в правах доступа

### 3. Модератор не получает уведомления
- Проверьте `MANAGER_CHAT_ID`
- Убедитесь, что ID указан правильно
- Проверьте, что модератор не заблокировал бота

### 4. Бонус не начисляется
- Проверьте API `/api/subscribe-bonus`
- Убедитесь, что пользователь существует в базе
- Проверьте логи сервера

## 📊 Статусы заявок

- `pending` - ожидание скриншота
- `screenshot_received` - скриншот получен
- `approved` - подтверждено модератором
- `rejected` - отклонено модератором

## 🎯 Готово к использованию!

Система полностью готова для реальной проверки YouTube подписок через Telegram бота с ручной модерацией. 