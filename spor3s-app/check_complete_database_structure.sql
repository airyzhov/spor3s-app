-- ПОЛНАЯ ПРОВЕРКА СТРУКТУРЫ БАЗЫ ДАННЫХ SUPABASE
-- ================================================

-- 1. СПИСОК ВСЕХ ТАБЛИЦ В СХЕМЕ PUBLIC
SELECT 
    '=== СПИСОК ВСЕХ ТАБЛИЦ ===' as info,
    '' as table_name,
    '' as column_name,
    '' as data_type,
    '' as is_nullable,
    '' as column_default
UNION ALL
SELECT 
    'Таблица:' as info,
    table_name,
    '' as column_name,
    '' as data_type,
    '' as is_nullable,
    '' as column_default
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY info DESC, table_name;

-- 2. ДЕТАЛЬНАЯ СТРУКТУРА ВСЕХ ТАБЛИЦ
SELECT 
    '=== СТРУКТУРА ТАБЛИЦ ===' as section,
    '' as table_name,
    '' as column_name,
    '' as data_type,
    '' as is_nullable,
    '' as column_default
UNION ALL
SELECT 
    CONCAT('TABLE: ', t.table_name) as section,
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    COALESCE(c.column_default, 'NULL') as column_default
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
ORDER BY section, table_name, column_name;

-- 3. ВНЕШНИЕ КЛЮЧИ И СВЯЗИ
SELECT 
    '=== ВНЕШНИЕ КЛЮЧИ ===' as info,
    '' as constraint_name,
    '' as table_name,
    '' as column_name,
    '' as foreign_table_name,
    '' as foreign_column_name
UNION ALL
SELECT 
    'FK:' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name as foreign_table_name,
    ccu.column_name as foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY info DESC, table_name;

-- 4. ИНДЕКСЫ
SELECT 
    '=== ИНДЕКСЫ ===' as info,
    '' as table_name,
    '' as index_name,
    '' as column_name
UNION ALL
SELECT 
    'INDEX:' as info,
    t.relname as table_name,
    i.relname as index_name,
    a.attname as column_name
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relkind = 'r'
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY info DESC, table_name, index_name;

-- 5. КОЛИЧЕСТВО ЗАПИСЕЙ В КАЖДОЙ ТАБЛИЦЕ
SELECT 
    '=== КОЛИЧЕСТВО ЗАПИСЕЙ ===' as info,
    '' as table_name,
    '' as record_count
UNION ALL
SELECT 
    'COUNT:' as info,
    table_name,
    'Выполните отдельно: SELECT COUNT(*) FROM ' || table_name as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY info DESC, table_name;

-- 6. ПРОВЕРКА КЛЮЧЕВЫХ ТАБЛИЦ ДЛЯ 3-КАНАЛЬНОЙ СИСТЕМЫ
SELECT 
    '=== ПРОВЕРКА КЛЮЧЕВЫХ ТАБЛИЦ ===' as section,
    '' as table_status,
    '' as details
UNION ALL
SELECT 
    'USERS TABLE:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public')
        THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ ОТСУТСТВУЕТ'
    END as table_status,
    'Основная таблица пользователей' as details
UNION ALL
SELECT 
    'MESSAGES TABLE:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public')
        THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ ОТСУТСТВУЕТ'
    END as table_status,
    'Таблица сообщений для RAG системы' as details
UNION ALL
SELECT 
    'ORDERS TABLE:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public')
        THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ ОТСУТСТВУЕТ'
    END as table_status,
    'Таблица заказов' as details
UNION ALL
SELECT 
    'AI_AGENT_STATUS TABLE:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_agent_status' AND table_schema = 'public')
        THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ ОТСУТСТВУЕТ'
    END as table_status,
    'Таблица статуса AI агента для управления' as details
UNION ALL
SELECT 
    'TG_LINK_CODES TABLE:' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tg_link_codes' AND table_schema = 'public')
        THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ ОТСУТСТВУЕТ'
    END as table_status,
    'Таблица кодов для связывания аккаунтов' as details;

-- 7. ПРОВЕРКА КОЛОНКИ SOURCE В MESSAGES (для разделения каналов)
SELECT 
    '=== ПРОВЕРКА КОЛОНКИ SOURCE ===' as info,
    '' as column_info,
    '' as status
UNION ALL
SELECT 
    'MESSAGES.SOURCE:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
                AND column_name = 'source' 
                AND table_schema = 'public'
        )
        THEN '✅ КОЛОНКА СУЩЕСТВУЕТ'
        ELSE '❌ КОЛОНКА ОТСУТСТВУЕТ'
    END as column_info,
    'Необходима для разделения каналов: mini_app, telegram_bot, spor3z' as status;

-- 8. ПРОВЕРКА TELEGRAM_ID В USERS
SELECT 
    '=== ПРОВЕРКА TELEGRAM_ID ===' as info,
    '' as column_info,
    '' as status
UNION ALL
SELECT 
    'USERS.TELEGRAM_ID:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' 
                AND column_name = 'telegram_id' 
                AND table_schema = 'public'
        )
        THEN '✅ КОЛОНКА СУЩЕСТВУЕТ'
        ELSE '❌ КОЛОНКА ОТСУТСТВУЕТ'
    END as column_info,
    'Основной ключ для синхронизации между каналами' as status;
