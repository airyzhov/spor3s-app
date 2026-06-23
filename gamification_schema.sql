-- 🎮 СХЕМА БАЗЫ ДАННЫХ ДЛЯ ГЕЙМИФИКАЦИИ spor3s-app
-- Создание таблиц для системы уровней, достижений и Road Map

-- 1. Прогресс пользователя (уровни и XP)
CREATE TABLE user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_days_active INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 2. Ежедневные метрики самочувствия
CREATE TABLE daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Основные метрики (1-10)
  memory_score INTEGER CHECK (memory_score >= 1 AND memory_score <= 10),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  
  -- Дополнительные метрики
  mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 10),
  focus_score INTEGER CHECK (focus_score >= 1 AND focus_score <= 10),
  
  -- Заметки пользователя
  notes TEXT,
  
  -- Прием добавок
  supplements_taken BOOLEAN DEFAULT FALSE,
  supplements_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- 3. Стартовая диагностика (точка А)
CREATE TABLE initial_assessment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Базовые показатели
  memory_baseline INTEGER CHECK (memory_baseline >= 1 AND memory_baseline <= 10),
  sleep_baseline INTEGER CHECK (sleep_baseline >= 1 AND sleep_baseline <= 10),
  energy_baseline INTEGER CHECK (energy_baseline >= 1 AND energy_baseline <= 10),
  stress_baseline INTEGER CHECK (stress_baseline >= 1 AND stress_baseline <= 10),
  
  -- Цели и планы
  primary_goal TEXT,
  planned_duration INTEGER, -- дней
  additional_goals TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 4. Дополнительные привычки
CREATE TABLE habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Утренние привычки
  morning_meditation BOOLEAN DEFAULT FALSE,
  morning_water BOOLEAN DEFAULT FALSE,
  morning_exercise BOOLEAN DEFAULT FALSE,
  gratitude_journal BOOLEAN DEFAULT FALSE,
  
  -- Дневные привычки
  daily_steps INTEGER DEFAULT 0,
  healthy_meals INTEGER DEFAULT 0,
  water_intake INTEGER DEFAULT 0, -- литры * 10 (для точности)
  no_social_media BOOLEAN DEFAULT FALSE,
  
  -- Вечерние привычки
  evening_reading BOOLEAN DEFAULT FALSE,
  relaxing_bath BOOLEAN DEFAULT FALSE,
  devices_off BOOLEAN DEFAULT FALSE,
  evening_meditation BOOLEAN DEFAULT FALSE,
  
  -- Подсчет очков
  coins_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- 5. Система достижений
CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- basic, product, social, secret
  icon VARCHAR(10),
  xp_reward INTEGER DEFAULT 0,
  coins_reward INTEGER DEFAULT 0,
  rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
  
  -- Условия получения
  condition_type VARCHAR(50), -- streak, total_days, metric_improvement, etc.
  condition_value JSONB, -- параметры условия
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Полученные достижения
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

-- 7. Недельные итоги
CREATE TABLE weekly_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_number INTEGER NOT NULL,
  
  -- Средние значения за неделю
  avg_memory DECIMAL(3,2),
  avg_sleep DECIMAL(3,2),
  avg_energy DECIMAL(3,2),
  avg_stress DECIMAL(3,2),
  
  -- Прогресс
  days_active INTEGER DEFAULT 0,
  supplements_consistency INTEGER DEFAULT 0, -- процент дней приема
  habits_completed INTEGER DEFAULT 0,
  
  -- Награды и достижения
  xp_earned INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  
  -- Заметки недели
  weekly_notes TEXT,
  phase VARCHAR(50), -- Адаптация, Первые ростки, Укрепление грибницы
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, week_start)
);

-- 8. Транзакции coins
CREATE TABLE coin_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- earned, spent, bonus
  source VARCHAR(100), -- habit_meditation, achievement_streak, purchase_discount
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ИНДЕКСЫ для производительности
CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date);
CREATE INDEX idx_habits_user_date ON habits(user_id, date);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_weekly_summaries_user_week ON weekly_summaries(user_id, week_start);
CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id, created_at);

-- ФУНКЦИИ И ТРИГГЕРЫ для автоматизации

-- Функция для подсчета coins за привычки
CREATE OR REPLACE FUNCTION calculate_daily_coins()
RETURNS TRIGGER AS $$
BEGIN
  NEW.coins_earned := 
    (CASE WHEN NEW.morning_meditation THEN 10 ELSE 0 END) +
    (CASE WHEN NEW.morning_water THEN 5 ELSE 0 END) +
    (CASE WHEN NEW.morning_exercise THEN 12 ELSE 0 END) +
    (CASE WHEN NEW.gratitude_journal THEN 8 ELSE 0 END) +
    (CASE WHEN NEW.daily_steps >= 10000 THEN 8 ELSE 0 END) +
    (CASE WHEN NEW.water_intake >= 20 THEN 5 ELSE 0 END) + -- 2+ литра
    (CASE WHEN NEW.no_social_media THEN 15 ELSE 0 END) +
    (CASE WHEN NEW.evening_reading THEN 10 ELSE 0 END) +
    (CASE WHEN NEW.relaxing_bath THEN 8 ELSE 0 END) +
    (CASE WHEN NEW.devices_off THEN 12 ELSE 0 END) +
    (CASE WHEN NEW.evening_meditation THEN 10 ELSE 0 END);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического подсчета coins
CREATE TRIGGER trigger_calculate_coins
  BEFORE INSERT OR UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION calculate_daily_coins();

-- Функция для обновления прогресса пользователя
CREATE OR REPLACE FUNCTION update_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем статистику в user_progress
  INSERT INTO user_progress (user_id, xp, total_days_active)
  VALUES (NEW.user_id, 5, 1) -- базовые 5 XP за день активности
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    xp = user_progress.xp + 5,
    total_days_active = user_progress.total_days_active + 1,
    updated_at = NOW();
  
  -- Записываем транзакцию coins
  IF NEW.coins_earned > 0 THEN
    INSERT INTO coin_transactions (user_id, amount, transaction_type, source, description)
    VALUES (NEW.user_id, NEW.coins_earned, 'earned', 'daily_habits', 
            'Ежедневные привычки: ' || NEW.coins_earned || ' coins');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления прогресса
CREATE TRIGGER trigger_update_progress
  AFTER INSERT OR UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress();

-- ВСТАВКА БАЗОВЫХ ДОСТИЖЕНИЙ
INSERT INTO achievements (code, name, description, category, icon, xp_reward, coins_reward, condition_type, condition_value) VALUES
('first_day', 'Первый день', 'Начал прием грибных добавок', 'basic', '🌱', 10, 20, 'daily_entry', '{"count": 1}'),
('week_streak', 'Огонек', '7 дней подряд', 'basic', '🔥', 25, 50, 'streak', '{"days": 7}'),
('month_streak', 'Разряд', '30 дней подряд', 'basic', '⚡', 100, 200, 'streak', '{"days": 30}'),
('diamond_streak', 'Алмазная серия', '100 дней подряд', 'basic', '💎', 500, 1000, 'streak', '{"days": 100}'),
('memory_boost', 'Мудрец', 'Улучшение памяти на 50%+', 'product', '🧠', 50, 100, 'metric_improvement', '{"metric": "memory", "percent": 50}'),
('sleep_master', 'Сонник', 'Стабильный качественный сон', 'product', '😴', 50, 100, 'metric_improvement', '{"metric": "sleep", "percent": 40}'),
('energy_boost', 'Энерджайзер', 'Рост энергии на 50%+', 'product', '⚡', 50, 100, 'metric_improvement', '{"metric": "energy", "percent": 50}'),
('zen_master', 'Дзен-мастер', 'Снижение стресса на 30%+', 'product', '🧘', 50, 100, 'metric_improvement', '{"metric": "stress", "percent": -30}'),
('social_invite', 'Вербовщик', 'Привел 3 друзей', 'social', '👥', 100, 300, 'referrals', '{"count": 3}'),
('habit_master', 'Мастер привычек', '50 дополнительных привычек', 'social', '🌟', 75, 150, 'habits_total', '{"count": 50}'),
('midnight_unicorn', 'Единорог', 'Прием в полночь 7 дней', 'secret', '🦄', 200, 500, 'midnight_streak', '{"days": 7}'),
('full_improvement', 'Волшебник', 'Улучшение всех показателей на 100%+', 'secret', '🧙‍♂️', 1000, 2000, 'all_metrics', '{"percent": 100}');

-- Создание VIEW для удобного получения статистики
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  u.id as user_id,
  u.telegram_id,
  u.name,
  up.level,
  up.xp,
  up.current_streak,
  up.longest_streak,
  up.total_days_active,
  COALESCE(SUM(ct.amount), 0) as total_coins,
  COUNT(ua.id) as achievements_count,
  ia.primary_goal,
  ia.planned_duration
FROM users u
LEFT JOIN user_progress up ON u.id = up.user_id
LEFT JOIN coin_transactions ct ON u.id = ct.user_id AND ct.transaction_type IN ('earned', 'bonus')
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN initial_assessment ia ON u.id = ia.user_id
GROUP BY u.id, up.level, up.xp, up.current_streak, up.longest_streak, up.total_days_active, ia.primary_goal, ia.planned_duration;

-- Создание VIEW для последних метрик пользователя
CREATE OR REPLACE VIEW latest_user_metrics AS
SELECT DISTINCT ON (user_id)
  user_id,
  date,
  memory_score,
  sleep_quality,
  energy_level,
  stress_level,
  mood_score,
  focus_score,
  supplements_taken
FROM daily_metrics
ORDER BY user_id, date DESC;

COMMENT ON TABLE user_progress IS 'Прогресс пользователя: уровни, XP, серии';
COMMENT ON TABLE daily_metrics IS 'Ежедневные метрики самочувствия пользователя';
COMMENT ON TABLE initial_assessment IS 'Стартовая диагностика (точка А) для Road Map';
COMMENT ON TABLE habits IS 'Дополнительные привычки пользователя за день';
COMMENT ON TABLE achievements IS 'Справочник всех возможных достижений';
COMMENT ON TABLE user_achievements IS 'Достижения, полученные пользователями';
COMMENT ON TABLE weekly_summaries IS 'Еженедельные итоги прогресса';
COMMENT ON TABLE coin_transactions IS 'История транзакций Spor3s Coins'; 