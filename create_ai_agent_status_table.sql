-- Создание таблицы для статуса AI агента
CREATE TABLE IF NOT EXISTS ai_agent_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Создание индекса для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_ai_agent_status_user_id ON ai_agent_status(user_id);

-- Создание индекса для поиска активных агентов
CREATE INDEX IF NOT EXISTS idx_ai_agent_status_active ON ai_agent_status(is_active) WHERE is_active = TRUE;

-- Добавление комментариев к таблице
COMMENT ON TABLE ai_agent_status IS 'Таблица для хранения статуса AI агента пользователей';
COMMENT ON COLUMN ai_agent_status.user_id IS 'ID пользователя (ссылка на users.id)';
COMMENT ON COLUMN ai_agent_status.is_active IS 'Статус активности AI агента';
COMMENT ON COLUMN ai_agent_status.last_updated IS 'Время последнего обновления статуса';

-- Создание RLS политик (если включены)
ALTER TABLE ai_agent_status ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (пользователи могут видеть только свой статус)
CREATE POLICY "Users can view their own agent status" ON ai_agent_status
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Политика для вставки (пользователи могут создавать только свой статус)
CREATE POLICY "Users can insert their own agent status" ON ai_agent_status
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Политика для обновления (пользователи могут обновлять только свой статус)
CREATE POLICY "Users can update their own agent status" ON ai_agent_status
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Функция для автоматического обновления last_updated
CREATE OR REPLACE FUNCTION update_ai_agent_status_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления last_updated
CREATE TRIGGER update_ai_agent_status_updated_trigger
    BEFORE UPDATE ON ai_agent_status
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_agent_status_updated();

-- Вставка тестовых данных (опционально)
-- INSERT INTO ai_agent_status (user_id, is_active) 
-- SELECT id, FALSE FROM users LIMIT 5; 