
// Тест обновленных токенов
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

async function testTokens() {
  console.log('🧪 ТЕСТ ОБНОВЛЕННЫХ ТОКЕНОВ');
  console.log('=' .repeat(50));
  
  // Тест 1: AI API
  console.log('1. Тест AI API...');
  try {
    const response = await axios.post('https://ai.spor3s.ru/api/ai', {
      message: 'тест токенов',
      source: 'test'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('✅ AI API работает:', response.status);
    console.log('📝 Ответ:', response.data.response?.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ AI API ошибка:', error.message);
  }
  
  // Тест 2: Telegram Bot
  console.log('\n2. Тест Telegram Bot...');
  try {
    const response = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
    console.log('✅ Telegram Bot активен:', response.data.result.username);
  } catch (error) {
    console.log('❌ Telegram Bot ошибка:', error.message);
  }
  
  // Тест 3: Supabase
  console.log('\n3. Тест Supabase...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.log('❌ Supabase ошибка:', error.message);
    } else {
      console.log('✅ Supabase подключен:', data[0]?.name || 'Нет данных');
    }
  } catch (error) {
    console.log('❌ Supabase ошибка:', error.message);
  }
  
  console.log('\n🎉 Тест завершен!');
}

testTokens().catch(console.error);
