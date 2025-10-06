-- Отключение RLS для таблицы products
-- Выполните этот SQL в Supabase Dashboard -> SQL Editor

-- Отключаем RLS для таблицы products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Или создаем политику для полного доступа
-- CREATE POLICY "Enable all access for products" ON products
-- FOR ALL USING (true) WITH CHECK (true);

-- Проверяем статус RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'products';
