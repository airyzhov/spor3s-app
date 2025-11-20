// Скрипт для проверки работы всех 3 каналов и последних сообщений от spor3z
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Используем SERVICE_ROLE_KEY для чтения всех сообщений
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Используем правильный production URL
const API_URL = 'https://ai.spor3s.ru';

console.log('🔧 Конфигурация:');
console.log('   SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
console.log('   SUPABASE_KEY:', SUPABASE_KEY ? '✅ (' + SUPABASE_KEY.substring(0, 20) + '...)' : '❌');
console.log('   API_URL:', API_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Функция для получения последних сообщений от spor3z
async function getLastSpor3zMessages(limit = 20) {
  try {
    console.log('\n📋 ПОЛУЧЕНИЕ ПОСЛЕДНИХ СООБЩЕНИЙ ОТ SPOR3Z');
    console.log('='.repeat(60));
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('source', 'spor3z')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Ошибка получения сообщений:', error);
      return [];
    }

    console.log(`✅ Найдено сообщений: ${messages.length}\n`);

    if (messages.length === 0) {
      console.log('⚠️ Сообщений от spor3z не найдено');
      return [];
    }

    // Группируем по пользователям
    const userMessages = {};
    messages.forEach(msg => {
      if (!userMessages[msg.user_id]) {
        userMessages[msg.user_id] = [];
      }
      userMessages[msg.user_id].push(msg);
    });

    console.log(`👥 Уникальных пользователей: ${Object.keys(userMessages).length}\n`);

    // Выводим последние сообщения
    messages.slice(0, 10).forEach((msg, index) => {
      const date = new Date(msg.created_at).toLocaleString('ru-RU');
      const role = msg.role === 'user' ? '👤 Пользователь' : '🤖 AI';
      const content = msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '');
      
      console.log(`${index + 1}. [${date}] ${role}:`);
      console.log(`   ${content}`);
      console.log(`   User ID: ${msg.user_id}`);
      console.log('');
    });

    return messages;
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return [];
  }
}

// Функция для тестирования канала
async function testChannel(name, source, message, expectedContains = []) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ТЕСТ: ${name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📝 Сообщение: "${message}"`);
  console.log(`📍 Источник: ${source}`);
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${API_URL}/api/ai`, {
      message: message,
      source: source,
      context: [],
      telegram_id: '79785297149' // Тестовый ID
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
    
    const aiResponse = response.data.response || response.data.reply || '';
    
    console.log(`\n✅ УСПЕШНО`);
    console.log(`⏱️  Время ответа: ${duration}ms`);
    console.log(`📊 Статус: ${response.status}`);
    console.log(`\n💬 ОТВЕТ ИИ:`);
    console.log(`${'-'.repeat(60)}`);
    console.log(aiResponse);
    console.log(`${'-'.repeat(60)}`);
    
    // Проверяем ожидаемые элементы
    const checks = [];
    expectedContains.forEach(expected => {
      const found = aiResponse.toLowerCase().includes(expected.toLowerCase());
      checks.push({ expected, found });
      console.log(`${found ? '✅' : '❌'} Проверка "${expected}": ${found ? 'найдено' : 'не найдено'}`);
    });
    
    // Проверяем специфичные для канала элементы
    if (source === 'spor3z') {
      const hasSpor3z = /spor3z/i.test(aiResponse);
      const hasTags = /\[add_to_cart:[\w-]+\]/.test(aiResponse);
      console.log(`${hasSpor3z ? '✅' : '❌'} Упоминание "spor3z": ${hasSpor3z ? 'есть' : 'нет'}`);
      console.log(`${hasTags ? '✅' : '⚠️'} Теги [add_to_cart]: ${hasTags ? 'есть' : 'нет (нормально для spor3z)'}`);
    } else if (source === 'telegram_bot') {
      const hasTags = /\[add_to_cart:[\w-]+\]/.test(aiResponse);
      const hasLink = /t\.me\/spor3s_bot/.test(aiResponse);
      console.log(`${!hasTags ? '✅' : '❌'} Теги удалены: ${!hasTags ? 'да' : 'нет'}`);
      console.log(`${hasLink ? '✅' : '❌'} Ссылка на Mini App: ${hasLink ? 'есть' : 'нет'}`);
    } else if (source === 'mini_app') {
      const hasTags = /\[add_to_cart:[\w-]+\]/.test(aiResponse);
      const hasNotification = /товар.*добавлен.*корзин/i.test(aiResponse);
      console.log(`${hasTags ? '✅' : '❌'} Теги [add_to_cart]: ${hasTags ? 'есть' : 'нет'}`);
      console.log(`${!hasNotification ? '✅' : '⚠️'} Нет строки "добавлен в корзину": ${!hasNotification ? 'да' : 'нет'}`);
    }
    
    return {
      success: true,
      duration,
      response: aiResponse,
      checks
    };
    
  } catch (error) {
    console.log(`\n❌ ОШИБКА`);
    console.log(`Сообщение: ${error.message}`);
    if (error.response) {
      console.log(`Статус: ${error.response.status}`);
      console.log(`Данные: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

// Основная функция
async function main() {
  console.log('🚀 ТЕСТИРОВАНИЕ ВСЕХ 3 КАНАЛОВ И ПРОВЕРКА SPOR3Z');
  console.log('='.repeat(60));
  
  // 1. Проверяем последние сообщения от spor3z
  const spor3zMessages = await getLastSpor3zMessages(20);
  
  // 2. Тестируем все каналы
  const tests = [
    {
      name: '1. @Spor3z - Приветствие',
      source: 'spor3z',
      message: 'привет',
      expectedContains: ['spor3z', 'привет']
    },
    {
      name: '2. @Spor3z - Вопрос про ежовик',
      source: 'spor3z',
      message: 'есть ежовик?',
      expectedContains: ['ежовик']
    },
    {
      name: '3. @Spor3s_bot - Запрос товара',
      source: 'telegram_bot',
      message: 'хочу купить мухомор',
      expectedContains: ['мухомор']
    },
    {
      name: '4. Mini App - Вопрос про продукт',
      source: 'mini_app',
      message: 'расскажи о кордицепсе',
      expectedContains: ['кордицепс']
    },
    {
      name: '5. @Spor3z - Запрос с формой',
      source: 'spor3z',
      message: 'ежовик порошок на месяц',
      expectedContains: ['ежовик', 'порошок']
    }
  ];
  
  const results = [];
  for (const test of tests) {
    const result = await testChannel(test.name, test.source, test.message, test.expectedContains);
    results.push({ ...test, result });
    
    // Небольшая пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Итоговая сводка
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 ИТОГОВАЯ СВОДКА');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.result.success).length;
  const failed = results.filter(r => !r.result.success).length;
  
  console.log(`✅ Успешных тестов: ${successful}/${results.length}`);
  console.log(`❌ Неудачных тестов: ${failed}/${results.length}`);
  console.log(`📋 Сообщений от spor3z в БД: ${spor3zMessages.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Неудачные тесты:');
    results.filter(r => !r.result.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.result.error}`);
    });
  }
  
  console.log('\n✅ Тестирование завершено!');
}

main().catch(console.error);

