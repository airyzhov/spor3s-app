-- Проверка структуры таблицы orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Проверка существующих данных в таблице orders
SELECT * FROM orders LIMIT 5; 