-- Миграция для добавления поля role в таблицу messages
-- Это поле нужно для различения сообщений пользователя и бота

-- Добавляем поле role в таблицу messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Обновляем существующие записи (если есть)
UPDATE messages 
SET role = 'user' 
WHERE role IS NULL;

-- Создаем индекс для быстрого поиска по user_id и role
CREATE INDEX IF NOT EXISTS idx_messages_user_role 
ON messages(user_id, role);

-- Создаем политики для messages
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
CREATE POLICY "Users can insert their own messages" ON messages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Проверяем структуру таблицы messages
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position; 