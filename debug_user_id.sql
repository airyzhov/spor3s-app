-- Простая диагностика проблемы с user_id
-- Проблема: invalid input syntax for type uuid: "54993853"

-- 1. Проверяем структуру таблицы users
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Проверяем данные в таблице users
SELECT id, telegram_id, name, created_at FROM users LIMIT 10;

-- 3. Проверяем данные в таблице orders (если есть)
SELECT id, user_id, total, status, created_at FROM orders LIMIT 10;

-- 4. Проверяем, есть ли записи с числовыми user_id
SELECT COUNT(*) as numeric_user_ids
FROM orders 
WHERE user_id::text ~ '^[0-9]+$';

-- 5. Показываем проблемные записи
SELECT id, user_id::text as user_id_text, total, status, created_at 
FROM orders 
WHERE user_id::text ~ '^[0-9]+$'
LIMIT 5; 