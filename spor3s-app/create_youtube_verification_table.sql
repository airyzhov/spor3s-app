-- Создание таблицы для заявок на проверку YouTube подписок
CREATE TABLE IF NOT EXISTS youtube_verification_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'screenshot_received', 'approved', 'rejected')),
    screenshot_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    approved_by TEXT,
    rejected_by TEXT,
    
    -- Индексы для быстрого поиска
    CONSTRAINT idx_youtube_verification_user_status UNIQUE (user_id, status)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_youtube_verification_user_id ON youtube_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_verification_status ON youtube_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_youtube_verification_created_at ON youtube_verification_requests(created_at);

-- Комментарии к таблице
COMMENT ON TABLE youtube_verification_requests IS 'Заявки на проверку YouTube подписок';
COMMENT ON COLUMN youtube_verification_requests.user_id IS 'ID пользователя из таблицы users';
COMMENT ON COLUMN youtube_verification_requests.telegram_id IS 'Telegram ID пользователя';
COMMENT ON COLUMN youtube_verification_requests.status IS 'Статус заявки: pending, screenshot_received, approved, rejected';
COMMENT ON COLUMN youtube_verification_requests.screenshot_url IS 'URL скриншота подписки';
COMMENT ON COLUMN youtube_verification_requests.approved_by IS 'Telegram ID модератора, который одобрил заявку';
COMMENT ON COLUMN youtube_verification_requests.rejected_by IS 'Telegram ID модератора, который отклонил заявку'; 