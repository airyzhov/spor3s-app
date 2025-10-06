const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

const BASE_URL = 'https://fdaa313e8595.ngrok-free.app';

async function testNgrokAPI() {
  console.log('🔥 БЫСТРЫЙ ТЕСТ NGROK API');
  console.log('==========================');
  
  try {
    // 1. Тест AI API напрямую
    console.log('\n🤖 Тест AI API...');
    const response = await axios.post(`${BASE_URL}/api/ai`, {
      message: 'мухомор на месяц',
      source: 'telegram_bot',
      user_id: 'test-user-123',
      telegram_id: '123456789'
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ УСПЕХ! AI API работает');
    console.log('🤖 Ответ:', response.data.response.substring(0, 150) + '...');
    
    // Проверяем наличие тегов корзины
    const hasCartTag = /\[add_to_cart:[\w-]+\]/.test(response.data.response);
    console.log('🛒 Теги корзины:', hasCartTag ? '✅ Найдены' : '❌ Отсутствуют');
    
    // 2. Тест init-user API
    console.log('\n👤 Тест init-user API...');
    const initResponse = await axios.post(`${BASE_URL}/api/init-user`, {
      telegram_id: '123456789',
      source: 'telegram_bot'
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ УСПЕХ! Init-user API работает');
    console.log('👤 User ID:', initResponse.data.id);
    console.log('📱 Source:', initResponse.data.source);
    
    // 3. Тест AI Agent Control API
    console.log('\n🎛️ Тест AI Agent Control API...');
    const controlResponse = await axios.post(`${BASE_URL}/api/ai-agent-control`, {
      telegram_id: '123456789',
      action: 'start'
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ УСПЕХ! AI Agent Control API работает');
    console.log('🎛️ Status:', controlResponse.data.message);
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
    console.log('✅ 3-канальная система готова к работе');
    
  } catch (error) {
    console.log('❌ ОШИБКА:', error.message);
    if (error.response) {
      console.log('📊 Статус:', error.response.status);
      console.log('📄 Данные:', error.response.data);
    }
  }
}

testNgrokAPI();
