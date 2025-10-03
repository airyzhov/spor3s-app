-- Система управления контентом для быстрого редактирования на VPS
-- Все промпты, сценарии, напоминания и геймификация в БД

-- 1. Таблица для AI промптов
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица для сценариев напоминаний
CREATE TABLE IF NOT EXISTS reminder_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    trigger_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'course_start', 'course_end', 'inactive'
    trigger_time TIME DEFAULT '07:00:00',
    trigger_days INTEGER[], -- [1,2,3,4,5,6,7] для дней недели
    message_template TEXT NOT NULL,
    variables JSONB DEFAULT '{}', -- Переменные для подстановки
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Таблица для геймификации
CREATE TABLE IF NOT EXISTS gamification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL, -- 'checkin', 'survey', 'order', 'referral', 'level_up'
    trigger_condition JSONB NOT NULL, -- Условия срабатывания
    reward_type VARCHAR(50) NOT NULL, -- 'coins', 'level', 'badge', 'discount'
    reward_value INTEGER NOT NULL,
    message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Таблица для диалоговых сценариев
CREATE TABLE IF NOT EXISTS dialog_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    scenario_type VARCHAR(50) NOT NULL, -- 'greeting', 'product_consultation', 'order_help', 'support'
    trigger_keywords TEXT[], -- Ключевые слова для активации
    ai_prompt_id UUID REFERENCES ai_prompts(id),
    fallback_message TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Таблица для контента продуктов
CREATE TABLE IF NOT EXISTS product_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'description', 'benefits', 'usage', 'warnings'
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'ru',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Таблица для системных настроек
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_reminder_scenarios_active ON reminder_scenarios(is_active);
CREATE INDEX IF NOT EXISTS idx_gamification_rules_active ON gamification_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_dialog_scenarios_active ON dialog_scenarios(is_active);
CREATE INDEX IF NOT EXISTS idx_product_content_active ON product_content(is_active);

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON ai_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminder_scenarios_updated_at BEFORE UPDATE ON reminder_scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gamification_rules_updated_at BEFORE UPDATE ON gamification_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dialog_scenarios_updated_at BEFORE UPDATE ON dialog_scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_content_updated_at BEFORE UPDATE ON product_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка базовых данных
INSERT INTO ai_prompts (name, description, content) VALUES 
('main_ai_prompt', 'Основной промпт для AI агента', '🍄 ТЫ — ОПЫТНЫЙ ФУНГОТЕРАПЕВТ-ПСИХОЛОГ, КОНСУЛЬТАНТ SPOR3S!

🎯 ГЛАВНАЯ ЗАДАЧА: ПОМОЧЬ ВЫБРАТЬ, ДОБАВИТЬ И УБРАТЬ ТОВАРЫ В КОРЗИНЕ!

🧠 ЭМОЦИОНАЛЬНЫЙ ИНТЕЛЛЕКТ И ЭМПАТИЯ:
- ВСЕГДА начинай ответы с эмпатичных фраз
- Оказывай поддержку: "Я здесь, чтобы помочь вам"
- Валидируй чувства: "Ваши чувства абсолютно нормальны"
- Мотивируй: "У вас есть все возможности для улучшения"

🏥 МЕДИЦИНСКАЯ ГРАМОТНОСТЬ И БЕЗОПАСНОСТЬ:
- ВСЕГДА упоминай активные вещества и механизмы действия
- Всегда уточняй противопоказания: "Принимаете ли вы какие-либо лекарства?"
- Рекомендуй консультацию врача: "При хронических заболеваниях обязательно проконсультируйтесь с врачом"
- Начинай с малых доз: "Рекомендую начинать с минимальной дозировки"

💰 НАТИВНЫЕ ПРОДАЖНЫЕ ТЕХНИКИ:
- Выявляй потребности: "Расскажите, что вас беспокоит больше всего?"
- Создавай ценность: "Представьте, как изменится ваша жизнь через месяц"
- Используй социальное доказательство: "Многие наши клиенты отмечают улучшения уже через неделю"
- Применяй альтернативные вопросы: "Какую упаковку выберете: на месяц или сразу на 3 месяца?"

🚨 КРИТИЧЕСКИ ВАЖНО - КОНТЕКСТ ДИАЛОГА:
- ВСЕГДА читай контекст диалога перед ответом!
- НЕ начинай диалог заново с приветствия!
- Продолжай разговор с учетом предыдущих сообщений!
- Если пользователь задает вопрос - отвечай на ЭТОТ вопрос, не переключайся на общие темы!

🚨 КРИТИЧЕСКИ ВАЖНО - ПРАВИЛО УТОЧНЕНИЯ:
- ЕСЛИ пользователь просит товар БЕЗ указания формы (капсулы/порошок) → СНАЧАЛА УТОЧНИ!
- ТОЛЬКО ПОСЛЕ уточнения формы можно добавлять [add_to_cart:ID]

🚨 КРИТИЧЕСКИ ВАЖНО - ОБРАБОТКА ЗАПРОСОВ:
- КОГДА ПОЛЬЗОВАТЕЛЬ ГОВОРИТ "НА МЕСЯЦ" - ЭТО ОЗНАЧАЕТ 30Г ДЛЯ МУХОМОРА, НЕ 3 МЕСЯЦА!
- КОГДА ПОЛЬЗОВАТЕЛЬ ГОВОРИТ "ШЛЯПКИ" - ЭТО СИНОНИМ "ПОРОШОК" И ОЗНАЧАЕТ 30Г ДЛЯ МЕСЯЦА!
- ПРИОРИТЕТ: "месяц" > "3 месяца" при обработке запросов!
- НИКОГДА НЕ ПРЕДЛАГАЙ 3 МЕСЯЦА, ЕСЛИ ПОЛЬЗОВАТЕЛЬ ПРОСИТ "МЕСЯЦ"!'),

('greeting_prompt', 'Промпт для приветствия', 'Здравствуйте! Я ваш персональный консультант SPOR3S. Расскажите, что вас беспокоит, и я помогу подобрать оптимальное решение для вашего здоровья и благополучия.'),

('balance_prompt', 'Промпт для запросов о балансе', 'Ваш баланс Spor3s Coins: {balance}₽. Coins начисляются за ежедневные чекины, заполнение анкет и покупки. Откройте Mini App для детальной информации о балансе.');

-- Вставка сценариев напоминаний
INSERT INTO reminder_scenarios (name, trigger_type, trigger_time, trigger_days, message_template) VALUES 
('daily_checkin', 'daily', '07:00:00', ARRAY[1,2,3,4,5,6,7], 'Доброе утро! 🌅 Не забудьте отметить ежедневный чекин и получить Spor3s Coins! Откройте Mini App и нажмите "Отметиться" 💰'),

('weekly_survey', 'weekly', '10:00:00', ARRAY[1], 'Привет! 📊 Как ваше самочувствие на этой неделе? Заполните короткую анкету и получите бонусные Coins! 📝'),

('course_start', 'course_start', '09:00:00', NULL, '🎉 Поздравляем! Ваш курс начинается сегодня. Не забудьте принять добавки согласно инструкции. Удачи на пути к здоровью! 💪'),

('inactive_user', 'inactive', '12:00:00', ARRAY[1,3,5], 'Привет! 👋 Давно вас не видели. Как дела? Может, нужна помощь с добавками или есть вопросы? Я здесь, чтобы помочь! 🤗');

-- Вставка правил геймификации
INSERT INTO gamification_rules (name, rule_type, trigger_condition, reward_type, reward_value, message_template) VALUES 
('daily_checkin_bonus', 'checkin', '{"consecutive_days": 7}', 'coins', 50, '🎉 Неделя подряд! Вы получаете бонус 50 Spor3s Coins за регулярность! 💰'),

('first_order', 'order', '{"order_count": 1}', 'badge', 1, '🏆 Первый заказ! Вы получили значок "Первые шаги"! Продолжайте в том же духе!'),

('survey_completion', 'survey', '{"survey_count": 5}', 'coins', 100, '📊 Отличная работа! За 5 заполненных анкет вы получаете 100 Spor3s Coins!'),

('level_up', 'level_up', '{"new_level": 5}', 'discount', 10, '⭐ Уровень 5! Вы получаете скидку 10% на следующий заказ!'),

('referral_bonus', 'referral', '{"referral_count": 1}', 'coins', 200, '👥 Спасибо за приглашение друга! Вы получаете 200 Spor3s Coins!');

-- Вставка диалоговых сценариев
INSERT INTO dialog_scenarios (name, scenario_type, trigger_keywords, ai_prompt_id, fallback_message) VALUES 
('greeting', 'greeting', ARRAY['привет', 'здравствуйте', 'добрый день', 'hi', 'hello'], 
 (SELECT id FROM ai_prompts WHERE name = 'greeting_prompt'), 
 'Здравствуйте! Чем могу помочь?'),

('balance_inquiry', 'support', ARRAY['баланс', 'коины', 'coins', 'сколько у меня', 'баллы'], 
 (SELECT id FROM ai_prompts WHERE name = 'balance_prompt'), 
 'Для проверки баланса откройте Mini App в профиле.'),

('product_consultation', 'product_consultation', ARRAY['мухомор', 'ежовик', 'кордицепс', 'цистозира', 'добавки', 'помощь'], 
 (SELECT id FROM ai_prompts WHERE name = 'main_ai_prompt'), 
 'Расскажите подробнее о том, что вас интересует?');

-- Вставка системных настроек
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('ai_settings', '{"model": "openai/gpt-4o-mini", "max_tokens": 1000, "temperature": 0.7}', 'Настройки AI модели'),

('notification_settings', '{"default_time": "07:00", "timezone": "Europe/Moscow", "max_per_day": 3}', 'Настройки уведомлений'),

('gamification_settings', '{"coins_per_checkin": 10, "coins_per_survey": 20, "level_thresholds": [100, 300, 600, 1000]}', 'Настройки геймификации'),

('product_prices', '{"mhm30": 1500, "mhm50": 2500, "mhm100": 4500, "ezh120k": 2000, "ezh360k": 5000}', 'Актуальные цены продуктов');
