-- Проверка структуры таблицы users
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Проверка существующих данных в users (первые 3 записи)
SELECT * FROM users LIMIT 3; 