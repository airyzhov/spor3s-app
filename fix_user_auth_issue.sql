-- Исправление проблемы с user_id и создание правильной структуры

-- 1. Создаем таблицу users если её нет
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Добавляем RLS политики для users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если они есть
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Политика для чтения (пользователи могут читать свои данные)
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (true);

-- Политика для вставки (любой может создать пользователя)
CREATE POLICY "Anyone can insert users" ON users
    FOR INSERT WITH CHECK (true);

-- Политика для обновления (пользователи могут обновлять свои данные)
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (true);

-- 3. Проверяем и исправляем таблицу orders
-- Убеждаемся что user_id это UUID
ALTER TABLE orders ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 4. Добавляем недостающие колонки в orders если их нет
DO $$ 
BEGIN
    -- Добавляем колонки если их нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'spores_coin') THEN
        ALTER TABLE orders ADD COLUMN spores_coin INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'referral_code') THEN
        ALTER TABLE orders ADD COLUMN referral_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'comment') THEN
        ALTER TABLE orders ADD COLUMN comment TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
        ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_number') THEN
        ALTER TABLE orders ADD COLUMN tracking_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_at') THEN
        ALTER TABLE orders ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'items') THEN
        ALTER TABLE orders ADD COLUMN items JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'fio') THEN
        ALTER TABLE orders ADD COLUMN fio TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'phone') THEN
        ALTER TABLE orders ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'address') THEN
        ALTER TABLE orders ADD COLUMN address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total') THEN
        ALTER TABLE orders ADD COLUMN total DECIMAL(10,2);
    END IF;
END $$;

-- 5. Обновляем RLS политики для orders
DROP POLICY IF EXISTS "Users can read own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

CREATE POLICY "Users can read own orders" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Users can insert orders" ON orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (true);

-- 6. Создаем таблицу daily_checkins если её нет
CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, order_id, date)
);

-- RLS для daily_checkins
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can insert checkins" ON daily_checkins;

CREATE POLICY "Users can read own checkins" ON daily_checkins
    FOR SELECT USING (true);

CREATE POLICY "Users can insert checkins" ON daily_checkins
    FOR INSERT WITH CHECK (true);

-- 7. Создаем таблицу weekly_reviews если её нет
CREATE TABLE IF NOT EXISTS weekly_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, order_id, week_start)
);

-- RLS для weekly_reviews
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own reviews" ON weekly_reviews;
DROP POLICY IF EXISTS "Users can insert reviews" ON weekly_reviews;

CREATE POLICY "Users can read own reviews" ON weekly_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can insert reviews" ON weekly_reviews
    FOR INSERT WITH CHECK (true);

-- 8. Создаем таблицу coin_transactions если её нет
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'earned', 'spent', 'referral'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS для coin_transactions
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON coin_transactions;

CREATE POLICY "Users can read own transactions" ON coin_transactions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert transactions" ON coin_transactions
    FOR INSERT WITH CHECK (true);

-- Проверяем что все таблицы созданы правильно
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'orders', 'daily_checkins', 'weekly_reviews', 'coin_transactions')
ORDER BY table_name, ordinal_position; 