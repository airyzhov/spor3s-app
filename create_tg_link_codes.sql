-- Создание таблицы для кодов привязки Telegram бота
-- Выполните этот скрипт в Supabase SQL Editor

-- Создаем таблицу tg_link_codes если её нет
CREATE TABLE IF NOT EXISTS tg_link_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_code VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    telegram_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT FALSE
);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tg_link_codes_auth_code ON tg_link_codes(auth_code);
CREATE INDEX IF NOT EXISTS idx_tg_link_codes_user_id ON tg_link_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_tg_link_codes_expires_at ON tg_link_codes(expires_at);

-- Включаем RLS
ALTER TABLE tg_link_codes ENABLE ROW LEVEL SECURITY;

-- Создаем политики для tg_link_codes
DROP POLICY IF EXISTS "Anyone can insert link codes" ON tg_link_codes;
DROP POLICY IF EXISTS "Anyone can read link codes" ON tg_link_codes;
DROP POLICY IF EXISTS "Anyone can update link codes" ON tg_link_codes;

-- Политика для вставки (любой может создать код)
CREATE POLICY "Anyone can insert link codes" ON tg_link_codes
    FOR INSERT WITH CHECK (true);

-- Политика для чтения (любой может читать коды)
CREATE POLICY "Anyone can read link codes" ON tg_link_codes
    FOR SELECT USING (true);

-- Политика для обновления (любой может обновлять коды)
CREATE POLICY "Anyone can update link codes" ON tg_link_codes
    FOR UPDATE USING (true);

-- Функция для очистки истекших кодов
CREATE OR REPLACE FUNCTION cleanup_expired_link_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM tg_link_codes 
    WHERE expires_at < NOW() AND is_used = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматической очистки истекших кодов
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_codes()
RETURNS trigger AS $$
BEGIN
    -- Удаляем истекшие коды при каждой операции
    PERFORM cleanup_expired_link_codes();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DROP TRIGGER IF EXISTS cleanup_expired_codes_trigger ON tg_link_codes;
CREATE TRIGGER cleanup_expired_codes_trigger
    AFTER INSERT OR UPDATE ON tg_link_codes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_expired_codes();

-- Проверяем создание таблицы
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tg_link_codes'
ORDER BY ordinal_position;