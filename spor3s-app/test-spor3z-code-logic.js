// Тестирование логики кода для spor3z агента
// Проверяет, что код правильно обрабатывает ответы для spor3z

console.log('🧪 ТЕСТИРОВАНИЕ ЛОГИКИ КОДА ДЛЯ SPOR3Z АГЕНТА');
console.log('='.repeat(70));

// Симулируем логику из route.ts
function testSpor3zResponseProcessing(message, aiResponse, messageSource) {
  let reply = aiResponse;
  
  // КРИТИЧНО: Для spor3z добавляем упоминание "spor3z" если его нет в финальном ответе
  if (messageSource === 'spor3z' && reply && !/spor3z/i.test(reply)) {
    // Если это приветствие - добавляем полное представление
    if (/привет|здравствуй|добрый/i.test(message.toLowerCase())) {
      reply = `Привет! Я spor3z, твой персональный AI-ассистент по грибным добавкам SPOR3S.\n\n${reply}`;
    } else {
      // В остальных случаях добавляем краткое упоминание в начало
      reply = `Я spor3z. ${reply}`;
    }
  }
  
  return reply;
}

// Тесты
const tests = [
  {
    name: 'Приветствие без spor3z - должно добавить',
    message: 'привет',
    aiResponse: 'Привет! Я консультант по грибным добавкам СПОРС.',
    messageSource: 'spor3z',
    expectedContains: ['spor3z', 'персональный AI-ассистент'],
    shouldNotContain: ['консультант СПОРС']
  },
  {
    name: 'Вопрос без spor3z - должно добавить в начало',
    message: 'есть ежовик?',
    aiResponse: 'Да, у нас есть Ежовик гребенчатый.',
    messageSource: 'spor3z',
    expectedContains: ['Я spor3z', 'Ежовик'],
    shouldNotContain: []
  },
  {
    name: 'Ответ уже содержит spor3z - не должен дублировать',
    message: 'кто ты?',
    aiResponse: 'Я spor3z, твой персональный ассистент.',
    messageSource: 'spor3z',
    expectedContains: ['spor3z'],
    shouldNotContain: ['Я spor3z. Я spor3z'] // не должно быть двойного упоминания
  },
  {
    name: 'Другой источник (telegram_bot) - не должен добавлять spor3z',
    message: 'привет',
    aiResponse: 'Привет! Я консультант.',
    messageSource: 'telegram_bot',
    expectedContains: [],
    shouldNotContain: ['spor3z']
  },
  {
    name: 'Запрос с формой - должен сохранить теги',
    message: 'ежовик порошок на месяц',
    aiResponse: 'Отлично! Ежовик порошок 100г за 1100₽. [add_to_cart:ezh100]',
    messageSource: 'spor3z',
    expectedContains: ['spor3z', '[add_to_cart:ezh100]'],
    shouldNotContain: []
  }
];

let passedTests = 0;
let failedTests = 0;

tests.forEach((test, index) => {
  console.log(`\n${index + 1}. ТЕСТ: ${test.name}`);
  console.log('-'.repeat(70));
  console.log(`Сообщение: "${test.message}"`);
  console.log(`Источник: ${test.messageSource}`);
  console.log(`AI ответ: "${test.aiResponse}"`);
  
  const processedResponse = testSpor3zResponseProcessing(
    test.message,
    test.aiResponse,
    test.messageSource
  );
  
  console.log(`Обработанный ответ: "${processedResponse}"`);
  
  // Проверки
  const checks = [];
  
  test.expectedContains.forEach(expected => {
    const found = processedResponse.toLowerCase().includes(expected.toLowerCase());
    checks.push({ name: `Содержит "${expected}"`, passed: found });
    console.log(`   ${found ? '✅' : '❌'} Содержит "${expected}": ${found ? 'да' : 'нет'}`);
  });
  
  test.shouldNotContain.forEach(forbidden => {
    const found = processedResponse.toLowerCase().includes(forbidden.toLowerCase());
    checks.push({ name: `НЕ содержит "${forbidden}"`, passed: !found });
    console.log(`   ${found ? '❌' : '✅'} НЕ содержит "${forbidden}": ${!found ? 'да' : 'нет'}`);
  });
  
  const allPassed = checks.every(c => c.passed);
  
  if (allPassed) {
    console.log(`\n✅ ТЕСТ ПРОЙДЕН`);
    passedTests++;
  } else {
    console.log(`\n❌ ТЕСТ НЕ ПРОЙДЕН`);
    failedTests++;
  }
});

console.log(`\n${'='.repeat(70)}`);
console.log('📊 ИТОГОВАЯ СВОДКА');
console.log('='.repeat(70));
console.log(`✅ Пройдено: ${passedTests}/${tests.length}`);
console.log(`❌ Не пройдено: ${failedTests}/${tests.length}`);

if (passedTests === tests.length) {
  console.log(`\n✅ ВСЕ ТЕСТЫ ЛОГИКИ ПРОЙДЕНЫ!`);
  console.log(`Код правильно обрабатывает ответы для spor3z агента.`);
} else {
  console.log(`\n⚠️ ЕСТЬ ПРОБЛЕМЫ В ЛОГИКЕ!`);
  console.log(`Требуется исправление кода.`);
}

console.log('='.repeat(70));

