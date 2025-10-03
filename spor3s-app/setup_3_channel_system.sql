-- НАСТРОЙКА 3-КАНАЛЬНОЙ СИСТЕМЫ ОБЩЕНИЯ
-- =======================================
-- Каналы: mini_app, telegram_bot, spor3z

-- 1. ДОБАВИТЬ КОЛОНКУ SOURCE В MESSAGES
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'mini_app';

-- Добавить комментарий
COMMENT ON COLUMN messages.source IS 'Источник сообщения: mini_app, telegram_bot, spor3z';

-- Обновить существующие записи
UPDATE messages 
SET source = 'mini_app' 
WHERE source IS NULL;

-- 2. СОЗДАТЬ ТАБЛИЦУ AI_AGENT_STATUS
CREATE TABLE IF NOT EXISTS ai_agent_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    auto_mode BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(telegram_id)
);

-- Добавить комментарии
COMMENT ON TABLE ai_agent_status IS 'Статус AI агента для каждого пользователя';
COMMENT ON COLUMN ai_agent_status.is_active IS 'Активен ли AI агент (старт/стоп)';
COMMENT ON COLUMN ai_agent_status.auto_mode IS 'Автоматический режим или ручное управление';
COMMENT ON COLUMN ai_agent_status.telegram_id IS 'Telegram ID для прямой связи';

-- 3. СОЗДАТЬ ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ
CREATE INDEX IF NOT EXISTS idx_messages_source ON messages(source);
CREATE INDEX IF NOT EXISTS idx_messages_user_source ON messages(user_id, source);
CREATE INDEX IF NOT EXISTS idx_ai_agent_status_telegram_id ON ai_agent_status(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_status_active ON ai_agent_status(is_active);

-- 4. СОЗДАТЬ ФУНКЦИЮ ДЛЯ АВТОМАТИЧЕСКОГО СОЗДАНИЯ СТАТУСА AI АГЕНТА
CREATE OR REPLACE FUNCTION create_ai_agent_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ai_agent_status (user_id, telegram_id, is_active, auto_mode)
    VALUES (NEW.id, NEW.telegram_id, TRUE, TRUE)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. СОЗДАТЬ ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО СОЗДАНИЯ СТАТУСА
DROP TRIGGER IF EXISTS trigger_create_ai_agent_status ON users;
CREATE TRIGGER trigger_create_ai_agent_status
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_ai_agent_status();

-- 6. СОЗДАТЬ СТАТУС ДЛЯ СУЩЕСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ
INSERT INTO ai_agent_status (user_id, telegram_id, is_active, auto_mode)
SELECT id, telegram_id, TRUE, TRUE
FROM users
WHERE id NOT IN (SELECT user_id FROM ai_agent_status WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 7. ПРОВЕРКА РЕЗУЛЬТАТОВ
SELECT 
    'MESSAGES_SOURCE' as check_type,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN source IS NOT NULL THEN 1 END) as with_source
FROM messages;

SELECT 
    'AI_AGENT_STATUS' as check_type,
    COUNT(*) as total_users_with_status,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_agents
FROM ai_agent_status;

SELECT 
    'SOURCE_DISTRIBUTION' as check_type,
    source,
    COUNT(*) as message_count
FROM messages
GROUP BY source
ORDER BY message_count DESC;
