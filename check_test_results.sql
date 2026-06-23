-- Проверка результатов теста сценария пользователя

-- 1. Проверка пользователей
SELECT 
    'Пользователи' as table_name,
    COUNT(*) as count
FROM users 
WHERE telegram_id IN ('123456789', '987654321')

UNION ALL

SELECT 
    'Заказы' as table_name,
    COUNT(*) as count
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.telegram_id IN ('123456789', '987654321')

UNION ALL

SELECT 
    'Чекины' as table_name,
    COUNT(*) as count
FROM daily_checkins dc
JOIN users u ON dc.user_id = u.id
WHERE u.telegram_id = '123456789'

UNION ALL

SELECT 
    'SC транзакции' as table_name,
    COUNT(*) as count
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789';

-- 2. Детальная проверка SC транзакций
SELECT 
    st.amount,
    st.transaction_type,
    st.created_at,
    CASE 
        WHEN st.amount > 0 THEN 'Начисление'
        WHEN st.amount < 0 THEN 'Списание'
        ELSE 'Нулевая'
    END as transaction_type
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789'
ORDER BY st.created_at;

-- 3. Подсчет SC по типам
SELECT 
    'Чекины (30 × 3 SC)' as description,
    COUNT(*) as count,
    SUM(st.amount) as total_sc
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789' 
    AND st.transaction_type = 'earned'
    AND st.amount = 3

UNION ALL

SELECT 
    'Еженедельные (4 × 10 SC)' as description,
    COUNT(*) as count,
    SUM(st.amount) as total_sc
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789' 
    AND st.transaction_type = 'earned'
    AND st.amount = 10

UNION ALL

SELECT 
    'Мотивационные (4 × 5 SC)' as description,
    COUNT(*) as count,
    SUM(st.amount) as total_sc
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789' 
    AND st.transaction_type = 'earned'
    AND st.amount = 5

UNION ALL

SELECT 
    'Реферальный бонус' as description,
    COUNT(*) as count,
    SUM(st.amount) as total_sc
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789' 
    AND st.transaction_type = 'earned'
    AND st.amount = 250;

-- 4. Финальный баланс SC
SELECT 
    'Текущий баланс SC' as metric,
    COALESCE(SUM(st.amount), 0) as value
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789'

UNION ALL

SELECT 
    'Только начисления' as metric,
    COALESCE(SUM(CASE WHEN st.amount > 0 THEN st.amount ELSE 0 END), 0) as value
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789'

UNION ALL

SELECT 
    'Только списания' as metric,
    COALESCE(SUM(CASE WHEN st.amount < 0 THEN st.amount ELSE 0 END), 0) as value
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789';

-- 5. Проверка всех заказов с деталями
SELECT 
    o.id,
    o.status,
    o.created_at,
    u.telegram_id,
    u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.telegram_id IN ('123456789', '987654321')
ORDER BY o.created_at; 