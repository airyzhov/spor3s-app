// Скрипт для проверки всех ИИ чатов
const axios = require('axios');

const API_URL = 'https://ai.spor3s.ru';
const TEST_USER_ID = 'test-user-12345';

// Тестовые сценарии
const tests = [
  {
    name: '1. Mini App Chat',
    source: 'mini_app',
    message: 'Привет! Расскажи о ежовике',
  },
  {
    name: '2. Telegram Bot (@spor3s_bot)',
    source: 'telegram_bot',
    message: 'Хочу купить мухомор для сна',
  },
  {
    name: '3. Spor3z Agent',
    source: 'spor3z',
    message: 'Какие у вас есть продукты?',
  },
  {
    name: '4. RAG Test - Инструкции',
    source: 'mini_app',
    message: 'Как принимать ежовик?',
  },
  {
    name: '5. RAG Test - Продукты',
    source: 'mini_app',
    message: 'Сколько стоит кордицепс?',
  }
];

async function testAIChat(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ТЕСТ: ${test.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📝 Сообщение: "${test.message}"`);
  console.log(`📍 Источник: ${test.source}`);
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${API_URL}/api/ai`, {
      message: test.message,
      source: test.source,
      user_id: TEST_USER_ID,
      context: []
    }, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'spor3s-test/1.0'
      },
      timeout: 30000
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n✅ УСПЕШНО`);
    console.log(`⏱️  Время ответа: ${duration}ms`);
    console.log(`📊 Статус: ${response.status}`);
    console.log(`\n💬 ОТВЕТ ИИ:`);
    console.log(`${'-'.repeat(60)}`);
    console.log(response.data.response || response.data.reply || 'Пустой ответ');
    console.log(`${'-'.repeat(60)}`);
    
    // Проверяем наличие тегов add_to_cart
    const hasTags = /\[add_to_cart:[\w-]+\]/.test(response.data.response || '');
    if (hasTags) {
      console.log(`\n🛒 Обнаружены теги add_to_cart`);
      const matches = (response.data.response || '').match(/\[add_to_cart:([\w-]+)\]/g);
      console.log(`   Теги: ${matches.join(', ')}`);
    }
    
    return {
      success: true,
      duration,
      response: response.data.response || response.data.reply
    };
    
  } catch (error) {
    console.log(`\n❌ ОШИБКА`);
    
    if (error.response) {
      console.log(`📊 Статус: ${error.response.status}`);
      console.log(`📄 Ответ сервера:`, error.response.data);
    } else if (error.request) {
      console.log(`🔌 Сервер не отвечает`);
      console.log(`   URL: ${API_URL}/api/ai`);
      console.log(`   Проверьте, что сервер запущен и доступен`);
    } else {
      console.log(`💥 Ошибка:`, error.message);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function checkSupabaseConnection() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 ПРОВЕРКА ПОДКЛЮЧЕНИЯ К SUPABASE`);
  console.log(`${'='.repeat(60)}`);
  
  const { createClient } = require('@supabase/supabase-js');
  require('dotenv').config({ path: 'env.local' });
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log(`📍 URL: ${SUPABASE_URL}`);
  console.log(`🔑 Key: ${SUPABASE_KEY ? '✅ Присутствует' : '❌ Отсутствует'}`);
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Проверяем доступ к таблице products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .limit(3);
    
    if (productsError) {
      console.log(`\n❌ Ошибка доступа к products:`, productsError.message);
    } else {
      console.log(`\n✅ Продукты (${products.length}):`, products.map(p => `${p.name} - ${p.price}₽`).join(', '));
    }
    
    // Проверяем доступ к таблице instructions
    const { data: instructions, error: instructionsError } = await supabase
      .from('instructions')
      .select('id, title')
      .limit(3);
    
    if (instructionsError) {
      console.log(`\n❌ Ошибка доступа к instructions:`, instructionsError.message);
    } else {
      console.log(`✅ Инструкции (${instructions.length}):`, instructions.map(i => i.title).join(', '));
    }
    
    // Проверяем доступ к таблице ai_prompts
    const { data: prompts, error: promptsError } = await supabase
      .from('ai_prompts')
      .select('name, is_active')
      .limit(3);
    
    if (promptsError) {
      console.log(`\n⚠️  Таблица ai_prompts не найдена или недоступна:`, promptsError.message);
      console.log(`   Это означает, что используется fallback промпт`);
    } else {
      console.log(`✅ AI Промпты (${prompts.length}):`, prompts.map(p => `${p.name} (${p.is_active ? 'активен' : 'неактивен'})`).join(', '));
    }
    
    return true;
  } catch (error) {
    console.log(`\n❌ Критическая ошибка Supabase:`, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log(`\n${'█'.repeat(60)}`);
  console.log(`🚀 ПРОВЕРКА ВСЕХ ИИ ЧАТОВ`);
  console.log(`   Проект: ai.spor3s.ru`);
  console.log(`   Тестов: ${tests.length}`);
  console.log(`${'█'.repeat(60)}`);
  
  // Сначала проверяем Supabase
  await checkSupabaseConnection();
  
  // Затем тестируем каждый чат
  const results = [];
  for (const test of tests) {
    const result = await testAIChat(test);
    results.push({ ...test, ...result });
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Итоговый отчет
  console.log(`\n\n${'█'.repeat(60)}`);
  console.log(`📊 ИТОГОВЫЙ ОТЧЕТ`);
  console.log(`${'█'.repeat(60)}`);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Успешных тестов: ${successful}/${tests.length}`);
  console.log(`❌ Провалившихся: ${failed}/${tests.length}`);
  
  if (successful > 0) {
    console.log(`\n⏱️  Среднее время ответа: ${Math.round(results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / successful)}ms`);
  }
  
  if (failed > 0) {
    console.log(`\n❌ Провалившиеся тесты:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  console.log(`\n${'█'.repeat(60)}`);
  
  // Выводим рекомендации
  if (failed > 0) {
    console.log(`\n💡 РЕКОМЕНДАЦИИ:`);
    console.log(`   1. Проверьте, что сервер запущен: https://ai.spor3s.ru`);
    console.log(`   2. Проверьте Nginx конфигурацию для ai.spor3s.ru`);
    console.log(`   3. Проверьте логи сервера на VPS`);
    console.log(`   4. Убедитесь, что env.local содержит правильные ключи`);
  } else {
    console.log(`\n🎉 ВСЕ СИСТЕМЫ РАБОТАЮТ КОРРЕКТНО!`);
  }
}

// Запускаем тесты
runAllTests().catch(error => {
  console.error('\n💥 Критическая ошибка:', error);
  process.exit(1);
});

