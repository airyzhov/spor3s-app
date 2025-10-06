-- Исправление таблицы coin_transactions
-- Добавляем недостающую колонку order_id

-- Проверяем существование колонки order_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'coin_transactions' 
        AND column_name = 'order_id'
    ) THEN
        -- Добавляем колонку order_id
        ALTER TABLE coin_transactions 
        ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Колонка order_id добавлена в таблицу coin_transactions';
    ELSE
        RAISE NOTICE 'Колонка order_id уже существует в таблице coin_transactions';
    END IF;
END $$;

-- Проверяем структуру таблицы
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'coin_transactions' 
ORDER BY ordinal_position;

-- Обновляем RLS политики для coin_transactions
DROP POLICY IF EXISTS "Users can read own transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON coin_transactions;

CREATE POLICY "Users can read own transactions" ON coin_transactions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert transactions" ON coin_transactions
    FOR INSERT WITH CHECK (true);

-- Создаем индекс для производительности
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_order 
ON coin_transactions(user_id, order_id);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_type 
ON coin_transactions(type);

-- Проверяем что все работает
SELECT 
    'coin_transactions' as table_name,
    COUNT(*) as total_records
FROM coin_transactions; 