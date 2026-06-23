-- 🎯 НОВАЯ СИСТЕМА УРОВНЕЙ И SC ДЛЯ SPOR3S-APP
-- Обновленная система с новыми уровнями и механиками

-- 1. Обновленная таблица уровней пользователей
CREATE TABLE user_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Текущий уровень
  current_level VARCHAR(50) DEFAULT '🌱 Новичок',
  level_code VARCHAR(20) DEFAULT 'novice',
  
  -- SC баланс
  total_sc_earned INTEGER DEFAULT 0,
  total_sc_spent INTEGER DEFAULT 0,
  current_sc_balance INTEGER DEFAULT 0,
  
  -- Условия уровней
  total_orders_amount DECIMAL(10, 2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  
  -- Статусы доступа
  has_motivational_habit BOOLEAN DEFAULT FALSE,
  has_expert_chat_access BOOLEAN DEFAULT FALSE,
  has_permanent_discount BOOLEAN DEFAULT FALSE,
  has_vip_access BOOLEAN DEFAULT FALSE,
  
  -- Метаданные
  level_achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 2. История SC транзакций (обновленная)
CREATE TABLE sc_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'gifted', 'received')),
  source_type VARCHAR(50), -- checkin, survey, habit, order, referral, gift
  source_id UUID, -- ID заказа, челленджа и т.д.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ежедневные активности (обновленные)
CREATE TABLE daily_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Основные активности
  daily_checkin BOOLEAN DEFAULT FALSE,
  weekly_survey BOOLEAN DEFAULT FALSE,
  motivational_habit BOOLEAN DEFAULT FALSE,
  
  -- SC за активности
  sc_earned INTEGER DEFAULT 0,
  
  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- 4. Система подарков SC
CREATE TABLE sc_gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Конфигурация уровней
CREATE TABLE level_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level_code VARCHAR(20) UNIQUE NOT NULL,
  level_name VARCHAR(50) NOT NULL,
  level_icon VARCHAR(10) NOT NULL,
  sc_required INTEGER NOT NULL,
  orders_amount_required DECIMAL(10, 2) DEFAULT 0,
  orders_count_required INTEGER DEFAULT 0,
  
  -- Преимущества уровня
  benefits JSONB,
  
  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ИНДЕКСЫ
CREATE INDEX idx_user_levels_user ON user_levels(user_id);
CREATE INDEX idx_sc_transactions_user ON sc_transactions(user_id, created_at);
CREATE INDEX idx_daily_activities_user_date ON daily_activities(user_id, date);
CREATE INDEX idx_sc_gifts_sender ON sc_gifts(sender_id);
CREATE INDEX idx_sc_gifts_receiver ON sc_gifts(receiver_id);

-- ВСТАВКА КОНФИГУРАЦИИ УРОВНЕЙ
INSERT INTO level_config (level_code, level_name, level_icon, sc_required, orders_amount_required, orders_count_required, benefits) VALUES
('novice', '🌱 Новичок', '🌱', 0, 0, 0, '{"basic_access": true}'),
('mushroom_picker', '🍄 Грибник', '🍄', 20, 0, 0, '{"basic_access": true}'),
('collector', '🌿 Собиратель', '🌿', 100, 0, 1, '{"motivational_habit": true, "basic_access": true}'),
('expert', '🌳 Эксперт', '🌳', 300, 5000, 0, '{"expert_chat": true, "raffles": true, "basic_access": true}'),
('master', '👑 Мастер', '👑', 600, 10000, 0, '{"permanent_discount": 5, "practice_kits": true, "basic_access": true}'),
('legend', '🌟 Легенда', '🌟', 1200, 20000, 0, '{"permanent_discount": 10, "merch": true, "personal_meetings": true, "live_tracking": true, "basic_access": true}'),
('myth', '🌀 Миф', '🌀', 2000, 30000, 0, '{"product_testing": true, "nft_rank": true, "gifts": true, "eternal_vip": true, "basic_access": true}');

-- ФУНКЦИИ И ТРИГГЕРЫ

-- Функция для обновления уровня пользователя
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
  new_level_code VARCHAR(20);
  new_level_name VARCHAR(50);
  new_level_icon VARCHAR(10);
  level_benefits JSONB;
BEGIN
  -- Находим подходящий уровень
  SELECT lc.level_code, lc.level_name, lc.level_icon, lc.benefits
  INTO new_level_code, new_level_name, new_level_icon, level_benefits
  FROM level_config lc
  WHERE lc.sc_required <= NEW.current_sc_balance
    AND lc.orders_amount_required <= NEW.total_orders_amount
    AND lc.orders_count_required <= NEW.orders_count
  ORDER BY lc.sc_required DESC, lc.orders_amount_required DESC, lc.orders_count_required DESC
  LIMIT 1;
  
  -- Если уровень изменился
  IF NEW.level_code != new_level_code THEN
    NEW.current_level := new_level_name;
    NEW.level_code := new_level_code;
    NEW.level_achieved_at := NOW();
    
    -- Обновляем статусы доступа
    NEW.has_motivational_habit := (level_benefits->>'motivational_habit')::BOOLEAN;
    NEW.has_expert_chat_access := (level_benefits->>'expert_chat')::BOOLEAN;
    NEW.has_permanent_discount := (level_benefits->>'permanent_discount') IS NOT NULL;
    NEW.has_vip_access := (level_benefits->>'eternal_vip')::BOOLEAN;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления уровня
CREATE TRIGGER trigger_update_user_level
  BEFORE UPDATE ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

-- Функция для начисления SC за активность
CREATE OR REPLACE FUNCTION award_sc_for_activity()
RETURNS TRIGGER AS $$
DECLARE
  sc_amount INTEGER := 0;
  activity_type VARCHAR(50);
BEGIN
  -- Определяем тип активности и количество SC
  IF NEW.daily_checkin THEN
    sc_amount := 3;
    activity_type := 'checkin';
  ELSIF NEW.weekly_survey THEN
    sc_amount := 25;
    activity_type := 'survey';
  ELSIF NEW.motivational_habit THEN
    sc_amount := 25;
    activity_type := 'habit';
  END IF;
  
  -- Если есть SC для начисления
  IF sc_amount > 0 THEN
    NEW.sc_earned := sc_amount;
    
    -- Обновляем баланс пользователя
    UPDATE user_levels 
    SET 
      total_sc_earned = total_sc_earned + sc_amount,
      current_sc_balance = current_sc_balance + sc_amount,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Записываем транзакцию
    INSERT INTO sc_transactions (user_id, amount, transaction_type, source_type, description)
    VALUES (NEW.user_id, sc_amount, 'earned', activity_type, 
            CASE 
              WHEN activity_type = 'checkin' THEN 'Ежедневный чек-ин'
              WHEN activity_type = 'survey' THEN 'Еженедельная самооценка'
              WHEN activity_type = 'habit' THEN 'Мотивационная привычка'
            END);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для начисления SC
CREATE TRIGGER trigger_award_sc
  AFTER INSERT OR UPDATE ON daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION award_sc_for_activity();

-- Функция для обработки подарков SC
CREATE OR REPLACE FUNCTION process_sc_gift()
RETURNS TRIGGER AS $$
BEGIN
  -- Если подарок принят
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Списываем SC у отправителя
    UPDATE user_levels 
    SET 
      total_sc_spent = total_sc_spent + NEW.amount,
      current_sc_balance = current_sc_balance - NEW.amount,
      updated_at = NOW()
    WHERE user_id = NEW.sender_id;
    
    -- Начисляем SC получателю
    UPDATE user_levels 
    SET 
      total_sc_earned = total_sc_earned + NEW.amount,
      current_sc_balance = current_sc_balance + NEW.amount,
      updated_at = NOW()
    WHERE user_id = NEW.receiver_id;
    
    -- Записываем транзакции
    INSERT INTO sc_transactions (user_id, amount, transaction_type, source_type, description)
    VALUES 
      (NEW.sender_id, NEW.amount, 'spent', 'gift', 'Подарок другу: ' || NEW.message),
      (NEW.receiver_id, NEW.amount, 'earned', 'gift', 'Подарок от друга: ' || NEW.message);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обработки подарков
CREATE TRIGGER trigger_process_gift
  AFTER UPDATE ON sc_gifts
  FOR EACH ROW
  EXECUTE FUNCTION process_sc_gift();

-- VIEW для статистики пользователя
CREATE OR REPLACE VIEW user_level_stats AS
SELECT 
  u.id as user_id,
  u.telegram_id,
  u.name,
  ul.current_level,
  ul.level_code,
  ul.current_sc_balance,
  ul.total_sc_earned,
  ul.total_sc_spent,
  ul.total_orders_amount,
  ul.orders_count,
  ul.has_motivational_habit,
  ul.has_expert_chat_access,
  ul.has_permanent_discount,
  ul.has_vip_access,
  ul.level_achieved_at,
  COUNT(da.id) as active_days,
  COUNT(CASE WHEN da.daily_checkin THEN 1 END) as checkin_days,
  COUNT(CASE WHEN da.weekly_survey THEN 1 END) as survey_weeks,
  COUNT(CASE WHEN da.motivational_habit THEN 1 END) as habit_days
FROM users u
LEFT JOIN user_levels ul ON u.id = ul.user_id
LEFT JOIN daily_activities da ON u.id = da.user_id
GROUP BY u.id, ul.current_level, ul.level_code, ul.current_sc_balance, 
         ul.total_sc_earned, ul.total_sc_spent, ul.total_orders_amount, 
         ul.orders_count, ul.has_motivational_habit, ul.has_expert_chat_access,
         ul.has_permanent_discount, ul.has_vip_access, ul.level_achieved_at;

-- Функция для инициализации пользователя
CREATE OR REPLACE FUNCTION init_user_level(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_levels (user_id, current_level, level_code, current_sc_balance)
  VALUES (user_uuid, '🌱 Новичок', 'novice', 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_levels IS 'Уровни пользователей и их прогресс';
COMMENT ON TABLE sc_transactions IS 'История транзакций SC';
COMMENT ON TABLE daily_activities IS 'Ежедневные активности пользователей';
COMMENT ON TABLE sc_gifts IS 'Система подарков SC между пользователями';
COMMENT ON TABLE level_config IS 'Конфигурация уровней и их требований'; 