-- Проверка итогового начисления SC без списаний
-- Выполните этот запрос ПОСЛЕ выполнения основного теста
-- Обновленный расчет: 3 SC за чекин + мотивационные привычки + еженедельные

-- 1. Проверяем всех пользователей
SELECT 
    telegram_id,
    id as user_id,
    created_at
FROM users 
WHERE telegram_id IN ('123456789', '987654321')
ORDER BY created_at;

-- 2. Проверяем все заказы
SELECT 
    o.id as order_id,
    o.status,
    o.created_at,
    u.telegram_id
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.telegram_id IN ('123456789', '987654321')
ORDER BY o.created_at;

-- 3. Проверяем все чекины
SELECT 
    dc.id as checkin_id,
    dc.user_id,
    u.telegram_id,
    dc.created_at
FROM daily_checkins dc
JOIN users u ON dc.user_id = u.id
WHERE u.telegram_id = '123456789'
ORDER BY dc.created_at;

-- 4. Проверяем ВСЕ SC транзакции (включая списания)
SELECT 
    st.id as transaction_id,
    st.amount,
    st.transaction_type,
    st.created_at,
    u.telegram_id,
    CASE 
        WHEN st.amount > 0 THEN 'Начисление'
        WHEN st.amount < 0 THEN 'Списание'
        ELSE 'Нулевая'
    END as transaction_type
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789'
ORDER BY st.created_at;

-- 5. Проверяем ТОЛЬКО начисления (без списаний)
SELECT 
    st.id as transaction_id,
    st.amount,
    st.transaction_type,
    st.created_at,
    u.telegram_id,
    'Начисление' as transaction_type
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789' 
    AND st.amount > 0
ORDER BY st.created_at;

-- 6. Сумма ВСЕХ начислений (без списаний)
SELECT 
    u.telegram_id,
    COUNT(st.id) as total_transactions,
    SUM(st.amount) as total_earned_sc,
    COUNT(CASE WHEN st.amount > 0 THEN 1 END) as positive_transactions,
    COUNT(CASE WHEN st.amount < 0 THEN 1 END) as negative_transactions
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789'
GROUP BY u.telegram_id, u.id;

-- 7. Детальный расчет по типам транзакций
SELECT 
    'Чекины (30 дней × 3 SC)' as description,
    30 as count,
    3 as amount_per_unit,
    90 as total_amount

UNION ALL

SELECT 
    'Еженедельные активности (4 × 10 SC)' as description,
    4 as count,
    10 as amount_per_unit,
    40 as total_amount

UNION ALL

SELECT 
    'Мотивационные привычки (4 × 5 SC)' as description,
    4 as count,
    5 as amount_per_unit,
    20 as total_amount

UNION ALL

SELECT 
    'Реферальный бонус' as description,
    1 as count,
    250 as amount_per_unit,
    250 as total_amount

UNION ALL

SELECT 
    'ИТОГО НАЧИСЛЕНИЙ' as description,
    39 as count,
    NULL as amount_per_unit,
    400 as total_amount;

-- 8. Финальная проверка баланса
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

-- 9. Подсчет по типам активностей
SELECT 
    'Чекины' as activity_type,
    COUNT(*) as count,
    SUM(st.amount) as total_sc
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789' 
    AND st.transaction_type = 'checkin'
GROUP BY 'Чекины'

UNION ALL

SELECT 
    'Еженедельные активности' as activity_type,
    COUNT(*) as count,
    SUM(st.amount) as total_sc
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789' 
    AND st.transaction_type = 'weekly_activity'
GROUP BY 'Еженедельные активности'

UNION ALL

SELECT 
    'Мотивационные привычки' as activity_type,
    COUNT(*) as count,
    SUM(st.amount) as total_sc
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789' 
    AND st.transaction_type = 'motivational_habit'
GROUP BY 'Мотивационные привычки'

UNION ALL

SELECT 
    'Реферальный бонус' as activity_type,
    COUNT(*) as count,
    SUM(st.amount) as total_sc
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789' 
    AND st.transaction_type = 'referral_bonus'
GROUP BY 'Реферальный бонус'; 