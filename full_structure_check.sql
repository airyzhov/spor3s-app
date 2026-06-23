-- ПОЛНАЯ СТРУКТУРА БАЗЫ ДАННЫХ - ВСЕ ТАБЛИЦЫ И КОЛОНКИ
-- ========================================================

-- Показать ВСЕ таблицы и их колонки в одном запросе
SELECT 
    t.table_name as table_name,
    c.column_name as column_name,
    c.data_type as data_type,
    CASE 
        WHEN c.character_maximum_length IS NOT NULL 
        THEN c.data_type || '(' || c.character_maximum_length || ')'
        WHEN c.numeric_precision IS NOT NULL 
        THEN c.data_type || '(' || c.numeric_precision || ')'
        ELSE c.data_type 
    END as full_type,
    c.is_nullable as nullable,
    COALESCE(c.column_default, 'NULL') as default_value,
    c.ordinal_position as position
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;
