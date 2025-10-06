-- Ультра-минимальный тест сценария пользователя
-- Используем только базовые колонки

-- 1. Создание тестового пользователя
INSERT INTO users (telegram_id, created_at)
VALUES ('123456789', NOW())
ON CONFLICT (telegram_id) DO NOTHING;

-- Получаем ID пользователя
DO $$
DECLARE
    test_user_id UUID;
    test_order_id UUID;
    test_referral_user_id UUID;
    test_referral_order_id UUID;
    test_new_order_id UUID;
    checkin_count INTEGER;
    sc_balance INTEGER;
BEGIN
    -- Получаем ID тестового пользователя
    SELECT id INTO test_user_id FROM users WHERE telegram_id = '123456789';
    
    RAISE NOTICE 'Тестовый пользователь ID: %', test_user_id;
    
    -- 2. Создание заказа через AI чат (только базовые колонки)
    INSERT INTO orders (user_id, status, created_at)
    VALUES (test_user_id, 'pending', NOW())
    RETURNING id INTO test_order_id;
    
    RAISE NOTICE 'Заказ создан: %', test_order_id;
    
    -- 3. Обновление статуса заказа
    UPDATE orders 
    SET status = 'received'
    WHERE id = test_order_id;
    
    RAISE NOTICE 'Статус заказа обновлен на "получено"';
    
    -- 4. Симуляция чекинов (минимальные колонки)
    FOR i IN 1..30 LOOP
        INSERT INTO daily_checkins (user_id, created_at)
        VALUES (test_user_id, NOW() - INTERVAL '1 day' * (30 - i));
        
        -- Начисляем SC за чекины (минимальные колонки)
        INSERT INTO sc_transactions (user_id, amount, type, description, created_at)
        VALUES (test_user_id, 10, 'earned', 'Чекин за день ' || i, NOW() - INTERVAL '1 day' * (30 - i));
    END LOOP;
    
    RAISE NOTICE 'Симулировано 30 дней чекинов';
    
    -- 5. Создание реферального пользователя
    INSERT INTO users (telegram_id, referred_by, created_at)
    VALUES ('987654321', test_user_id, NOW())
    RETURNING id INTO test_referral_user_id;
    
    RAISE NOTICE 'Реферальный пользователь создан: %', test_referral_user_id;
    
    -- 6. Заказ реферала
    INSERT INTO orders (user_id, status, created_at)
    VALUES (test_referral_user_id, 'completed', NOW())
    RETURNING id INTO test_referral_order_id;
    
    RAISE NOTICE 'Заказ реферала создан: %', test_referral_order_id;
    
    -- Начисляем бонус рефереру за заказ реферала
    INSERT INTO sc_transactions (user_id, amount, type, description, created_at)
    VALUES (test_user_id, 250, 'earned', 'Реферальный бонус за заказ', NOW());
    
    RAISE NOTICE 'Реферальный бонус начислен: 250 SC';
    
    -- 7. Новый заказ пользователя
    INSERT INTO orders (user_id, status, created_at)
    VALUES (test_user_id, 'pending', NOW())
    RETURNING id INTO test_new_order_id;
    
    RAISE NOTICE 'Новый заказ создан: %', test_new_order_id;
    
    -- 8. Применение SC скидки
    SELECT COALESCE(SUM(amount), 0) INTO sc_balance 
    FROM sc_transactions 
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Текущий баланс SC: %', sc_balance;
    
    -- Списываем использованные SC
    INSERT INTO sc_transactions (user_id, amount, type, description, created_at)
    VALUES (test_user_id, -sc_balance, 'spent', 'Скидка на заказ ' || test_new_order_id, NOW());
    
    RAISE NOTICE 'Скидка применена: % SC', sc_balance;
    
    -- 9. Финальная проверка
    RAISE NOTICE '=== ФИНАЛЬНАЯ ПРОВЕРКА ===';
    
    SELECT COUNT(*) INTO checkin_count FROM daily_checkins WHERE user_id = test_user_id;
    RAISE NOTICE 'Всего чекинов: %', checkin_count;
    
    SELECT COUNT(*) INTO checkin_count FROM orders WHERE user_id = test_user_id;
    RAISE NOTICE 'Всего заказов: %', checkin_count;
    
    SELECT COALESCE(SUM(amount), 0) INTO sc_balance 
    FROM sc_transactions 
    WHERE user_id = test_user_id;
    RAISE NOTICE 'Финальный баланс SC: %', sc_balance;
    
    RAISE NOTICE '=== ТЕСТ ЗАВЕРШЕН ===';
    
END $$;

-- Проверка всех созданных данных
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

-- Детальная проверка SC транзакций
SELECT 
    type,
    amount,
    description,
    created_at
FROM sc_transactions st
JOIN users u ON st.user_id = u.id
WHERE u.telegram_id = '123456789'
ORDER BY created_at;

-- Проверка всех заказов
SELECT 
    o.id,
    o.status,
    o.created_at,
    u.telegram_id
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.telegram_id IN ('123456789', '987654321')
ORDER BY o.created_at; 