-- Проверка структуры таблицы orders
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Проверка структуры таблицы sc_transactions (вместо coin_transactions)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sc_transactions'
ORDER BY ordinal_position;

-- Проверка структуры таблицы users
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Проверка существующих данных в таблице orders (первые 3 записи)
SELECT * FROM orders LIMIT 3;

-- Проверка всех таблиц в схеме
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name; 