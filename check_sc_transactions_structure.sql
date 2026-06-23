-- Детальная проверка структуры таблицы sc_transactions
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sc_transactions'
ORDER BY ordinal_position;

-- Проверка существующих данных в таблице sc_transactions (первые 3 записи)
SELECT * FROM sc_transactions LIMIT 3;

-- Проверка всех таблиц в схеме
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name; 