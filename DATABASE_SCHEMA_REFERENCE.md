# СТРУКТУРА БАЗЫ ДАННЫХ SUPABASE - ПРОЕКТ SPOR3S-APP
## Справочник структуры на момент анализа для 3-канальной системы

### ОСНОВНЫЕ ТАБЛИЦЫ ДЛЯ 3-КАНАЛЬНОЙ СИСТЕМЫ

#### 🔑 USERS - Центральная таблица пользователей
```sql
users (
    id UUID PRIMARY KEY (gen_random_uuid()),
    telegram_id TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE (now())
)
```
- **Роль**: Основа синхронизации между всеми каналами
- **Ключевое поле**: `telegram_id` - связывает Mini App, Bot, Spor3z

#### 💬 MESSAGES - RAG система сообщений
```sql
messages (
    id UUID PRIMARY KEY (gen_random_uuid()),
    user_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE (now()),
    role TEXT DEFAULT 'user'
)
```
- **Статус**: ❌ Отсутствует колонка `source` для разделения каналов
- **Нужно добавить**: `source TEXT` (mini_app, telegram_bot, spor3z)

#### 🛒 ORDERS - Система заказов
```sql
orders (
    id UUID PRIMARY KEY (gen_random_uuid()),
    user_id UUID,
    items JSONB,
    total INTEGER,
    address TEXT,
    fio TEXT,
    phone TEXT,
    referral_code TEXT,
    comment TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE (now()),
    spores_coin INTEGER DEFAULT 0,
    tracking_number TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    coins_spent INTEGER DEFAULT 0,
    course_start_date DATE
)
```
- **Статус**: ✅ Полностью готова для Mini App

#### 🔗 TG_LINK_CODES - Связывание аккаунтов
```sql
tg_link_codes (
    id UUID PRIMARY KEY (gen_random_uuid()),
    auth_code VARCHAR(20) NOT NULL,
    user_id UUID,
    telegram_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE (now()),
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false
)
```
- **Статус**: ✅ Готова для связывания Bot ↔ Mini App

#### 📦 PRODUCTS - Каталог товаров
```sql
products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    image TEXT
)
```
- **Статус**: ✅ Готова для всех каналов

### ДОПОЛНИТЕЛЬНЫЕ ТАБЛИЦЫ ГЕЙМИФИКАЦИИ

#### 🏆 USER_LEVELS - Система уровней
```sql
user_levels (
    id UUID PRIMARY KEY,
    user_id UUID,
    current_level VARCHAR(50) DEFAULT '🌱 Новичок',
    level_code VARCHAR(20) DEFAULT 'novice',
    total_sc_earned INTEGER DEFAULT 0,
    total_sc_spent INTEGER DEFAULT 0,
    current_sc_balance INTEGER DEFAULT 0,
    total_orders_amount NUMERIC(10) DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    has_motivational_habit BOOLEAN DEFAULT false,
    has_expert_chat_access BOOLEAN DEFAULT false,
    has_permanent_discount BOOLEAN DEFAULT false,
    has_vip_access BOOLEAN DEFAULT false,
    level_achieved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE (now()),
    updated_at TIMESTAMP WITH TIME ZONE (now())
)
```

#### 💰 SC_TRANSACTIONS - Транзакции SporesCoin
```sql
sc_transactions (
    id UUID PRIMARY KEY,
    user_id UUID,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    source_type VARCHAR(50),
    source_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE (now())
)
```

#### ✅ DAILY_CHECKINS - Ежедневные чекины
```sql
daily_checkins (
    id UUID PRIMARY KEY,
    user_id UUID,
    order_id UUID,
    date TIMESTAMP WITH TIME ZONE (now())
)
```

### ПОЛНЫЙ СПИСОК ТАБЛИЦ (17 штук)
1. **users** - Пользователи
2. **messages** - Сообщения RAG
3. **orders** - Заказы
4. **products** - Товары
5. **tg_link_codes** - Коды связывания
6. **user_levels** - Уровни пользователей
7. **sc_transactions** - Транзакции монет
8. **daily_checkins** - Чекины
9. **challenges** - Челленджи
10. **coin_transactions** - Транзакции монет (старая)
11. **daily_activities** - Ежедневная активность
12. **instructions** - Инструкции
13. **level_config** - Конфигурация уровней
14. **notification_consent** - Согласие на уведомления
15. **reminders** - Напоминания
16. **sc_transactions** - Транзакции SporesCoin
17. **supplement_checkins** - Чекины добавок
18. **surveys** - Опросы
19. **weekly_reviews** - Недельные отчеты
20. **youtube_verification_requests** - Запросы верификации YouTube

### ЧТО НУЖНО ДОБАВИТЬ ДЛЯ 3-КАНАЛЬНОЙ СИСТЕМЫ

#### ❌ ОТСУТСТВУЕТ: AI_AGENT_STATUS
```sql
-- НУЖНО СОЗДАТЬ:
ai_agent_status (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id),
    telegram_id TEXT UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    auto_mode BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

#### ❌ ОТСУТСТВУЕТ: КОЛОНКА SOURCE В MESSAGES
```sql
-- НУЖНО ДОБАВИТЬ:
ALTER TABLE messages ADD COLUMN source TEXT DEFAULT 'mini_app';
-- Возможные значения: 'mini_app', 'telegram_bot', 'spor3z'
```

### АРХИТЕКТУРА 3-КАНАЛЬНОЙ СИСТЕМЫ

#### 📱 КАНАЛ 1: TELEGRAM MINI APP
- **Таблицы**: users, orders, products, messages (source='mini_app')
- **Функции**: Заказы, корзина, каталог, история
- **Авторизация**: Telegram WebApp initData

#### 🤖 КАНАЛ 2: SPOR3S_BOT
- **Таблицы**: users, messages (source='telegram_bot'), orders
- **Функции**: AI диалоги, консультации, добавление в корзину
- **Авторизация**: Telegram Bot API

#### 👤 КАНАЛ 3: SPOR3Z (ЖИВОЙ АККАУНТ)
- **Таблицы**: users, messages (source='spor3z'), ai_agent_status, reminders
- **Функции**: Рассылки, напоминания, AI агент с управлением старт/стоп
- **Авторизация**: Telegram Client API

### СИНХРОНИЗАЦИЯ МЕЖДУ КАНАЛАМИ
- **Общий ключ**: `users.telegram_id` (TEXT)
- **Связывание**: `tg_link_codes` таблица для auth кодов
- **RAG база**: `messages` с разделением по `source`
- **Заказы**: Общие для всех каналов через `user_id`

---
*Документ создан для справки при разработке 3-канальной системы общения*
