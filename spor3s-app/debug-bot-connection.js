// Скрипт для диагностики подключения бота к AI API
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

console.log('🔍 ДИАГНОСТИКА ПОДКЛЮЧЕНИЯ БОТА К AI API');
console.log('=' .repeat(60));

async function testBotConnection() {
  const API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ai.spor3s.ru';
  
  console.log('📍 API URL:', API_URL);
  console.log('');

  // Тест 1: Простое подключение
  console.log('1. Тест простого подключения');
  console.log('-'.repeat(40));
  
  try {
    const response = await axios.post(`${API_URL}/api/ai`, {
      message: 'тест подключения',
      source: 'telegram_bot',
      user_id: 'test-user-123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'spor3s-bot/1.0'
      },
      timeout: 10000
    });
    
    console.log('✅ Подключение успешно');
    console.log('📊 Статус:', response.status);
    console.log('📝 Ответ:', response.data.response?.substring(0, 100) + '...');
    
  } catch (error) {
    console.log('❌ Ошибка подключения');
    console.log('💥 Детали:', error.message);
    
    if (error.response) {
      console.log('📊 Статус сервера:', error.response.status);
      console.log('📄 Ответ сервера:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔌 Проблема: Сервер недоступен');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🌐 Проблема: DNS не разрешается');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏰ Проблема: Таймаут подключения');
    }
  }

  console.log('');
  
  // Тест 2: Проверка переменных окружения
  console.log('2. Проверка переменных окружения');
  console.log('-'.repeat(40));
  
  const envVars = {
    'NEXT_PUBLIC_BASE_URL': process.env.NEXT_PUBLIC_BASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Присутствует' : '❌ Отсутствует',
    'OR_TOKEN': process.env.OR_TOKEN ? '✅ Присутствует' : '❌ Отсутствует',
    'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN ? '✅ Присутствует' : '❌ Отсутствует'
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  console.log('');
  
  // Тест 3: Проверка Supabase
  console.log('3. Проверка Supabase подключения');
  console.log('-'.repeat(40));
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price')
      .limit(1);
    
    if (error) {
      console.log('❌ Ошибка Supabase:', error.message);
    } else {
      console.log('✅ Supabase подключен');
      console.log('📦 Продукт:', products[0]?.name || 'Нет данных');
    }
    
  } catch (error) {
    console.log('❌ Ошибка Supabase:', error.message);
  }

  console.log('');
  
  // Тест 4: Проверка OpenRouter
  console.log('4. Проверка OpenRouter токена');
  console.log('-'.repeat(40));
  
  const orToken = process.env.OR_TOKEN;
  if (orToken) {
    console.log('✅ OR_TOKEN присутствует');
    console.log('🔑 Длина токена:', orToken.length);
    console.log('🔑 Начинается с:', orToken.substring(0, 10) + '...');
    
    // Тест запроса к OpenRouter
    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Привет' }
        ],
        max_tokens: 10
      }, {
        headers: {
          'Authorization': `Bearer ${orToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ OpenRouter отвечает');
      console.log('📝 Ответ:', response.data.choices[0]?.message?.content || 'Пустой');
      
    } catch (error) {
      console.log('❌ Ошибка OpenRouter:', error.response?.data || error.message);
    }
  } else {
    console.log('❌ OR_TOKEN отсутствует');
  }

  console.log('');
  
  // Рекомендации
  console.log('💡 РЕКОМЕНДАЦИИ');
  console.log('-'.repeat(40));
  
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    console.log('⚠️ NEXT_PUBLIC_BASE_URL не установлен');
  }
  
  if (!process.env.OR_TOKEN) {
    console.log('⚠️ OR_TOKEN не установлен');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log('⚠️ NEXT_PUBLIC_SUPABASE_URL не установлен');
  }
  
  console.log('');
  console.log('🔧 Для исправления:');
  console.log('1. Проверьте файл env.local');
  console.log('2. Убедитесь, что сервер запущен на VPS');
  console.log('3. Проверьте Nginx конфигурацию');
  console.log('4. Проверьте логи бота: bot.log, bot.err');
}

testBotConnection().catch(console.error);
