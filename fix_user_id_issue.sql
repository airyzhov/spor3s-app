-- SQL для проверки и исправления проблемы с user_id
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

-- 4. Если в orders есть неправильные user_id (числа вместо UUID), исправляем их
-- Сначала находим проблемные записи
SELECT o.id, o.user_id::text, u.id as correct_user_id, u.telegram_id
FROM orders o
LEFT JOIN users u ON u.telegram_id = o.user_id::text
WHERE o.user_id::text ~ '^[0-9]+$' AND u.id IS NOT NULL;

-- 5. Обновляем неправильные user_id в orders
UPDATE orders 
SET user_id = u.id
FROM users u 
WHERE orders.user_id::text ~ '^[0-9]+$' 
  AND u.telegram_id = orders.user_id::text
  AND u.id IS NOT NULL;

-- 6. Проверяем результат
SELECT id, user_id, total, status, created_at FROM orders LIMIT 10;

-- 7. Если есть записи с неправильными user_id, которые не удалось исправить, удаляем их
-- (опционально, раскомментируйте если нужно)
-- DELETE FROM orders WHERE user_id::text ~ '^[0-9]+$';

-- 8. Проверяем, что все user_id теперь UUID
SELECT COUNT(*) as total_orders,
       COUNT(CASE WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as valid_uuid_orders
FROM orders; 