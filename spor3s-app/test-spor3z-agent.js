// Тестирование работы агента для аккаунта @Spor3z
const axios = require('axios');

const API_URL = 'https://ai.spor3s.ru';
const TEST_TELEGRAM_ID = '79785297149';
const TEST_USER_ID = 'test-spor3z-' + Date.now();

// Тесты для проверки работы spor3z агента
const spor3zTests = [
  {
    name: 'Приветствие - должен представиться как spor3z',
    message: 'привет',
    expectedInResponse: ['spor3z'],
    shouldNotContain: ['консультант СПОРС', 'консультант по грибным']
  },
  {
    name: 'Вопрос о продукте - должен упомянуть spor3z',
    message: 'есть ежовик?',
    expectedInResponse: ['ежовик', 'spor3z'],
    shouldNotContain: []
  },
  {
    name: 'Запрос товара с формой - должен оставить теги',
    message: 'ежовик порошок на месяц',
    expectedInResponse: ['ежовик', 'порошок'],
    shouldNotContain: [],
    shouldHaveTags: true
  },
  {
    name: 'Вопрос о курсе - может напомнить о продолжении',
    message: 'как дела с курсом?',
    expectedInResponse: ['spor3z'],
    shouldNotContain: [],
    canRemind: true
  },
  {
    name: 'Общий вопрос - должен представиться',
    message: 'кто ты?',
    expectedInResponse: ['spor3z'],
    shouldNotContain: ['консультант СПОРС']
  }
];

async function testSpor3zAgent(test, retryCount = 0) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 ТЕСТ: ${test.name}`);
  if (retryCount > 0) {
    console.log(`   🔄 Попытка ${retryCount + 1}/3`);
  }
  console.log(`${'='.repeat(70)}`);
  console.log(`📝 Сообщение: "${test.message}"`);
  console.log(`📍 Источник: spor3z`);
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${API_URL}/api/ai`, {
      message: test.message,
      source: 'spor3z',
      context: [],
      telegram_id: TEST_TELEGRAM_ID,
      user_id: TEST_USER_ID
    }, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Connection': 'keep-alive'
      },
      timeout: 60000,
      maxRedirects: 5
    });
    
    const duration = Date.now() - startTime;
    
    if (response.status === 200 && response.data) {
      const aiResponse = response.data.response || response.data.reply || '';
      
      if (!aiResponse || aiResponse.trim().length === 0) {
        console.log(`\n❌ ОШИБКА: Пустой ответ от API`);
        return { success: false, error: 'Empty response' };
      }
      
      console.log(`\n✅ УСПЕШНО - Получен ответ (${duration}ms)`);
      console.log(`\n💬 ОТВЕТ АГЕНТА:`);
      console.log(`${'-'.repeat(70)}`);
      console.log(aiResponse);
      console.log(`${'-'.repeat(70)}`);
      
      // Проверки
      const checks = [];
      
      // Проверка обязательных элементов
      test.expectedInResponse.forEach(expected => {
        const found = aiResponse.toLowerCase().includes(expected.toLowerCase());
        checks.push({
          name: `Содержит "${expected}"`,
          passed: found,
          required: true
        });
        console.log(`   ${found ? '✅' : '❌'} Содержит "${expected}": ${found ? 'да' : 'нет'}`);
      });
      
      // Проверка запрещенных элементов
      test.shouldNotContain.forEach(forbidden => {
        const found = aiResponse.toLowerCase().includes(forbidden.toLowerCase());
        checks.push({
          name: `НЕ содержит "${forbidden}"`,
          passed: !found,
          required: true
        });
        console.log(`   ${!found ? '✅' : '❌'} НЕ содержит "${forbidden}": ${!found ? 'да' : 'нет'}`);
      });
      
      // Проверка тегов для запросов с формой
      if (test.shouldHaveTags) {
        const hasTags = /\[add_to_cart:[\w-]+\]/.test(aiResponse);
        checks.push({
          name: 'Содержит теги [add_to_cart]',
          passed: hasTags,
          required: true
        });
        console.log(`   ${hasTags ? '✅' : '❌'} Содержит теги [add_to_cart]: ${hasTags ? 'да' : 'нет'}`);
      }
      
      // КРИТИЧНО: Проверка упоминания spor3z
      const hasSpor3z = /spor3z/i.test(aiResponse);
      checks.push({
        name: 'Упоминает "spor3z"',
        passed: hasSpor3z,
        required: true,
        critical: true
      });
      console.log(`\n   ${hasSpor3z ? '✅' : '❌'} КРИТИЧНО: Упоминает "spor3z": ${hasSpor3z ? 'да' : 'нет'}`);
      
      // Проверка, что НЕ говорит просто "консультант"
      const isJustConsultant = /я\s+консультант/i.test(aiResponse) && !/spor3z/i.test(aiResponse);
      if (isJustConsultant) {
        checks.push({
          name: 'НЕ говорит просто "консультант" без spor3z',
          passed: false,
          required: true,
          critical: true
        });
        console.log(`   ❌ КРИТИЧНО: Говорит просто "консультант" без упоминания spor3z`);
      }
      
      const allPassed = checks.every(c => c.passed);
      const criticalPassed = checks.filter(c => c.critical).every(c => c.passed);
      
      console.log(`\n📊 РЕЗУЛЬТАТ:`);
      console.log(`   ${allPassed ? '✅' : '⚠️'} Все проверки: ${checks.filter(c => c.passed).length}/${checks.length}`);
      console.log(`   ${criticalPassed ? '✅' : '❌'} Критичные проверки: ${criticalPassed ? 'пройдены' : 'не пройдены'}`);
      
      return {
        success: allPassed && criticalPassed,
        response: aiResponse,
        duration,
        checks,
        hasSpor3z
      };
      
    } else {
      console.log(`\n❌ ОШИБКА: Неверный статус или формат ответа`);
      console.log(`   Статус: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    // Retry при ошибках соединения
    if ((error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') && retryCount < 2) {
      console.log(`\n⚠️ Ошибка соединения, повтор через 3 секунды...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return testSpor3zAgent(test, retryCount + 1);
    }
    
    console.log(`\n❌ ОШИБКА`);
    console.log(`   Сообщение: ${error.message}`);
    console.log(`   Код: ${error.code || 'N/A'}`);
    if (error.response) {
      console.log(`   Статус: ${error.response.status}`);
    }
    return { success: false, error: error.message, code: error.code };
  }
}

async function main() {
  console.log('🚀 ТЕСТИРОВАНИЕ АГЕНТА SPOR3Z');
  console.log('='.repeat(70));
  console.log(`🌐 API URL: ${API_URL}`);
  console.log(`📱 Telegram ID: ${TEST_TELEGRAM_ID}`);
  console.log(`\n🎯 ЦЕЛЬ: Проверить, что агент правильно работает для аккаунта @Spor3z`);
  console.log(`   - Представляется как "spor3z"`);
  console.log(`   - Может напоминать о продолжении курса`);
  console.log(`   - Не удаляет теги [add_to_cart]`);
  console.log(`   - Отвечает на все запросы`);
  
  const results = [];
  let successCount = 0;
  let criticalFailures = 0;
  
  for (const test of spor3zTests) {
    const result = await testSpor3zAgent(test);
    results.push({ ...test, result });
    
    if (result.success) {
      successCount++;
    } else if (result.hasSpor3z === false) {
      criticalFailures++;
    }
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Итоговая сводка
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 ИТОГОВАЯ СВОДКА');
  console.log('='.repeat(70));
  console.log(`✅ Успешных тестов: ${successCount}/${spor3zTests.length}`);
  console.log(`❌ Неудачных тестов: ${spor3zTests.length - successCount}/${spor3zTests.length}`);
  console.log(`⚠️ Критичных ошибок (нет упоминания spor3z): ${criticalFailures}`);
  
  // Детали по каждому тесту
  console.log(`\n📋 ДЕТАЛИ ПО ТЕСТАМ:`);
  results.forEach((r, index) => {
    const status = r.result.success ? '✅' : (r.result.hasSpor3z === false ? '❌ КРИТИЧНО' : '⚠️');
    console.log(`   ${status} ${index + 1}. ${r.name}`);
    if (!r.result.success && r.result.hasSpor3z === false) {
      console.log(`      → Агент НЕ упоминает "spor3z" в ответе!`);
    }
  });
  
  // Финальный вердикт
  console.log(`\n${'='.repeat(70)}`);
  if (successCount === spor3zTests.length && criticalFailures === 0) {
    console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Агент spor3z работает корректно.');
  } else if (criticalFailures > 0) {
    console.log('❌ КРИТИЧНЫЕ ОШИБКИ! Агент НЕ упоминает "spor3z" в ответах.');
    console.log('   Требуется исправление кода для автоматического добавления упоминания.');
  } else {
    console.log('⚠️ ЕСТЬ ПРОБЛЕМЫ! Некоторые тесты не прошли.');
  }
  console.log('='.repeat(70));
  
  return {
    total: spor3zTests.length,
    success: successCount,
    failures: spor3zTests.length - successCount,
    criticalFailures
  };
}

main().catch(console.error);

