// Быстрая настройка @web3grow интеграции
const fs = require('fs');
const path = require('path');

console.log('🚀 БЫСТРАЯ НАСТРОЙКА @web3grow ИНТЕГРАЦИИ');
console.log('=====================================');

async function setupWeb3Grow() {
  console.log('\n📋 Шаг 1: Получение API данных');
  console.log('1. Перейдите на https://my.telegram.org');
  console.log('2. Войдите в аккаунт @web3grow');
  console.log('3. Создайте новое приложение:');
  console.log('   - App title: Web3Grow Integration');
  console.log('   - Short name: web3grow_bot');
  console.log('   - Platform: Desktop');
  console.log('   - Description: Integration for personal messages');
  console.log('4. Запишите API_ID и API_HASH');
  
  console.log('\n📋 Шаг 2: Генерация session string');
  console.log('После получения API данных:');
  console.log('1. npm install telegram input');
  console.log('2. node generate-session.js');
  console.log('3. Следуйте инструкциям в консоли');
  
  console.log('\n📋 Шаг 3: Настройка переменных окружения');
  
  // Проверяем существующий .env.local
  const envPath = path.join(__dirname, '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✅ Файл .env.local найден');
  } else {
    console.log('❌ Файл .env.local не найден, создаем новый');
  }
  
  // Добавляем переменные для @web3grow
  const web3growVars = `
# Telegram API для @web3grow
TELEGRAM_API_ID=ваш_api_id_здесь
TELEGRAM_API_HASH=ваш_api_hash_здесь
TELEGRAM_SESSION_STRING=ваш_session_string_здесь

# Уведомления менеджера
MANAGER_CHAT_ID=ваш_chat_id_здесь
`;
  
  if (!envContent.includes('TELEGRAM_API_ID')) {
    const newEnvContent = envContent + web3growVars;
    fs.writeFileSync(envPath, newEnvContent);
    console.log('✅ Добавлены переменные для @web3grow в .env.local');
  } else {
    console.log('✅ Переменные для @web3grow уже существуют');
  }
  
  console.log('\n📋 Шаг 4: Запуск интеграции');
  console.log('После настройки всех переменных:');
  console.log('node web3grow-integration.js');
  
  console.log('\n📋 Шаг 5: Тестирование');
  console.log('Отправьте сообщение @web3grow:');
  console.log('"Привет, расскажи о ежовике"');
  
  console.log('\n🎯 ЧТО ДЕЛАТЬ СЕЙЧАС:');
  console.log('=====================================');
  console.log('1. 🔑 Перейдите на https://my.telegram.org');
  console.log('2. 📱 Войдите в аккаунт @web3grow');
  console.log('3. 🆕 Создайте новое приложение');
  console.log('4. 📝 Запишите API_ID и API_HASH');
  console.log('5. 🔄 Вернитесь сюда для следующих шагов');
  
  console.log('\n💡 СОВЕТ: Если у вас уже есть session string,');
  console.log('просто добавьте его в .env.local и запустите интеграцию!');
}

// Запуск настройки
setupWeb3Grow().catch(console.error); 