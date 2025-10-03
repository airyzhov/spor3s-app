-- Полный тест сценария пользователя
-- Симуляция всех этапов жизненного цикла пользователя

-- 1. Создание тестового пользователя
INSERT INTO users (telegram_id, created_at)
VALUES ('123456789', NOW())
ON CONFLICT (telegram_id) DO NOTHING;

-- Получаем ID пользователя
DO $$
DECLARE
    test_user_id UUID;
    test_order_id UUID;
    test_subscription_id1 UUID;
    test_subscription_id2 UUID;
    test_referral_user_id UUID;
    test_referral_order_id UUID;
    test_new_order_id UUID;
    checkin_count INTEGER;
    sc_balance INTEGER;
BEGIN
    -- Получаем ID тестового пользователя
    SELECT id INTO test_user_id FROM users WHERE telegram_id = '123456789';
    
    RAISE NOTICE 'Тестовый пользователь ID: %', test_user_id;
    
    -- 2. Создание заказа через AI чат
    INSERT INTO orders (user_id, amount, status, payment_status, source, created_at)
    VALUES (test_user_id, 5000, 'pending', 'pending', 'ai_chat', NOW())
    RETURNING id INTO test_order_id;
    
    -- Добавляем товары в заказ
    INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
    VALUES 
        (test_order_id, 1, 2, 1500, NOW()),
        (test_order_id, 2, 1, 2000, NOW());
    
    RAISE NOTICE 'Заказ создан: %, сумма: 5000', test_order_id;
    
    -- 3. Создание подписок
    -- Первая подписка (месячная)
    INSERT INTO subscriptions (user_id, subscription_type, amount, status, created_at)
    VALUES (test_user_id, 'monthly', 1000, 'active', NOW())
    RETURNING id INTO test_subscription_id1;
    
    -- Вторая подписка (годовая)
    INSERT INTO subscriptions (user_id, subscription_type, amount, status, created_at)
    VALUES (test_user_id, 'yearly', 8000, 'active', NOW())
    RETURNING id INTO test_subscription_id2;
    
    RAISE NOTICE 'Подписки созданы: %, %', test_subscription_id1, test_subscription_id2;
    
    -- 4. Обновление статуса заказа (получено)
    UPDATE orders 
    SET status = 'received'
    WHERE id = test_order_id;
    
    RAISE NOTICE 'Статус заказа обновлен на "получено"';
    
    -- 5. Обновление статуса оплаты
    UPDATE orders 
    SET payment_status = 'paid'
    WHERE id = test_order_id;
    
    RAISE NOTICE 'Статус оплаты обновлен на "оплачено"';
    
    -- 6. Начало курса
    INSERT INTO course_progress (user_id, current_day, total_days, status, started_at)
    VALUES (test_user_id, 1, 30, 'in_progress', NOW());
    
    RAISE NOTICE 'Курс начат, день 1';
    
    -- 7. Симуляция 30 дней чекинов
    FOR i IN 1..30 LOOP
        INSERT INTO checkins (user_id, day, completed_challenges, completed_habits, created_at)
        VALUES (test_user_id, i, true, true, NOW() - INTERVAL '1 day' * (30 - i));
        
        -- Начисляем SC за чекины
        INSERT INTO coin_transactions (user_id, amount, type, description, created_at)
        VALUES (test_user_id, 10, 'earned', 'Чекин за день ' || i, NOW() - INTERVAL '1 day' * (30 - i));
    END LOOP;
    
    RAISE NOTICE 'Симулировано 30 дней чекинов';
    
    -- 8. Создание реферального пользователя
    INSERT INTO users (telegram_id, referred_by, created_at)
    VALUES ('987654321', test_user_id, NOW())
    RETURNING id INTO test_referral_user_id;
    
    RAISE NOTICE 'Реферальный пользователь создан: %', test_referral_user_id;
    
    -- 9. Заказ реферала
    INSERT INTO orders (user_id, amount, status, payment_status, source, created_at)
    VALUES (test_referral_user_id, 2500, 'completed', 'paid', 'web', NOW())
    RETURNING id INTO test_referral_order_id;
    
    INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
    VALUES (test_referral_order_id, 3, 1, 2500, NOW());
    
    RAISE NOTICE 'Заказ реферала создан: %, сумма: 2500', test_referral_order_id;
    
    -- Начисляем бонус рефереру за заказ реферала
    INSERT INTO coin_transactions (user_id, amount, type, description, created_at)
    VALUES (test_user_id, 250, 'earned', 'Реферальный бонус за заказ', NOW());
    
    RAISE NOTICE 'Реферальный бонус начислен: 250 SC';
    
    -- 10. Новый заказ пользователя
    INSERT INTO orders (user_id, amount, status, payment_status, source, created_at)
    VALUES (test_user_id, 3000, 'pending', 'pending', 'web', NOW())
    RETURNING id INTO test_new_order_id;
    
    INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
    VALUES (test_new_order_id, 4, 1, 3000, NOW());
    
    RAISE NOTICE 'Новый заказ создан: %, сумма: 3000', test_new_order_id;
    
    -- 11. Применение SC скидки
    -- Сначала получаем текущий баланс SC
    SELECT COALESCE(SUM(amount), 0) INTO sc_balance 
    FROM coin_transactions 
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Текущий баланс SC: %', sc_balance;
    
    -- Применяем скидку (используем все доступные SC)
    UPDATE orders 
    SET 
        discount_amount = sc_balance,
        final_amount = amount - sc_balance
    WHERE id = test_new_order_id;
    
    -- Списываем использованные SC
    INSERT INTO coin_transactions (user_id, amount, type, description, created_at)
    VALUES (test_user_id, -sc_balance, 'spent', 'Скидка на заказ ' || test_new_order_id, NOW());
    
    RAISE NOTICE 'Скидка применена: % SC', sc_balance;
    
    -- 12. Финальная проверка - подсчет всех данных
    RAISE NOTICE '=== ФИНАЛЬНАЯ ПРОВЕРКА ===';
    
    -- Подсчет заказов
    SELECT COUNT(*) INTO checkin_count FROM checkins WHERE user_id = test_user_id;
    RAISE NOTICE 'Всего чекинов: %', checkin_count;
    
    -- Подсчет заказов
    SELECT COUNT(*) INTO checkin_count FROM orders WHERE user_id = test_user_id;
    RAISE NOTICE 'Всего заказов: %', checkin_count;
    
    -- Подсчет подписок
    SELECT COUNT(*) INTO checkin_count FROM subscriptions WHERE user_id = test_user_id;
    RAISE NOTICE 'Всего подписок: %', checkin_count;
    
    -- Финальный баланс SC
    SELECT COALESCE(SUM(amount), 0) INTO sc_balance 
    FROM coin_transactions 
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
    'Подписки' as table_name,
    COUNT(*) as count
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE u.telegram_id = '123456789'

UNION ALL

SELECT 
    'Чекины' as table_name,
    COUNT(*) as count
FROM checkins c
JOIN users u ON c.user_id = u.id
WHERE u.telegram_id = '123456789'

UNION ALL

SELECT 
    'SC транзакции' as table_name,
    COUNT(*) as count
FROM coin_transactions ct
JOIN users u ON ct.user_id = u.id
WHERE u.telegram_id = '123456789'

UNION ALL

SELECT 
    'Прогресс курса' as table_name,
    COUNT(*) as count
FROM course_progress cp
JOIN users u ON cp.user_id = u.id
WHERE u.telegram_id = '123456789';

-- Детальная проверка SC транзакций
SELECT 
    type,
    amount,
    description,
    created_at
FROM coin_transactions ct
JOIN users u ON ct.user_id = u.id
WHERE u.telegram_id = '123456789'
ORDER BY created_at;

-- Проверка заказов с деталями
SELECT 
    o.id,
    o.amount,
    o.discount_amount,
    o.final_amount,
    o.status,
    o.payment_status,
    o.source,
    o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.telegram_id IN ('123456789', '987654321')
ORDER BY o.created_at; 