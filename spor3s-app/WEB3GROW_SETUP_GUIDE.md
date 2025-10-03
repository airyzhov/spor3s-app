# 🤖 ПОЛНОЕ РУКОВОДСТВО: ИНТЕГРАЦИЯ @web3grow

## 🎯 Цель проекта
Настроить автоматизацию личных сообщений через аккаунт @web3grow для:
- ✅ Персонализированных консультаций по продуктам
- ✅ Автоматических напоминаний и follow-up
- ✅ Допродаж и повышения конверсии
- ✅ Направления в Mini App для оформления заказов
- ✅ Синхронизации с RAG базой знаний

## 📋 Варианты реализации

### **Вариант 1: Кастомный скрипт (Рекомендуемый)**

#### 🚀 Быстрый старт:

1. **Установка зависимостей:**
```bash
cd spor3s-app
npm install telegram @supabase/supabase-js axios
```

2. **Получение Telegram API данных:**
   - Перейдите на https://my.telegram.org
   - Войдите в аккаунт @web3grow
   - Создайте новое приложение
   - Запишите `API_ID` и `API_HASH`

3. **Генерация session string:**
```javascript
// Создайте файл generate-session.js
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');

async function generateSession() {
  const client = new TelegramClient(
    new StringSession(''),
    YOUR_API_ID, // Замените на ваш API_ID
    YOUR_API_HASH, // Замените на ваш API_HASH
    { connectionRetries: 5 }
  );

  await client.start({
    phoneNumber: async () => await input.text('Введите номер телефона @web3grow: '),
    password: async () => await input.text('Введите пароль 2FA (если есть): '),
    phoneCode: async () => await input.text('Введите код из SMS: '),
    onError: (err) => console.log(err),
  });

  console.log('✅ Session string:', client.session.save());
  await client.disconnect();
}

generateSession();
```

4. **Настройка переменных окружения:**
```env
# Telegram API для @web3grow
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_SESSION_STRING=1BQANOTEzOTA1NDU0NDU5NgG7...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# App
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app

# Уведомления менеджера
MANAGER_CHAT_ID=123456789
```

5. **Запуск интеграции:**
```bash
node web3grow-integration.js
```

#### 🔧 Функциональность скрипта:

- **Автоматические ответы** на сообщения пользователей
- **Синхронизация** с Supabase базой данных
- **AI консультации** через существующий API
- **Создание заказов** при намерении покупки
- **Направление в Mini App** для оформления
- **Уведомления менеджера** о новых заказах

### **Вариант 2: n8n Workflow**

#### 🚀 Настройка n8n:

1. **Установка:**
```bash
npm install -g n8n
n8n start
```

2. **Импорт workflow:**
   - Откройте http://localhost:5678
   - Импортируйте `n8n-web3grow-workflow.json`

3. **Настройка переменных:**
```env
TELEGRAM_BOT_TOKEN=your_bot_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

4. **Настройка webhook:**
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-n8n-instance.com/webhook/web3grow",
    "allowed_updates": ["message"]
  }'
```

## 🔄 Синхронизация с RAG базой

### **Обновление AI API для @web3grow:**

```typescript
// app/api/ai/route.ts - добавьте поддержку web3grow
export async function POST(request: Request) {
  const { message, context, source = 'mini_app' } = await request.json();
  
  // Специальная обработка для web3grow
  if (source === 'web3grow') {
    const enhancedContext = `
    Ты консультант @web3grow в Telegram. Отвечай от первого лица, как живой человек.
    
    Контекст: ${context}
    
    Пользователь: ${message}
    
    Ответь как @web3grow, используя эмодзи и дружелюбный тон.
    При упоминании заказа направляй в Mini App.
    `;
    
    // Вызов AI с enhanced контекстом
    const response = await callAI(enhancedContext);
    return Response.json({ response });
  }
  
  // Обычная обработка для Mini App
  // ... существующий код
}
```

## 📱 Сценарии использования

### **1. Первичный контакт:**
```
Пользователь: "Привет, расскажи о ежовике"
@web3grow: "Привет! 👋 Ежовик - это мощная добавка для памяти и концентрации. 
Он улучшает когнитивные функции и помогает сосредоточиться. 
Хочешь узнать больше или сразу заказать? 🧠✨"
```

### **2. Консультация по продуктам:**
```
Пользователь: "Что лучше для сна - мухомор или кордицепс?"
@web3grow: "Отличный вопрос! 😊

🌙 **Мухомор** - идеален для сна и снятия стресса
⚡ **Кордицепс** - для энергии и выносливости

Для сна однозначно мухомор! Он успокаивает нервную систему и улучшает качество сна.

Хочешь попробовать? Могу помочь с заказом! 💤✨"
```

### **3. Создание заказа:**
```
Пользователь: "Хочу заказать мухомор"
@web3grow: "Отлично! 🎉 Создаю заказ для тебя...

📦 **Мухомор** - 1200₽
💤 Для сна и снятия стресса

Переходи в Mini App для оформления:
🔗 [Оформить заказ](https://your-app.vercel.app/order/123)

Там сможешь добавить другие товары и выбрать способ доставки! 🚚"
```

## 🔧 Технические детали

### **Структура сообщений в Supabase:**
```sql
-- Таблица messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  source TEXT DEFAULT 'mini_app', -- 'mini_app', 'web3grow', 'telegram_bot'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Обработка контекста:**
```javascript
// Получение контекста пользователя
async getUserContext(userId) {
  const { data: messages } = await this.supabase
    .from('messages')
    .select('content, role, source')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return messages?.reverse() || [];
}
```

### **Автоматические напоминания:**
```javascript
// Система напоминаний
async sendReminder(userId, type) {
  const reminders = {
    'daily_checkin': 'Не забудь про ежедневный чекин! +5 SC 💰',
    'weekly_survey': 'Пройди еженедельную анкету! +20 SC 📊',
    'order_followup': 'Как тебе заказ? Есть вопросы? 🤔',
    'product_reminder': 'Пора пополнить запасы! 🛒'
  };

  const message = reminders[type];
  if (message) {
    await this.client.sendMessage(chatId, { message });
  }
}
```

## 🚀 Запуск и мониторинг

### **1. Запуск скрипта:**
```bash
# Разработка
node web3grow-integration.js

# Продакшн с PM2
pm2 start web3grow-integration.js --name "web3grow-bot"
pm2 logs web3grow-bot
```

### **2. Мониторинг:**
```javascript
// Логирование активности
console.log(`📨 Новое сообщение от ${telegramId}: ${userMessage}`);
console.log(`🤖 AI ответ: ${aiResponse}`);
console.log(`💾 Сохранено в Supabase`);
```

### **3. Тестирование:**
```bash
# Тест подключения
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"message": "тест", "source": "web3grow"}'
```

## 🔒 Безопасность

### **Важные моменты:**
- ✅ Храните session string в безопасном месте
- ✅ Используйте переменные окружения
- ✅ Ограничьте доступ к API ключам
- ✅ Регулярно обновляйте session string
- ✅ Мониторьте активность аккаунта

### **Резервное копирование:**
```bash
# Экспорт данных
pg_dump your_database > backup.sql

# Восстановление
psql your_database < backup.sql
```

## 📊 Аналитика и метрики

### **Отслеживаемые метрики:**
- Количество сообщений в день
- Конверсия в заказы
- Время ответа AI
- Популярные вопросы
- Эффективность напоминаний

### **SQL запросы для аналитики:**
```sql
-- Активность по дням
SELECT 
  DATE(created_at) as date,
  COUNT(*) as messages,
  COUNT(DISTINCT user_id) as users
FROM messages 
WHERE source = 'web3grow'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Конверсия в заказы
SELECT 
  COUNT(DISTINCT m.user_id) as users_with_messages,
  COUNT(DISTINCT o.user_id) as users_with_orders,
  ROUND(COUNT(DISTINCT o.user_id) * 100.0 / COUNT(DISTINCT m.user_id), 2) as conversion_rate
FROM messages m
LEFT JOIN orders o ON m.user_id = o.user_id
WHERE m.source = 'web3grow';
```

## 🎉 Результат

После настройки у вас будет:
- ✅ Автоматические ответы от @web3grow
- ✅ Синхронизация с Mini App
- ✅ Создание заказов через чат
- ✅ Система напоминаний
- ✅ Аналитика и метрики
- ✅ Масштабируемая архитектура

**Готово к запуску! 🚀** 