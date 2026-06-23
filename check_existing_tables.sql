-- 🔍 ПРОВЕРКА СУЩЕСТВУЮЩИХ ТАБЛИЦ В БАЗЕ ДАННЫХ
-- Выполните этот скрипт в Supabase SQL Editor для проверки текущего состояния

-- 1. Проверяем существующие таблицы
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Проверяем структуру основных таблиц
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN (
        'users', 
        'orders', 
        'coin_transactions', 
        'daily_checkins',
        'user_levels',
        'sc_transactions',
        'daily_activities',
        'level_config'
    )
ORDER BY table_name, ordinal_position;

-- 3. Проверяем количество записей в каждой таблице
SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
    'orders' as table_name,
    COUNT(*) as record_count
FROM orders
UNION ALL
SELECT 
    'coin_transactions' as table_name,
    COUNT(*) as record_count
FROM coin_transactions
UNION ALL
SELECT 
    'daily_checkins' as table_name,
    COUNT(*) as record_count
FROM daily_checkins
UNION ALL
SELECT 
    'user_levels' as table_name,
    COUNT(*) as record_count
FROM user_levels
UNION ALL
SELECT 
    'sc_transactions' as table_name,
    COUNT(*) as record_count
FROM sc_transactions
UNION ALL
SELECT 
    'daily_activities' as table_name,
    COUNT(*) as record_count
FROM daily_activities
UNION ALL
SELECT 
    'level_config' as table_name,
    COUNT(*) as record_count
FROM level_config;

-- 4. Проверяем данные пользователей
SELECT 
    u.id,
    u.telegram_id,
    u.name,
    u.created_at,
    ul.current_level,
    ul.current_sc_balance,
    COUNT(ct.id) as old_transactions,
    COUNT(st.id) as new_transactions,
    COUNT(dc.id) as old_checkins,
    COUNT(da.id) as new_activities
FROM users u
LEFT JOIN user_levels ul ON u.id = ul.user_id
LEFT JOIN coin_transactions ct ON u.id = ct.user_id
LEFT JOIN sc_transactions st ON u.id = st.user_id
LEFT JOIN daily_checkins dc ON u.id = dc.user_id
LEFT JOIN daily_activities da ON u.id = da.user_id
GROUP BY u.id, u.telegram_id, u.name, u.created_at, ul.current_level, ul.current_sc_balance
ORDER BY u.created_at DESC
LIMIT 10;

-- 5. Проверяем конфигурацию уровней
SELECT 
    level_code,
    level_name,
    sc_required,
    orders_amount_required,
    orders_count_required,
    benefits
FROM level_config
ORDER BY sc_required;

-- 6. Проверяем индексы
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN (
        'users', 
        'orders', 
        'coin_transactions', 
        'daily_checkins',
        'user_levels',
        'sc_transactions',
        'daily_activities',
        'level_config'
    )
ORDER BY tablename, indexname; 