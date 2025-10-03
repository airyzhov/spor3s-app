-- 🎮 УПРОЩЕННАЯ СХЕМА БД ДЛЯ ГЕЙМИФИКАЦИИ С АРТЕФАКТАМИ
-- Версия с фото/видео подтверждениями

-- 1. Челленджи (справочник)
CREATE TABLE challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  coins_reward INTEGER DEFAULT 0,
  proof_type VARCHAR(20) CHECK (proof_type IN ('photo', 'video')) DEFAULT 'photo',
  category VARCHAR(50) DEFAULT 'daily', -- daily, creative, weekly
  time_restriction VARCHAR(50), -- morning, evening, anytime
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Артефакты пользователей (фото/видео доказательства)
CREATE TABLE habit_proofs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  
  -- Файл
  file_url TEXT NOT NULL,
  file_type VARCHAR(20) NOT NULL, -- image/jpeg, video/mp4
  file_size INTEGER,
  
  -- Метаданные
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_lat DECIMAL(10, 8), -- опционально для геочелленджей
  location_lng DECIMAL(11, 8),
  
  -- Модерация
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderator_notes TEXT,
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderated_by UUID REFERENCES users(id),
  
  -- Награды
  coins_earned INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Упрощенный прогресс пользователя
CREATE TABLE user_progress_simple (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Уровень и опыт
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  
  -- Монеты
  total_coins_earned INTEGER DEFAULT 0,
  total_coins_spent INTEGER DEFAULT 0,
  
  -- Челленджи
  challenges_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  
  -- Даты
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 4. История coins (упрощенная)
CREATE TABLE coin_transactions_simple (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'spent')),
  source_type VARCHAR(50), -- challenge, purchase, bonus
  source_id UUID, -- ID челленджа или покупки
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Достижения (упрощенные)
CREATE TABLE achievements_simple (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  category VARCHAR(50), -- streak, creative, special
  condition_value INTEGER, -- количество для выполнения
  coins_reward INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Полученные достижения
CREATE TABLE user_achievements_simple (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements_simple(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

-- ИНДЕКСЫ
CREATE INDEX idx_habit_proofs_user_date ON habit_proofs(user_id, timestamp);
CREATE INDEX idx_habit_proofs_challenge ON habit_proofs(challenge_id);
CREATE INDEX idx_habit_proofs_status ON habit_proofs(status);
CREATE INDEX idx_coin_transactions_user ON coin_transactions_simple(user_id, created_at);

-- ТРИГГЕРЫ И ФУНКЦИИ

-- Функция для обновления прогресса при одобрении челленджа
CREATE OR REPLACE FUNCTION update_progress_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Только для одобренных челленджей
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Обновляем прогресс пользователя
    INSERT INTO user_progress_simple (user_id, xp, total_coins_earned, challenges_completed, current_streak, last_activity_date)
    VALUES (NEW.user_id, NEW.xp_earned, NEW.coins_earned, 1, 1, CURRENT_DATE)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      xp = user_progress_simple.xp + NEW.xp_earned,
      total_coins_earned = user_progress_simple.total_coins_earned + NEW.coins_earned,
      challenges_completed = user_progress_simple.challenges_completed + 1,
      current_streak = CASE 
        WHEN user_progress_simple.last_activity_date = CURRENT_DATE - INTERVAL '1 day' 
        THEN user_progress_simple.current_streak + 1
        WHEN user_progress_simple.last_activity_date = CURRENT_DATE 
        THEN user_progress_simple.current_streak
        ELSE 1
      END,
      longest_streak = GREATEST(
        user_progress_simple.longest_streak, 
        CASE 
          WHEN user_progress_simple.last_activity_date = CURRENT_DATE - INTERVAL '1 day' 
          THEN user_progress_simple.current_streak + 1
          ELSE user_progress_simple.current_streak
        END
      ),
      last_activity_date = CURRENT_DATE,
      updated_at = NOW();
    
    -- Записываем транзакцию coins
    INSERT INTO coin_transactions_simple (user_id, amount, transaction_type, source_type, source_id, description)
    VALUES (NEW.user_id, NEW.coins_earned, 'earned', 'challenge', NEW.challenge_id, 
            'Челлендж: ' || (SELECT name FROM challenges WHERE id = NEW.challenge_id));
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления прогресса
CREATE TRIGGER trigger_update_progress_on_approval
  AFTER UPDATE ON habit_proofs
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_on_approval();

-- Функция для расчета уровня по XP
CREATE OR REPLACE FUNCTION calculate_level(xp_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF xp_amount < 100 THEN RETURN 1;
  ELSIF xp_amount < 300 THEN RETURN 2;
  ELSIF xp_amount < 500 THEN RETURN 3;
  ELSIF xp_amount < 1000 THEN RETURN 4;
  ELSE RETURN 5;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ВСТАВКА БАЗОВЫХ ЧЕЛЛЕНДЖЕЙ
INSERT INTO challenges (code, name, description, icon, coins_reward, proof_type, category, time_restriction) VALUES
-- Ежедневные
('healthy_food', 'Здоровое питание', 'Фото тарелки с овощами/фруктами', '🍽️', 8, 'photo', 'daily', 'anytime'),
('morning_water', 'Утренний стакан воды', 'Фото стакана воды в руке', '💧', 5, 'photo', 'daily', 'morning'),
('reading', 'Чтение книги', 'Фото книги с закладкой', '📚', 10, 'photo', 'daily', 'anytime'),
('meditation', 'Медитация/йога', 'Селфи в позе медитации', '🧘', 12, 'photo', 'daily', 'anytime'),
('exercise', 'Активность', 'Видео тренировки 15-30 сек', '🏃', 15, 'video', 'daily', 'anytime'),
('relaxation', 'Расслабление', 'Фото ванны или уютной обстановки', '🛁', 10, 'photo', 'daily', 'evening'),
('digital_detox', 'Цифровой детокс', 'Фото места без гаджетов', '📱', 20, 'photo', 'daily', 'evening'),

-- Креативные
('mushroom_dish', 'Грибное меню', 'Фото блюда с грибами', '🍄', 50, 'photo', 'creative', 'anytime'),
('sunrise', 'Встреча рассвета', 'Селфи с восходом солнца', '🌅', 100, 'photo', 'creative', 'morning'),
('nature_meditation', 'Медитация в природе', 'Фото медитации на природе', '🧘‍♀️', 80, 'photo', 'creative', 'anytime'),
('brand_reading', 'Spor3s + книга', 'Фото продукта spor3s с книгой', '📖', 60, 'photo', 'creative', 'anytime');

-- ВСТАВКА БАЗОВЫХ ДОСТИЖЕНИЙ
INSERT INTO achievements_simple (code, name, description, icon, category, condition_value, coins_reward, xp_reward) VALUES
('first_challenge', 'Первый шаг', 'Выполнил первый челлендж', '🌱', 'milestone', 1, 20, 10),
('week_streak', 'Огонек', '7 дней подряд', '🔥', 'streak', 7, 50, 25),
('month_streak', 'Разряд', '30 дней подряд', '⚡', 'streak', 30, 200, 100),
('photo_master', 'Фотограф', '50 фото челленджей', '📸', 'milestone', 50, 150, 75),
('video_creator', 'Режиссер', '20 видео челленджей', '🎬', 'milestone', 20, 100, 50),
('creative_soul', 'Творческая душа', '10 креативных челленджей', '🎨', 'creative', 10, 200, 100),
('healthy_eater', 'Здоровое питание', '30 фото здоровой еды', '🥗', 'health', 30, 100, 50),
('bookworm', 'Книжный червь', '50 фото с книгами', '📚', 'intellectual', 50, 150, 75);

-- VIEW для статистики пользователя
CREATE OR REPLACE VIEW user_stats_simple AS
SELECT 
  u.id as user_id,
  u.telegram_id,
  u.name,
  ups.level,
  ups.xp,
  ups.total_coins_earned,
  ups.total_coins_spent,
  (ups.total_coins_earned - ups.total_coins_spent) as current_coins,
  ups.challenges_completed,
  ups.current_streak,
  ups.longest_streak,
  ups.last_activity_date,
  COUNT(uas.id) as achievements_count
FROM users u
LEFT JOIN user_progress_simple ups ON u.id = ups.user_id
LEFT JOIN user_achievements_simple uas ON u.id = uas.user_id
GROUP BY u.id, ups.level, ups.xp, ups.total_coins_earned, ups.total_coins_spent, 
         ups.challenges_completed, ups.current_streak, ups.longest_streak, ups.last_activity_date;

-- VIEW для последних челленджей пользователя
CREATE OR REPLACE VIEW user_recent_challenges AS
SELECT 
  hp.user_id,
  hp.id as proof_id,
  hp.file_url,
  hp.timestamp,
  hp.status,
  hp.coins_earned,
  c.name as challenge_name,
  c.icon as challenge_icon,
  c.category
FROM habit_proofs hp
JOIN challenges c ON hp.challenge_id = c.id
WHERE hp.status = 'approved'
ORDER BY hp.timestamp DESC;

COMMENT ON TABLE challenges IS 'Справочник челленджей с фото/видео';
COMMENT ON TABLE habit_proofs IS 'Артефакты (фото/видео) выполненных челленджей';
COMMENT ON TABLE user_progress_simple IS 'Упрощенный прогресс пользователя';
COMMENT ON TABLE coin_transactions_simple IS 'Упрощенная история Spor3s Coins';
COMMENT ON TABLE achievements_simple IS 'Упрощенные достижения';
COMMENT ON TABLE user_achievements_simple IS 'Полученные достижения пользователей'; 