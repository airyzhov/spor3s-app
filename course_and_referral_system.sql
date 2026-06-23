-- Создание таблицы для отслеживания курсов пользователей
CREATE TABLE IF NOT EXISTS user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_duration INTEGER NOT NULL CHECK (course_duration IN (1, 3, 6)),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для реферальной системы
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  cashback_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_user_id) -- Один пользователь может быть приглашен только один раз
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_status ON user_courses(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user_id ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Добавление колонки referral_code в таблицу users (если её нет)
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_user_courses_updated_at 
  BEFORE UPDATE ON user_courses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at 
  BEFORE UPDATE ON referrals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для начисления 5% кешбека при заказе реферала
CREATE OR REPLACE FUNCTION process_referral_cashback()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
  cashback_amount INTEGER;
BEGIN
  -- Если заказ завершен, проверяем реферальную связь
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Находим реферала
    SELECT referrer_user_id INTO referrer_id
    FROM referrals 
    WHERE referred_user_id = NEW.user_id 
    AND status = 'pending';
    
    IF referrer_id IS NOT NULL THEN
      -- Рассчитываем 5% кешбека
      cashback_amount := FLOOR(NEW.total * 0.05);
      
      -- Обновляем статус реферала
      UPDATE referrals 
      SET status = 'completed', 
          updated_at = NOW()
      WHERE referred_user_id = NEW.user_id;
      
      -- Добавляем кешбек к заказу реферера
      UPDATE orders 
      SET spores_coin = COALESCE(spores_coin, 0) + cashback_amount
      WHERE user_id = referrer_id 
      AND status = 'active';
      
      -- Записываем транзакцию кешбека
      INSERT INTO coin_transactions (
        user_id, 
        order_id, 
        type, 
        amount, 
        description, 
        created_at
      ) VALUES (
        referrer_id,
        (SELECT id FROM orders WHERE user_id = referrer_id AND status = 'active' LIMIT 1),
        'referral_cashback',
        cashback_amount,
        'Кешбек 5% от заказа реферала',
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматической обработки кешбека
CREATE TRIGGER process_referral_cashback_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION process_referral_cashback();

-- Комментарии к таблицам
COMMENT ON TABLE user_courses IS 'Таблица для отслеживания курсов пользователей';
COMMENT ON TABLE referrals IS 'Таблица для реферальной системы';
COMMENT ON COLUMN user_courses.course_duration IS 'Длительность курса в месяцах (1, 3, 6)';
COMMENT ON COLUMN referrals.status IS 'Статус реферала: pending - ожидает заказа, completed - заказ сделан';
COMMENT ON COLUMN referrals.cashback_paid IS 'Выплачен ли кешбек рефереру'; 