-- Полный SQL скрипт для исправления всех проблем с базой данных
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Удаляем существующие таблицы с неправильной структурой
DROP TABLE IF EXISTS daily_checkins CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS instructions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;

-- 2. Создаем таблицу users с правильной структурой
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Создаем таблицу orders с правильной структурой
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    items JSONB,
    total INTEGER,
    address TEXT,
    fio TEXT,
    phone TEXT,
    referral_code TEXT,
    comment TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    spores_coin INTEGER DEFAULT 0,
    tracking_number TEXT,
    start_date TIMESTAMP WITH TIME ZONE
);

-- 4. Создаем таблицу daily_checkins
CREATE TABLE daily_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Создаем таблицу products
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    image TEXT
);

-- 6. Создаем таблицу instructions
CREATE TABLE instructions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    content TEXT,
    tags TEXT,
    url TEXT
);

-- 7. Создаем таблицу messages
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Создаем таблицу surveys
CREATE TABLE surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Включаем RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- 10. Создаем политики для users
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- 11. Создаем политики для orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 12. Создаем политики для daily_checkins
CREATE POLICY "Users can view their own checkins" ON daily_checkins
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own checkins" ON daily_checkins
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 13. Создаем политики для остальных таблиц (публичный доступ для чтения)
CREATE POLICY "Public read access to products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Public read access to instructions" ON instructions
    FOR SELECT USING (true);

-- 14. Добавляем тестовые данные для products
INSERT INTO products (id, name, price, description, image) VALUES
('ezh100', 'Ежовик гребенчатый 100мг', 2500, 'Грибной экстракт для улучшения когнитивных функций и памяти', '/products/ezh100.jpg'),
('lion100', 'Львиная грива 100мг', 2200, 'Поддерживает здоровье нервной системы и концентрацию', '/products/lion100.jpg'),
('reishi100', 'Рейши 100мг', 1800, 'Адаптоген для укрепления иммунитета и снижения стресса', '/products/reishi100.jpg');

-- 15. Проверяем структуру таблицы users
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 16. Проверяем структуру таблицы orders
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position; 