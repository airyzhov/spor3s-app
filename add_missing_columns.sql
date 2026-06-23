-- Добавление недостающих колонок в таблицу orders
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Добавляем колонку spores_coin (баланс монет пользователя)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS spores_coin INTEGER DEFAULT 0;

-- 2. Добавляем колонку tracking_number (номер отслеживания)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- 3. Добавляем колонку start_date (дата начала курса)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- 4. Добавляем колонку status (статус заказа)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 5. Добавляем колонку fio (ФИО получателя)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fio TEXT;

-- 6. Добавляем колонку phone (телефон получателя)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 7. Добавляем колонку address (адрес доставки)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS address TEXT;

-- 8. Добавляем колонку referral_code (реферальный код)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- 9. Добавляем колонку comment (комментарий к заказу)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS comment TEXT;

-- 10. Добавляем колонку created_at (дата создания заказа)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 11. Убеждаемся, что telegram_id в таблице users имеет тип TEXT
ALTER TABLE users 
ALTER COLUMN telegram_id TYPE TEXT;

-- Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position; 