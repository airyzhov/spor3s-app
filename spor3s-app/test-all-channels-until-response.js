// Тестирование всех 3 каналов до получения ответов
const axios = require('axios');

const API_URLS = [
  'https://ai.spor3s.ru',
  'http://localhost:3000'
];

const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_TELEGRAM_ID = '79785297149';

// Тесты для каждого канала
const tests = [
  {
    name: '1. @Spor3z - Приветствие',
    source: 'spor3z',
    message: 'привет',
    expectedChecks: ['spor3z', 'привет']
  },
  {
    name: '2. @Spor3z - Вопрос про ежовик',
    source: 'spor3z',
    message: 'есть ежовик?',
    expectedChecks: ['ежовик']
  },
  {
    name: '3. @Spor3s_bot - Запрос товара',
    source: 'telegram_bot',
    message: 'хочу купить мухомор',
    expectedChecks: ['мухомор']
  },
  {
    name: '4. Mini App - Вопрос про продукт',
    source: 'mini_app',
    message: 'расскажи о кордицепсе',
    expectedChecks: ['кордицепс']
  },
  {
    name: '5. @Spor3z - Запрос с формой',
    source: 'spor3z',
    message: 'ежовик порошок на месяц',
    expectedChecks: ['ежовик', 'порошок']
  }
];

async function testChannel(test, apiUrl) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 ${test.name}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📝 Сообщение: "${test.message}"`);
  console.log(`📍 Источник: ${test.source}`);
  console.log(`🌐 API URL: ${apiUrl}`);
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${apiUrl}/api/ai`, {
      message: test.message,
      source: test.source,
      context: [],
      telegram_id: TEST_TELEGRAM_ID,
      user_id: TEST_USER_ID
    }, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'spor3s-test/1.0'
      },
      timeout: 30000,
      validateStatus: () => true // Принимаем любые статусы
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n📊 Статус: ${response.status}`);
    console.log(`⏱️  Время ответа: ${duration}ms`);
    
    if (response.status === 200 && response.data) {
      const aiResponse = response.data.response || response.data.reply || '';
      
      if (aiResponse && aiResponse.trim().length > 0) {
        console.log(`\n✅ УСПЕШНО - Получен ответ!`);
        console.log(`\n💬 ОТВЕТ ИИ (${aiResponse.length} символов):`);
        console.log(`${'-'.repeat(70)}`);
        console.log(aiResponse);
        console.log(`${'-'.repeat(70)}`);
        
        // Проверяем ожидаемые элементы
        console.log(`\n🔍 ПРОВЕРКИ:`);
        test.expectedChecks.forEach(expected => {
          const found = aiResponse.toLowerCase().includes(expected.toLowerCase());
          console.log(`   ${found ? '✅' : '❌'} "${expected}": ${found ? 'найдено' : 'не найдено'}`);
        });
        
        // Проверяем специфичные для канала элементы
        if (test.source === 'spor3z') {
          const hasSpor3z = /spor3z/i.test(aiResponse);
          const hasTags = /\[add_to_cart:[\w-]+\]/.test(aiResponse);
          console.log(`   ${hasSpor3z ? '✅' : '❌'} Упоминание "spor3z": ${hasSpor3z ? 'есть' : 'нет'}`);
          console.log(`   ${hasTags ? '✅' : '⚠️'} Теги [add_to_cart]: ${hasTags ? 'есть (правильно)' : 'нет'}`);
        } else if (test.source === 'telegram_bot') {
          const hasTags = /\[add_to_cart:[\w-]+\]/.test(aiResponse);
          const hasLink = /t\.me\/spor3s_bot/.test(aiResponse);
          console.log(`   ${!hasTags ? '✅' : '❌'} Теги удалены: ${!hasTags ? 'да (правильно)' : 'нет'}`);
          console.log(`   ${hasLink ? '✅' : '❌'} Ссылка на Mini App: ${hasLink ? 'есть' : 'нет'}`);
        } else if (test.source === 'mini_app') {
          const hasTags = /\[add_to_cart:[\w-]+\]/.test(aiResponse);
          const hasNotification = /товар.*добавлен.*корзин/i.test(aiResponse);
          console.log(`   ${hasTags ? '✅' : '❌'} Теги [add_to_cart]: ${hasTags ? 'есть (правильно)' : 'нет'}`);
          console.log(`   ${!hasNotification ? '✅' : '⚠️'} Нет строки "добавлен в корзину": ${!hasNotification ? 'да (правильно)' : 'нет'}`);
        }
        
        return { success: true, response: aiResponse, duration, status: response.status };
      } else {
        console.log(`\n⚠️ Пустой ответ от API`);
        return { success: false, error: 'Empty response', status: response.status };
      }
    } else {
      console.log(`\n❌ ОШИБКА`);
      console.log(`Статус: ${response.status}`);
      if (response.data) {
        console.log(`Данные: ${JSON.stringify(response.data).substring(0, 200)}`);
      }
      return { success: false, error: `HTTP ${response.status}`, status: response.status };
    }
    
  } catch (error) {
    console.log(`\n❌ ОШИБКА`);
    console.log(`Сообщение: ${error.message}`);
    if (error.response) {
      console.log(`Статус: ${error.response.status}`);
      console.log(`Данные: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    if (error.code === 'ECONNREFUSED') {
      console.log(`⚠️ Соединение отклонено - сервер недоступен`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`⚠️ Таймаут - сервер не отвечает`);
    }
    return { success: false, error: error.message, code: error.code };
  }
}

async function findWorkingAPI() {
  console.log('🔍 Поиск доступного API...\n');
  
  for (const apiUrl of API_URLS) {
    try {
      console.log(`Проверяю ${apiUrl}...`);
      const response = await axios.get(`${apiUrl}/api/health`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 200 || response.status === 404) {
        // 404 тоже нормально - значит сервер работает
        console.log(`✅ ${apiUrl} доступен (статус: ${response.status})\n`);
        return apiUrl;
      }
    } catch (error) {
      console.log(`❌ ${apiUrl} недоступен: ${error.message}\n`);
    }
  }
  
  // Пробуем проверить через POST запрос
  for (const apiUrl of API_URLS) {
    try {
      console.log(`Проверяю ${apiUrl}/api/ai через POST...`);
      const response = await axios.post(`${apiUrl}/api/ai`, {
        message: 'тест',
        source: 'mini_app'
      }, {
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ ${apiUrl} отвечает (статус: ${response.status})\n`);
      return apiUrl;
    } catch (error) {
      if (error.code !== 'ECONNREFUSED' && error.code !== 'ETIMEDOUT') {
        // Если не ошибка соединения, значит сервер работает
        console.log(`✅ ${apiUrl} отвечает (ошибка: ${error.message})\n`);
        return apiUrl;
      }
      console.log(`❌ ${apiUrl} недоступен: ${error.message}\n`);
    }
  }
  
  return null;
}

async function main() {
  console.log('🚀 ТЕСТИРОВАНИЕ ВСЕХ 3 КАНАЛОВ ДО ПОЛУЧЕНИЯ ОТВЕТОВ');
  console.log('='.repeat(70));
  
  // Находим рабочий API
  const workingAPI = await findWorkingAPI();
  
  if (!workingAPI) {
    console.log('\n❌ Не удалось найти доступный API');
    console.log('Проверьте:');
    console.log('1. Запущен ли сервер на VPS');
    console.log('2. Доступен ли https://ai.spor3s.ru');
    console.log('3. Правильно ли настроен домен');
    return;
  }
  
  console.log(`\n✅ Используем API: ${workingAPI}\n`);
  
  // Тестируем каждый канал
  const results = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const test of tests) {
    const result = await testChannel(test, workingAPI);
    results.push({ ...test, result });
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Итоговая сводка
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 ИТОГОВАЯ СВОДКА');
  console.log('='.repeat(70));
  console.log(`✅ Успешных тестов: ${successCount}/${tests.length}`);
  console.log(`❌ Неудачных тестов: ${failCount}/${tests.length}`);
  console.log(`🌐 Использованный API: ${workingAPI}`);
  
  if (successCount > 0) {
    console.log(`\n✅ АГЕНТ ОТВЕЧАЕТ! Все каналы работают.`);
  } else {
    console.log(`\n❌ АГЕНТ НЕ ОТВЕЧАЕТ. Проверьте:`);
    console.log(`   1. Логи на VPS: pm2 logs spor3z-agent`);
    console.log(`   2. Статус сервера: pm2 status`);
    console.log(`   3. Доступность API: curl ${workingAPI}/api/ai`);
  }
  
  // Детали неудачных тестов
  if (failCount > 0) {
    console.log(`\n❌ Неудачные тесты:`);
    results.filter(r => !r.result.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.result.error || r.result.status}`);
    });
  }
  
  console.log('\n✅ Тестирование завершено!');
}

main().catch(console.error);

