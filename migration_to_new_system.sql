-- 🚀 МИГРАЦИЯ СУЩЕСТВУЮЩИХ ДАННЫХ В НОВУЮ СИСТЕМУ УРОВНЕЙ
-- Выполните этот скрипт после создания новых таблиц

-- 1. Миграция пользователей в новую систему уровней
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
  -- Рассчитываем текущий баланс SC
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
ON CONFLICT (user_id) DO NOTHING;

-- 2. Миграция транзакций в новую таблицу sc_transactions
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
    ELSE 'other'
  END as source_type,
  order_id as source_id,
  description,
  created_at
FROM coin_transactions
WHERE created_at IS NOT NULL;

-- 3. Миграция ежедневных активностей
INSERT INTO daily_activities (user_id, date, daily_checkin, sc_earned, created_at)
SELECT 
  user_id,
  DATE(created_at) as date,
  TRUE as daily_checkin,
  10 as sc_earned, -- Старое значение за чек-ин
  created_at
FROM daily_checkins
ON CONFLICT (user_id, date) DO NOTHING;

-- 4. Обновление статистики заказов в user_levels
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

-- 5. Обновление уровней на основе новых данных
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

-- 6. Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_levels_sc_balance ON user_levels(current_sc_balance);
CREATE INDEX IF NOT EXISTS idx_user_levels_orders_amount ON user_levels(total_orders_amount);
CREATE INDEX IF NOT EXISTS idx_sc_transactions_user_date ON sc_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_week ON daily_activities(user_id, date);

-- 7. Обновление статистики активностей
UPDATE user_levels 
SET 
  updated_at = NOW()
FROM (
  SELECT 
    user_id,
    COUNT(*) as active_days,
    COUNT(CASE WHEN daily_checkin THEN 1 END) as checkin_days,
    COUNT(CASE WHEN weekly_survey THEN 1 END) as survey_weeks,
    COUNT(CASE WHEN motivational_habit THEN 1 END) as habit_days
  FROM daily_activities
  GROUP BY user_id
) activity_stats
WHERE user_levels.user_id = activity_stats.user_id;

-- 8. Проверка целостности данных
-- Создаем VIEW для проверки миграции
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

-- 9. Функция для проверки миграции
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS TABLE (
  total_users INTEGER,
  migrated_users INTEGER,
  total_transactions INTEGER,
  migrated_transactions INTEGER,
  total_activities INTEGER,
  migrated_activities INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM user_levels) as migrated_users,
    (SELECT COUNT(*) FROM coin_transactions) as total_transactions,
    (SELECT COUNT(*) FROM sc_transactions) as migrated_transactions,
    (SELECT COUNT(*) FROM daily_checkins) as total_activities,
    (SELECT COUNT(*) FROM daily_activities) as migrated_activities;
END;
$$ LANGUAGE plpgsql;

-- 10. Очистка старых данных (опционально, выполнять с осторожностью)
-- UNCOMMENT СЛЕДУЮЩИЕ СТРОКИ ТОЛЬКО ПОСЛЕ ПРОВЕРКИ МИГРАЦИИ
/*
-- Удаление старых таблиц (только после проверки)
-- DROP TABLE IF EXISTS coin_transactions CASCADE;
-- DROP TABLE IF EXISTS daily_checkins CASCADE;
-- DROP TABLE IF EXISTS user_progress_simple CASCADE;
-- DROP TABLE IF EXISTS coin_transactions_simple CASCADE;
-- DROP TABLE IF EXISTS achievements_simple CASCADE;
-- DROP TABLE IF EXISTS user_achievements_simple CASCADE;
*/

-- 11. Создание триггера для автоматической инициализации новых пользователей
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

-- 12. Функция для получения статистики миграции
CREATE OR REPLACE FUNCTION get_migration_stats()
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

-- Вывод статистики миграции
SELECT * FROM get_migration_stats();

COMMENT ON FUNCTION check_migration_status() IS 'Проверка статуса миграции данных';
COMMENT ON FUNCTION get_migration_stats() IS 'Получение статистики миграции';
COMMENT ON FUNCTION auto_init_user_level() IS 'Автоматическая инициализация новых пользователей'; 