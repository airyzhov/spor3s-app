// Скрипт для исправления проблем с ботом
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

console.log('🔧 ИСПРАВЛЕНИЕ ПРОБЛЕМ С БОТОМ');
console.log('=' .repeat(60));

async function fixBotIssues() {
  console.log('1. Проверка и исправление Supabase подключения');
  console.log('-'.repeat(50));
  
  try {
    // Создаем клиент с правильными настройками
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Тест подключения
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price')
      .limit(1);
    
    if (error) {
      console.log('❌ Ошибка Supabase:', error.message);
      console.log('💡 Возможные причины:');
      console.log('   - Неправильный URL или ключ');
      console.log('   - Проблемы с сетью');
      console.log('   - RLS политики блокируют доступ');
    } else {
      console.log('✅ Supabase подключен');
      console.log('📦 Тестовый продукт:', products[0]?.name || 'Нет данных');
    }
    
  } catch (error) {
    console.log('❌ Критическая ошибка Supabase:', error.message);
  }

  console.log('');
  
  console.log('2. Проверка OpenRouter токена');
  console.log('-'.repeat(50));
  
  const orToken = process.env.OR_TOKEN;
  console.log('🔑 Текущий токен:', orToken ? `${orToken.substring(0, 20)}...` : 'ОТСУТСТВУЕТ');
  
  if (!orToken) {
    console.log('❌ OR_TOKEN отсутствует в env.local');
    console.log('💡 Добавьте в env.local:');
    console.log('   OR_TOKEN=ваш_токен_здесь');
    return;
  }
  
  // Тест токена
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Тест' }
      ],
      max_tokens: 5
    }, {
      headers: {
        'Authorization': `Bearer ${orToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ OpenRouter токен работает');
    console.log('📝 Тестовый ответ:', response.data.choices[0]?.message?.content || 'Пустой');
    
  } catch (error) {
    console.log('❌ Ошибка OpenRouter:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Токен недействителен или истек');
      console.log('🔧 Решение:');
      console.log('   1. Зайдите на https://openrouter.ai/');
      console.log('   2. Перейдите в API Keys');
      console.log('   3. Создайте новый токен');
      console.log('   4. Обновите OR_TOKEN в env.local');
    }
  }

  console.log('');
  
  console.log('3. Проверка переменных окружения');
  console.log('-'.repeat(50));
  
  const requiredVars = {
    'NEXT_PUBLIC_BASE_URL': process.env.NEXT_PUBLIC_BASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'OR_TOKEN': process.env.OR_TOKEN,
    'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN
  };
  
  let missingVars = [];
  
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      console.log(`❌ ${key}: ОТСУТСТВУЕТ`);
      missingVars.push(key);
    } else {
      console.log(`✅ ${key}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('');
    console.log('⚠️ ОТСУТСТВУЮТ ПЕРЕМЕННЫЕ:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('');
    console.log('💡 Добавьте их в env.local');
  }

  console.log('');
  
  console.log('4. Тест полного цикла (как в боте)');
  console.log('-'.repeat(50));
  
  try {
    // Имитируем запрос как в боте
    const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ai`, {
      message: 'Привет, это тест бота',
      source: 'telegram_bot',
      user_id: 'test-user-123',
      context: []
    }, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'spor3s-bot/1.0'
      },
      timeout: 15000
    });
    
    console.log('✅ Полный цикл работает');
    console.log('📊 Статус:', response.status);
    console.log('📝 Ответ:', response.data.response?.substring(0, 100) + '...');
    
  } catch (error) {
    console.log('❌ Ошибка полного цикла:', error.message);
    
    if (error.response) {
      console.log('📊 Статус сервера:', error.response.status);
      console.log('📄 Ответ сервера:', error.response.data);
    }
  }

  console.log('');
  
  console.log('5. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ');
  console.log('-'.repeat(50));
  
  console.log('🔧 Для исправления проблем:');
  console.log('');
  console.log('1. Обновите OpenRouter токен:');
  console.log('   - Зайдите на https://openrouter.ai/');
  console.log('   - API Keys → Create new key');
  console.log('   - Скопируйте токен');
  console.log('   - Обновите OR_TOKEN в env.local');
  console.log('');
  console.log('2. Проверьте Supabase подключение:');
  console.log('   - Убедитесь, что URL правильный');
  console.log('   - Проверьте RLS политики');
  console.log('   - Убедитесь, что ключ действителен');
  console.log('');
  console.log('3. Перезапустите бота:');
  console.log('   - Остановите процесс бота');
  console.log('   - Запустите заново');
  console.log('   - Проверьте логи');
  console.log('');
  console.log('4. Проверьте на VPS:');
  console.log('   - Убедитесь, что сервер запущен');
  console.log('   - Проверьте Nginx конфигурацию');
  console.log('   - Проверьте переменные окружения на сервере');
}

fixBotIssues().catch(console.error);
