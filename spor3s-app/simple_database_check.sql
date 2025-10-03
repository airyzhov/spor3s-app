-- ПРОСТАЯ ПРОВЕРКА СТРУКТУРЫ БАЗЫ ДАННЫХ
-- =====================================

-- 1. ВСЕ ТАБЛИЦЫ
SELECT 
    'TABLE' as type,
    table_name as name,
    '' as details
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. СТРУКТУРА ТАБЛИЦЫ USERS
SELECT 
    'USERS_COLUMN' as type,
    column_name as name,
    data_type || CASE WHEN character_maximum_length IS NOT NULL 
                  THEN '(' || character_maximum_length || ')' 
                  ELSE '' END as details
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. СТРУКТУРА ТАБЛИЦЫ MESSAGES
SELECT 
    'MESSAGES_COLUMN' as type,
    column_name as name,
    data_type || CASE WHEN character_maximum_length IS NOT NULL 
                  THEN '(' || character_maximum_length || ')' 
                  ELSE '' END as details
FROM information_schema.columns 
WHERE table_name = 'messages' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. СТРУКТУРА ТАБЛИЦЫ ORDERS
SELECT 
    'ORDERS_COLUMN' as type,
    column_name as name,
    data_type || CASE WHEN character_maximum_length IS NOT NULL 
                  THEN '(' || character_maximum_length || ')' 
                  ELSE '' END as details
FROM information_schema.columns 
WHERE table_name = 'orders' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. СТРУКТУРА ТАБЛИЦЫ AI_AGENT_STATUS (если есть)
SELECT 
    'AI_AGENT_STATUS_COLUMN' as type,
    column_name as name,
    data_type || CASE WHEN character_maximum_length IS NOT NULL 
                  THEN '(' || character_maximum_length || ')' 
                  ELSE '' END as details
FROM information_schema.columns 
WHERE table_name = 'ai_agent_status' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. СТРУКТУРА ТАБЛИЦЫ TG_LINK_CODES (если есть)
SELECT 
    'TG_LINK_CODES_COLUMN' as type,
    column_name as name,
    data_type || CASE WHEN character_maximum_length IS NOT NULL 
                  THEN '(' || character_maximum_length || ')' 
                  ELSE '' END as details
FROM information_schema.columns 
WHERE table_name = 'tg_link_codes' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. КОЛИЧЕСТВО ЗАПИСЕЙ
SELECT 
    'COUNT_USERS' as type,
    'users' as name,
    COUNT(*)::text as details
FROM users;

SELECT 
    'COUNT_MESSAGES' as type,
    'messages' as name,
    COUNT(*)::text as details
FROM messages;

SELECT 
    'COUNT_ORDERS' as type,
    'orders' as name,
    COUNT(*)::text as details
FROM orders;

-- 8. ПРОВЕРКА НАЛИЧИЯ КОЛОНКИ SOURCE В MESSAGES
SELECT 
    'SOURCE_CHECK' as type,
    'source_column' as name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
                AND column_name = 'source' 
                AND table_schema = 'public'
        )
        THEN 'EXISTS'
        ELSE 'NOT_EXISTS'
    END as details;
