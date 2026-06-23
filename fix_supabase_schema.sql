-- Полный SQL скрипт для исправления структуры Supabase
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Исправляем тип telegram_id в таблице users
ALTER TABLE users 
ALTER COLUMN telegram_id TYPE TEXT;

-- 2. Добавляем все недостающие колонки в таблицу orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS spores_coin INTEGER DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fio TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS referral_code TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS comment TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Создаем таблицу daily_checkins если её нет
CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Создаем таблицу products если её нет
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    image TEXT
);

-- 5. Создаем таблицу instructions если её нет
CREATE TABLE IF NOT EXISTS instructions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    content TEXT,
    tags TEXT,
    url TEXT
);

-- 6. Создаем таблицу messages если её нет
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Создаем таблицу surveys если её нет
CREATE TABLE IF NOT EXISTS surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Настраиваем RLS (Row Level Security) для всех таблиц
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- 9. Создаем политики для orders
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
CREATE POLICY "Users can insert their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 10. Создаем политики для users
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- 11. Создаем политики для daily_checkins
DROP POLICY IF EXISTS "Users can view their own checkins" ON daily_checkins;
CREATE POLICY "Users can view their own checkins" ON daily_checkins
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own checkins" ON daily_checkins;
CREATE POLICY "Users can insert their own checkins" ON daily_checkins
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 12. Создаем политики для остальных таблиц (публичный доступ для чтения)
DROP POLICY IF EXISTS "Public read access to products" ON products;
CREATE POLICY "Public read access to products" ON products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access to instructions" ON instructions;
CREATE POLICY "Public read access to instructions" ON instructions
    FOR SELECT USING (true);

-- 13. Проверяем структуру таблицы orders
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position; 