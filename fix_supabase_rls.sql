  -- =====================================================
  -- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ SPOR3S APP
  -- Выполни этот SQL в Supabase SQL Editor
  -- =====================================================

  -- 1. Разрешаем чтение из таблицы users для anon
  DROP POLICY IF EXISTS "Allow anon read users" ON users;
  CREATE POLICY "Allow anon read users" ON users
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Allow anon insert users" ON users;
  CREATE POLICY "Allow anon insert users" ON users
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow anon update users" ON users;
  CREATE POLICY "Allow anon update users" ON users
    FOR UPDATE USING (true);

  -- 2. Разрешаем работу с messages для anon
  DROP POLICY IF EXISTS "Allow anon access messages" ON messages;
  CREATE POLICY "Allow anon access messages" ON messages
    FOR ALL USING (true);

  -- 3. Разрешаем чтение products для всех (anon)
  DROP POLICY IF EXISTS "Allow anon read products" ON products;
  CREATE POLICY "Allow anon read products" ON products
    FOR SELECT USING (true);

  -- 4. Разрешаем чтение ai_prompts для anon
  DROP POLICY IF EXISTS "Allow anon read ai_prompts" ON ai_prompts;
  CREATE POLICY "Allow anon read ai_prompts" ON ai_prompts
    FOR SELECT USING (true);

  -- 5. Разрешаем чтение instructions для anon
  DROP POLICY IF EXISTS "Allow anon read instructions" ON instructions;
  CREATE POLICY "Allow anon read instructions" ON instructions
    FOR SELECT USING (true);

  -- 6. Разрешаем работу с orders для anon
  DROP POLICY IF EXISTS "Allow anon access orders" ON orders;
  CREATE POLICY "Allow anon access orders" ON orders
    FOR ALL USING (true);

  -- 7. Разрешаем работу с coin_transactions для anon
  DROP POLICY IF EXISTS "Allow anon access coin_transactions" ON coin_transactions;
  CREATE POLICY "Allow anon access coin_transactions" ON coin_transactions
    FOR ALL USING (true);

  -- 8. Разрешаем работу с tg_link_codes для anon
  DROP POLICY IF EXISTS "Allow anon access tg_link_codes" ON tg_link_codes;
  CREATE POLICY "Allow anon access tg_link_codes" ON tg_link_codes
    FOR ALL USING (true);

  -- 9. Разрешаем чтение level_config для anon
  DROP POLICY IF EXISTS "Allow anon read level_config" ON level_config;
  CREATE POLICY "Allow anon read level_config" ON level_config
    FOR SELECT USING (true);

  -- 10. Разрешаем работу с user_levels для anon
  DROP POLICY IF EXISTS "Allow anon access user_levels" ON user_levels;
  CREATE POLICY "Allow anon access user_levels" ON user_levels
    FOR ALL USING (true);

  -- 11. Разрешаем работу с surveys для anon
  DROP POLICY IF EXISTS "Allow anon access surveys" ON surveys;
  CREATE POLICY "Allow anon access surveys" ON surveys
    FOR ALL USING (true);

  -- 12. Разрешаем работу с daily_checkins для anon
  DROP POLICY IF EXISTS "Allow anon access daily_checkins" ON daily_checkins;
  CREATE POLICY "Allow anon access daily_checkins" ON daily_checkins
    FOR ALL USING (true);

  -- 13. Разрешаем работу с reminders для anon
  DROP POLICY IF EXISTS "Allow anon access reminders" ON reminders;
  CREATE POLICY "Allow anon access reminders" ON reminders
    FOR ALL USING (true);

  -- Проверка: показываем все политики
  SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
  FROM pg_policies 
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;

  -- =====================================================
  -- ГОТОВО! Теперь anon ключ может работать со всеми таблицами
  -- =====================================================

