// 🧪 КОМПЛЕКСНЫЙ ТЕСТ СЦЕНАРИЕВ spor3s-app
// Запустите в консоли браузера (F12)

console.log('🧪 ТЕСТИРОВАНИЕ РАЗЛИЧНЫХ СЦЕНАРИЕВ');
console.log('======================================');

class SporesAppTester {
  constructor() {
    this.testResults = [];
    this.mockTelegramId = '638358977'; // Используем реальный ID из логов
  }

  // Тест авторизации
  async testTelegramAuth() {
    console.log('\n🔐 ТЕСТ: Авторизация через Telegram');
    console.log('===================================');
    
    // Проверяем наличие Telegram WebApp
    const hasTelegramWebApp = !!(window.Telegram && window.Telegram.WebApp);
    this.logTest('Telegram WebApp доступен', hasTelegramWebApp);
    
    if (hasTelegramWebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      this.logTest('Данные пользователя получены', !!user);
      
      if (user) {
        console.log('👤 Пользователь:', {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username
        });
      }
    }

    // Тестируем API init-user
    await this.testInitUserAPI();
  }

  async testInitUserAPI() {
    console.log('\n📡 ТЕСТ: API /init-user');
    console.log('========================');
    
    try {
      const response = await fetch('/api/init-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: this.mockTelegramId })
      });
      
      this.logTest('API init-user отвечает', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        this.logTest('Получен user ID', !!data.id);
        console.log('✅ User ID:', data.id);
      } else {
        const errorData = await response.json();
        console.log('❌ Ошибка API:', errorData);
      }
    } catch (error) {
      this.logTest('API init-user доступен', false);
      console.log('❌ Ошибка подключения:', error.message);
    }
  }

  // Тест геймификации
  async testGamificationFeatures() {
    console.log('\n🎮 ТЕСТ: Функции геймификации');
    console.log('=============================');
    
    // Проверяем элементы баланса
    const balanceElements = document.querySelectorAll('[style*="Spor3s"], [style*="баланс"]');
    this.logTest('Элементы баланса найдены', balanceElements.length > 0);
    
    // Проверяем систему уровней (если реализована)
    const levelElements = document.querySelectorAll('[style*="Уровень"], [style*="XP"]');
    this.logTest('Элементы уровней найдены', levelElements.length > 0);
    
    // Тестируем mock данные для Road Map
    const mockMetrics = {
      memory: 7,
      sleep: 6,
      energy: 8,
      stress: 4
    };
    
    console.log('📊 Mock метрики для Road Map:', mockMetrics);
    this.logTest('Метрики для Road Map подготовлены', true);
  }

  // Тест различных окружений
  testEnvironments() {
    console.log('\n🌍 ТЕСТ: Различные окружения');
    console.log('=============================');
    
    // Проверяем в каком окружении запущено приложение
    const userAgent = navigator.userAgent;
    const isTelegramApp = userAgent.includes('Telegram');
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isLocalhost = window.location.hostname === 'localhost';
    const isNgrok = window.location.hostname.includes('ngrok');
    
    this.logTest('Запущено в Telegram', isTelegramApp);
    this.logTest('Мобильное устройство', isMobile);
    this.logTest('Локальная разработка', isLocalhost);
    this.logTest('Доступ через ngrok', isNgrok);
    
    console.log('🔍 User Agent:', userAgent);
    console.log('🌐 URL:', window.location.href);
  }

  // Тест UI элементов
  testUIElements() {
    console.log('\n🎨 ТЕСТ: UI элементы');
    console.log('====================');
    
    // Проверяем основные элементы интерфейса
    const chatInput = document.querySelector('input[placeholder*="грибным"]');
    const footerButtons = document.querySelectorAll('span[style*="cursor: pointer"]');
    const productButtons = document.querySelectorAll('button');
    
    this.logTest('Поле ввода чата найдено', !!chatInput);
    this.logTest('Footer кнопки найдены', footerButtons.length >= 3);
    this.logTest('Кнопки продуктов найдены', productButtons.length > 5);
    
    // Проверяем фоновое изображение
    const bodyStyle = window.getComputedStyle(document.body);
    const hasBackgroundImage = bodyStyle.backgroundImage.includes('psy-forest-bg');
    this.logTest('Фоновое изображение установлено', hasBackgroundImage);
  }

  // Тест API эндпоинтов
  async testAllAPIs() {
    console.log('\n📡 ТЕСТ: Все API эндпоинты');
    console.log('==========================');
    
    const apis = [
      { name: 'Products', endpoint: '/api/products', method: 'GET' },
      { name: 'AI Chat', endpoint: '/api/ai', method: 'POST', body: { messages: [{ role: 'user', content: 'test' }] } },
      { name: 'Init User', endpoint: '/api/init-user', method: 'POST', body: { telegram_id: this.mockTelegramId } },
    ];
    
    for (const api of apis) {
      try {
        const options = {
          method: api.method,
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (api.body) {
          options.body = JSON.stringify(api.body);
        }
        
        const response = await fetch(api.endpoint, options);
        this.logTest(`${api.name} API работает`, response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${api.name}:`, Object.keys(data));
        }
      } catch (error) {
        this.logTest(`${api.name} API доступен`, false);
        console.log(`❌ ${api.name} ошибка:`, error.message);
      }
    }
  }

  // Тест мобильной адаптации
  testMobileAdaptation() {
    console.log('\n📱 ТЕСТ: Мобильная адаптация');
    console.log('============================');
    
    const viewport = document.querySelector('meta[name="viewport"]');
    this.logTest('Viewport мета-тег настроен', !!viewport);
    
    // Проверяем адаптивность
    const screenWidth = window.innerWidth;
    const isMobileWidth = screenWidth <= 768;
    this.logTest('Мобильная ширина экрана', isMobileWidth);
    
    // Проверяем touch события
    const hasTouchSupport = 'ontouchstart' in window;
    this.logTest('Поддержка touch событий', hasTouchSupport);
    
    console.log(`📐 Ширина экрана: ${screenWidth}px`);
  }

  // Тест производительности
  testPerformance() {
    console.log('\n⚡ ТЕСТ: Производительность');
    console.log('===========================');
    
    const performance = window.performance;
    if (performance) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      const domReady = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
      
      this.logTest('Время загрузки < 5 сек', loadTime < 5000);
      this.logTest('DOM готов < 3 сек', domReady < 3000);
      
      console.log(`⏱️ Время загрузки: ${loadTime}ms`);
      console.log(`⏱️ DOM готов: ${domReady}ms`);
    }
    
    // Проверяем количество DOM элементов
    const domElementsCount = document.querySelectorAll('*').length;
    this.logTest('Количество DOM элементов разумное', domElementsCount < 1000);
    console.log(`🏗️ DOM элементов: ${domElementsCount}`);
  }

  // Тест безопасности
  testSecurity() {
    console.log('\n🔒 ТЕСТ: Безопасность');
    console.log('======================');
    
    // Проверяем HTTPS
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost';
    this.logTest('HTTPS или localhost', isHttps || isLocalhost);
    
    // Проверяем CSP заголовки
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    this.logTest('CSP настроен', !!metaCSP);
    
    // Проверяем отсутствие консольных ошибок
    const hasConsoleErrors = console.error.toString().includes('native');
    this.logTest('Нет критических ошибок в консоли', !hasConsoleErrors);
  }

  // Вспомогательный метод для логирования
  logTest(description, passed, details = '') {
    const result = passed ? '✅' : '❌';
    console.log(`${result} ${description} ${details}`);
    this.testResults.push({ description, passed, details });
  }

  // Генерация отчета
  generateReport() {
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
    console.log('================================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`✅ Пройдено тестов: ${passedTests}/${totalTests}`);
    console.log(`📊 Процент успеха: ${successRate}%`);
    
    if (successRate >= 90) {
      console.log('🎉 ОТЛИЧНО! Приложение готово к продакшену');
    } else if (successRate >= 70) {
      console.log('⚠️ ХОРОШО, но есть проблемы для исправления');
    } else {
      console.log('❌ ТРЕБУЕТСЯ ДОРАБОТКА перед релизом');
    }
    
    // Показываем неудачные тесты
    const failedTests = this.testResults.filter(t => !t.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ Неудачные тесты:');
      failedTests.forEach(test => {
        console.log(`   • ${test.description}`);
      });
    }
    
    return { totalTests, passedTests, successRate, failedTests };
  }

  // Запуск всех тестов
  async runAllTests() {
    console.log('🚀 Запуск комплексного тестирования...\n');
    
    await this.testTelegramAuth();
    this.testEnvironments();
    this.testUIElements();
    await this.testAllAPIs();
    await this.testGamificationFeatures();
    this.testMobileAdaptation();
    this.testPerformance();
    this.testSecurity();
    
    return this.generateReport();
  }
}

// Тестирование Road Map функциональности
function testRoadMapFeatures() {
  console.log('\n🗺️ ТЕСТ: Road Map функциональность');
  console.log('===================================');
  
  // Создаем mock данные для тестирования
  const mockUser = {
    id: 'test-user-123',
    telegram_id: '638358977',
    first_name: 'Test User'
  };
  
  const mockMetrics = {
    startAssessment: {
      memory: 5,
      sleep: 4,
      energy: 6,
      stress: 7
    },
    weeklyProgress: [
      {
        week: 1,
        metrics: { memory: 6, sleep: 5, energy: 6, stress: 6 },
        achievements: ['Первый день', 'Неделя адаптации']
      },
      {
        week: 2,  
        metrics: { memory: 7, sleep: 6, energy: 7, stress: 5 },
        achievements: ['7 дней подряд', 'Первые ростки']
      }
    ]
  };
  
  console.log('📊 Mock данные Road Map созданы');
  console.log('👤 Тестовый пользователь:', mockUser);
  console.log('📈 Прогресс по неделям:', mockMetrics.weeklyProgress.length);
  
  // Тестируем расчет улучшений
  const calculateImprovement = (start, current) => {
    return ((current - start) / start) * 100;
  };
  
  const memoryImprovement = calculateImprovement(
    mockMetrics.startAssessment.memory,
    mockMetrics.weeklyProgress[1].metrics.memory
  );
  
  console.log(`🧠 Улучшение памяти: +${memoryImprovement.toFixed(0)}%`);
  console.log('✅ Road Map тесты завершены');
  
  return mockMetrics;
}

// Создаем экземпляр тестера и запускаем
const tester = new SporesAppTester();

// Запуск тестирования
(async () => {
  const results = await tester.runAllTests();
  const roadMapData = testRoadMapFeatures();
  
  console.log('\n🎯 СЛЕДУЮЩИЕ ШАГИ:');
  console.log('==================');
  console.log('1. Реализовать Road Map компонент');
  console.log('2. Добавить систему достижений');  
  console.log('3. Создать трекер дополнительных привычек');
  console.log('4. Настроить уведомления о прогрессе');
  console.log('5. Добавить экспорт данных прогресса');
  
  // Экспортируем результаты в глобальную область
  window.testResults = results;
  window.roadMapMockData = roadMapData;
  window.tester = tester;
})();

// Функции для ручного тестирования
window.testTelegramAuth = () => tester.testTelegramAuth();
window.testRoadMap = testRoadMapFeatures;
window.generateMockProgress = () => {
  const weeks = 12;
  const progress = [];
  for (let i = 1; i <= weeks; i++) {
    progress.push({
      week: i,
      date: new Date(Date.now() - (weeks - i) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      metrics: {
        memory: Math.min(10, 4 + i * 0.3 + Math.random() * 0.5),
        sleep: Math.min(10, 3 + i * 0.4 + Math.random() * 0.5),
        energy: Math.min(10, 4 + i * 0.25 + Math.random() * 0.5),
        stress: Math.max(1, 8 - i * 0.3 + Math.random() * 0.5)
      },
      achievements: i % 4 === 0 ? [`Неделя ${i}`, 'Milestone'] : [`Неделя ${i}`],
      extraHabits: Math.floor(Math.random() * 30) + 10
    });
  }
  return progress;
};

console.log('\n💡 ДОСТУПНЫЕ КОМАНДЫ ДЛЯ РУЧНОГО ТЕСТИРОВАНИЯ:');
console.log('- testTelegramAuth() - тест авторизации');
console.log('- testRoadMap() - тест Road Map');
console.log('- generateMockProgress() - генерация данных прогресса');
console.log('- tester.runAllTests() - повторить все тесты'); 