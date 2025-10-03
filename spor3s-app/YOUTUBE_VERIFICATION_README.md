# 🤖 YouTube Верификация через Telegram Бота

## 📋 Обзор

Добавлена новая команда `/verify_youtube @spor3s` в Telegram бота для реальной проверки подписки на YouTube канал через скриншоты и модерацию.

## 🎯 Проблема

YouTube не предоставляет публичное API для проверки подписки пользователя на канал. Это ограничение безопасности YouTube.

## ✅ Решение

Реализована система верификации через Telegram бота с ручной модерацией:

### 🔄 Процесс верификации

1. **Пользователь отправляет команду:**
   ```
   /verify_youtube @spor3s
   ```

2. **Бот дает инструкции:**
   - Перейти на https://www.youtube.com/@spor3s
   - Убедиться в подписке
   - Отправить скриншот

3. **Пользователь отправляет скриншот**
   - Бот сохраняет фото
   - Уведомляет модератора

4. **Модератор проверяет:**
   - Получает уведомление с фото
   - Проверяет наличие подписки
   - Подтверждает или отклоняет

5. **Автоматическое начисление:**
   - При подтверждении: +50 SC
   - Уведомление пользователя

## 🛠 Техническая реализация

### 📊 База данных

Создана таблица `youtube_verification_requests`:

```sql
CREATE TABLE youtube_verification_requests (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    telegram_id TEXT,
    status TEXT CHECK (status IN ('pending', 'screenshot_received', 'approved', 'rejected')),
    screenshot_url TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    approved_by TEXT,
    rejected_by TEXT
);
```

### 🤖 Команды бота

#### Для пользователей:
- `/verify_youtube @spor3s` - начать проверку подписки

#### Для модераторов:
- `/approve_youtube <user_id>` - подтвердить подписку
- `/reject_youtube <user_id>` - отклонить заявку

### 🔌 API Endpoints

#### `/api/youtube-verification-status`
```typescript
POST /api/youtube-verification-status
{
  "user_id": "uuid"
}

Response:
{
  "success": true,
  "hasReceivedBonus": boolean,
  "verificationRequest": object | null,
  "status": "pending" | "screenshot_received" | "approved" | "rejected" | "no_request"
}
```

## 📱 Пользовательский интерфейс

### В Telegram боте:

1. **Команда `/verify_youtube @spor3s`:**
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

2. **После отправки скриншота:**
   ```
   📸 Скриншот получен! Модератор проверит вашу подписку в течение 24 часов. Вы получите уведомление о результате.
   ```

3. **При подтверждении:**
   ```
   ✅ Ваша подписка на YouTube канал @spor3s подтверждена!

   💰 Начислено: +50 SC

   Спасибо за подписку! 🍄
   ```

### В веб-приложении:

Добавлена кнопка "🤖 Проверка через бота" в тестовой странице для тестирования новой функциональности.

## 🔧 Настройка

### Переменные окружения

Убедитесь, что в `.env` файле бота настроены:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
MANAGER_CHAT_ID=your_manager_telegram_id
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Создание таблицы

Выполните SQL скрипт:

```sql
-- Создание таблицы для заявок на проверку YouTube подписок
CREATE TABLE IF NOT EXISTS youtube_verification_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'screenshot_received', 'approved', 'rejected')),
    screenshot_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    approved_by TEXT,
    rejected_by TEXT,
    
    -- Индексы для быстрого поиска
    CONSTRAINT idx_youtube_verification_user_status UNIQUE (user_id, status)
);
```

## 🧪 Тестирование

### Тестовая страница

Откройте `test-subscription-system.html` для тестирования:

1. **Тест обычной подписки** - проверяет API `/api/subscribe-bonus`
2. **Тест через бота** - проверяет API `/api/youtube-verification-status`
3. **Массовое тестирование** - запускает все тесты

### Ручное тестирование

1. **В Telegram боте:**
   ```
   /verify_youtube @spor3s
   ```

2. **Отправьте скриншот** подписки на YouTube

3. **Модератор получит уведомление** и сможет подтвердить/отклонить

## 📈 Статистика

Система отслеживает:

- Количество заявок на верификацию
- Статусы заявок (pending, screenshot_received, approved, rejected)
- Время обработки
- Успешность верификации

## 🔒 Безопасность

- Проверка прав модератора через `MANAGER_CHAT_ID`
- Уникальные ограничения в базе данных
- Валидация статусов заявок
- Логирование всех действий

## 🚀 Преимущества

1. **Реальная проверка** - модератор видит скриншот
2. **Автоматизация** - бонус начисляется автоматически
3. **Удобство** - все через Telegram
4. **Безопасность** - проверка прав доступа
5. **Отслеживание** - полная история заявок

## 🔄 Следующие шаги

1. **Запустить бота** с новыми командами
2. **Создать таблицу** в Supabase
3. **Настроить модератора** (указать `MANAGER_CHAT_ID`)
4. **Протестировать** функциональность
5. **Интегрировать** в основное приложение

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи бота
2. Убедитесь в правильности настроек
3. Проверьте права доступа модератора
4. Проверьте подключение к базе данных 