-- 🚀 ОКОНЧАТЕЛЬНАЯ МИГРАЦИЯ В НОВУЮ СИСТЕМУ УРОВНЕЙ
-- Этот скрипт работает с правильной структурой всех таблиц

-- 1. Создаем новые таблицы если их нет
DO $$
BEGIN
    -- Создаем таблицу user_levels если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_levels') THEN
        CREATE TABLE user_levels (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            current_level VARCHAR(50) DEFAULT '🌱 Новичок',
            level_code VARCHAR(20) DEFAULT 'novice',
            total_sc_earned INTEGER DEFAULT 0,
            total_sc_spent INTEGER DEFAULT 0,
            current_sc_balance INTEGER DEFAULT 0,
            total_orders_amount DECIMAL(10, 2) DEFAULT 0,
            orders_count INTEGER DEFAULT 0,
            has_motivational_habit BOOLEAN DEFAULT FALSE,
            has_expert_chat_access BOOLEAN DEFAULT FALSE,
            has_permanent_discount BOOLEAN DEFAULT FALSE,
            has_vip_access BOOLEAN DEFAULT FALSE,
            level_achieved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
        );
        RAISE NOTICE 'Создана таблица user_levels';
    END IF;

    -- Создаем таблицу sc_transactions если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sc_transactions') THEN
        CREATE TABLE sc_transactions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'gifted', 'received')),
            source_type VARCHAR(50),
            source_id UUID,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Создана таблица sc_transactions';
    END IF;

    -- Создаем таблицу daily_activities если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_activities') THEN
        CREATE TABLE daily_activities (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            daily_checkin BOOLEAN DEFAULT FALSE,
            weekly_survey BOOLEAN DEFAULT FALSE,
            motivational_habit BOOLEAN DEFAULT FALSE,
            sc_earned INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, date)
        );
        RAISE NOTICE 'Создана таблица daily_activities';
    END IF;

    -- Создаем таблицу level_config если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'level_config') THEN
        CREATE TABLE level_config (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            level_code VARCHAR(20) UNIQUE NOT NULL,
            level_name VARCHAR(50) NOT NULL,
            level_icon VARCHAR(10) NOT NULL,
            sc_required INTEGER NOT NULL,
            orders_amount_required DECIMAL(10, 2) DEFAULT 0,
            orders_count_required INTEGER DEFAULT 0,
            benefits JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Создана таблица level_config';
    END IF;
END $$;

-- 2. Вставляем конфигурацию уровней если её нет
INSERT INTO level_config (level_code, level_name, level_icon, sc_required, orders_amount_required, orders_count_required, benefits) VALUES
('novice', '🌱 Новичок', '🌱', 0, 0, 0, '{"basic_access": true}'),
('mushroom_picker', '🍄 Грибник', '🍄', 20, 0, 0, '{"basic_access": true}'),
('collector', '🌿 Собиратель', '🌿', 100, 0, 1, '{"motivational_habit": true, "basic_access": true}'),
('expert', '🌳 Эксперт', '🌳', 300, 5000, 0, '{"expert_chat": true, "raffles": true, "basic_access": true}'),
('master', '👑 Мастер', '👑', 600, 10000, 0, '{"permanent_discount": 5, "practice_kits": true, "basic_access": true}'),
('legend', '🌟 Легенда', '🌟', 1200, 20000, 0, '{"permanent_discount": 10, "merch": true, "personal_meetings": true, "live_tracking": true, "basic_access": true}'),
('myth', '🌀 Миф', '🌀', 2000, 30000, 0, '{"product_testing": true, "nft_rank": true, "gifts": true, "eternal_vip": true, "basic_access": true}')
ON CONFLICT (level_code) DO NOTHING;

-- 3. Миграция пользователей (только если их нет в новой системе)
INSERT INTO user_levels (user_id, current_level, level_code, current_sc_balance, total_sc_earned, total_sc_spent, created_at)
SELECT 
    u.id,
    '🌱 Новичок',
    'novice',
    COALESCE(sc_balance.balance, 0),
    COALESCE(sc_earned.total_earned, 0),
    COALESCE(sc_spent.total_spent, 0),
    NOW()
FROM users u
LEFT JOIN (
    -- Рассчитываем текущий баланс SC из старой системы
    SELECT 
        user_id,
        SUM(CASE WHEN type = 'spent' THEN -amount ELSE amount END) as balance
    FROM coin_transactions
    GROUP BY user_id
) sc_balance ON u.id = sc_balance.user_id
LEFT JOIN (
    -- Рассчитываем общее количество заработанных SC
    SELECT 
        user_id,
        SUM(amount) as total_earned
    FROM coin_transactions
    WHERE type != 'spent'
    GROUP BY user_id
) sc_earned ON u.id = sc_earned.user_id
LEFT JOIN (
    -- Рассчитываем общее количество потраченных SC
    SELECT 
        user_id,
        SUM(amount) as total_spent
    FROM coin_transactions
    WHERE type = 'spent'
    GROUP BY user_id
) sc_spent ON u.id = sc_spent.user_id
WHERE NOT EXISTS (SELECT 1 FROM user_levels WHERE user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Миграция транзакций (исправленная версия)
INSERT INTO sc_transactions (user_id, amount, transaction_type, source_type, source_id, description, created_at)
SELECT 
    user_id,
    amount,
    CASE 
        WHEN type = 'spent' THEN 'spent'
        ELSE 'earned'
    END as transaction_type,
    CASE 
        WHEN type = 'checkin' THEN 'checkin'
        WHEN type = 'survey' THEN 'survey'
        WHEN type = 'referral' THEN 'referral'
        WHEN type = 'bonus' THEN 'bonus'
        WHEN type = 'spent' THEN 'order'
        WHEN type = 'manual' THEN 'manual'
        ELSE 'other'
    END as source_type,
    NULL as source_id, -- В старой таблице нет order_id
    description,
    created_at
FROM coin_transactions ct
WHERE created_at IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM sc_transactions st 
        WHERE st.user_id = ct.user_id 
            AND st.amount = ct.amount 
            AND st.created_at = ct.created_at
    );

-- 5. Миграция ежедневных активностей (исправленная версия)
INSERT INTO daily_activities (user_id, date, daily_checkin, sc_earned, created_at)
SELECT 
    user_id,
    DATE(date) as date,
    TRUE as daily_checkin,
    10 as sc_earned, -- Старое значение за чек-ин
    date
FROM daily_checkins dc
WHERE NOT EXISTS (
    SELECT 1 FROM daily_activities da 
    WHERE da.user_id = dc.user_id 
        AND da.date = DATE(dc.date)
)
ON CONFLICT (user_id, date) DO NOTHING;

-- 6. Обновление статистики заказов в user_levels
UPDATE user_levels 
SET 
    total_orders_amount = COALESCE(orders_stats.total_amount, 0),
    orders_count = COALESCE(orders_stats.orders_count, 0),
    updated_at = NOW()
FROM (
    SELECT 
        user_id,
        SUM(total) as total_amount,
        COUNT(*) as orders_count
    FROM orders
    GROUP BY user_id
) orders_stats
WHERE user_levels.user_id = orders_stats.user_id;

-- 7. Обновление уровней на основе новых данных
UPDATE user_levels 
SET 
    current_level = lc.level_name,
    level_code = lc.level_code,
    level_achieved_at = CASE 
        WHEN user_levels.level_code != lc.level_code THEN NOW()
        ELSE user_levels.level_achieved_at
    END,
    has_motivational_habit = (lc.benefits->>'motivational_habit')::BOOLEAN,
    has_expert_chat_access = (lc.benefits->>'expert_chat')::BOOLEAN,
    has_permanent_discount = (lc.benefits->>'permanent_discount') IS NOT NULL,
    has_vip_access = (lc.benefits->>'eternal_vip')::BOOLEAN,
    updated_at = NOW()
FROM level_config lc
WHERE lc.sc_required <= user_levels.current_sc_balance
    AND lc.orders_amount_required <= user_levels.total_orders_amount
    AND lc.orders_count_required <= user_levels.orders_count
    AND lc.level_code = (
        SELECT lc2.level_code
        FROM level_config lc2
        WHERE lc2.sc_required <= user_levels.current_sc_balance
            AND lc2.orders_amount_required <= user_levels.total_orders_amount
            AND lc2.orders_count_required <= user_levels.orders_count
        ORDER BY lc2.sc_required DESC, lc2.orders_amount_required DESC, lc2.orders_count_required DESC
        LIMIT 1
    );

-- 8. Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_levels_sc_balance ON user_levels(current_sc_balance);
CREATE INDEX IF NOT EXISTS idx_user_levels_orders_amount ON user_levels(total_orders_amount);
CREATE INDEX IF NOT EXISTS idx_sc_transactions_user_date ON sc_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_week ON daily_activities(user_id, date);

-- 9. Создание триггера для автоматической инициализации новых пользователей
CREATE OR REPLACE FUNCTION auto_init_user_level()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_levels (user_id, current_level, level_code, current_sc_balance)
    VALUES (NEW.id, '🌱 Новичок', 'novice', 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер только если его еще нет
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_init_user_level') THEN
        CREATE TRIGGER trigger_auto_init_user_level
            AFTER INSERT ON users
            FOR EACH ROW
            EXECUTE FUNCTION auto_init_user_level();
    END IF;
END $$;

-- 10. Функция для проверки статуса миграции
CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS TABLE (
    metric_name TEXT,
    old_value BIGINT,
    new_value BIGINT,
    migration_percent NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Пользователи'::TEXT,
        (SELECT COUNT(*) FROM users),
        (SELECT COUNT(*) FROM user_levels),
        ROUND(
            (SELECT COUNT(*)::NUMERIC FROM user_levels) / 
            NULLIF((SELECT COUNT(*)::NUMERIC FROM users), 0) * 100, 2
        )
    UNION ALL
    SELECT 
        'Транзакции'::TEXT,
        (SELECT COUNT(*) FROM coin_transactions),
        (SELECT COUNT(*) FROM sc_transactions),
        ROUND(
            (SELECT COUNT(*)::NUMERIC FROM sc_transactions) / 
            NULLIF((SELECT COUNT(*)::NUMERIC FROM coin_transactions), 0) * 100, 2
        )
    UNION ALL
    SELECT 
        'Активности'::TEXT,
        (SELECT COUNT(*) FROM daily_checkins),
        (SELECT COUNT(*) FROM daily_activities),
        ROUND(
            (SELECT COUNT(*)::NUMERIC FROM daily_activities) / 
            NULLIF((SELECT COUNT(*)::NUMERIC FROM daily_checkins), 0) * 100, 2
        );
END;
$$ LANGUAGE plpgsql;

-- 11. Вывод статистики миграции
SELECT * FROM get_migration_status();

-- 12. Создание VIEW для проверки миграции
CREATE OR REPLACE VIEW migration_check AS
SELECT 
    u.id as user_id,
    u.name,
    ul.current_level,
    ul.current_sc_balance,
    ul.total_orders_amount,
    ul.orders_count,
    COUNT(ct.id) as old_transactions,
    COUNT(st.id) as new_transactions,
    COUNT(da.id) as activities_count
FROM users u
LEFT JOIN user_levels ul ON u.id = ul.user_id
LEFT JOIN coin_transactions ct ON u.id = ct.user_id
LEFT JOIN sc_transactions st ON u.id = st.user_id
LEFT JOIN daily_activities da ON u.id = da.user_id
GROUP BY u.id, u.name, ul.current_level, ul.current_sc_balance, ul.total_orders_amount, ul.orders_count;

-- 13. Комментарии для документации
COMMENT ON FUNCTION get_migration_status() IS 'Получение статистики миграции';
COMMENT ON FUNCTION auto_init_user_level() IS 'Автоматическая инициализация новых пользователей';
COMMENT ON VIEW migration_check IS 'Проверка целостности миграции данных';

-- 14. Финальная проверка
DO $$
DECLARE
    users_count INTEGER;
    levels_count INTEGER;
    transactions_count INTEGER;
    new_transactions_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO levels_count FROM user_levels;
    SELECT COUNT(*) INTO transactions_count FROM coin_transactions;
    SELECT COUNT(*) INTO new_transactions_count FROM sc_transactions;
    
    RAISE NOTICE '=== СТАТИСТИКА МИГРАЦИИ ===';
    RAISE NOTICE 'Пользователи: % -> % (%.1f%%)', users_count, levels_count, 
        CASE WHEN users_count > 0 THEN (levels_count::NUMERIC / users_count * 100) ELSE 0 END;
    RAISE NOTICE 'Транзакции: % -> % (%.1f%%)', transactions_count, new_transactions_count,
        CASE WHEN transactions_count > 0 THEN (new_transactions_count::NUMERIC / transactions_count * 100) ELSE 0 END;
    RAISE NOTICE 'Миграция завершена успешно!';
END $$; 