-- Проверка ограничений на transaction_type в таблице sc_transactions
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'sc_transactions'::regclass 
    AND contype = 'c';

-- Проверка существующих значений transaction_type
SELECT DISTINCT transaction_type 
FROM sc_transactions 
ORDER BY transaction_type;

-- Проверка структуры таблицы sc_transactions
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sc_transactions'
ORDER BY ordinal_position; 