// Скрипт для тестирования ответа бота
const axios = require('axios');

console.log('🧪 ТЕСТИРОВАНИЕ ОТВЕТА БОТА');
console.log('=' .repeat(60));

async function testBotResponse() {
  console.log('📱 Отправьте боту в Telegram:');
  console.log('   1. /start');
  console.log('   2. привет');
  console.log('   3. есть ежовик?');
  console.log('');
  console.log('⏳ Ожидание ответов...');
  console.log('💡 Если бот отвечает - проблема решена!');
  console.log('❌ Если молчит - проблема в процессах на VPS');
  
  // Проверяем статус через API
  try {
    const response = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates?limit=1`);
    
    if (response.data.ok && response.data.result.length > 0) {
      const lastUpdate = response.data.result[0];
      console.log('');
      console.log('📬 Последнее сообщение:');
      console.log(`   От: ${lastUpdate.message?.from?.first_name || 'Unknown'}`);
      console.log(`   Текст: "${lastUpdate.message?.text || 'медиа'}"`);
      console.log(`   Время: ${new Date(lastUpdate.message?.date * 1000).toLocaleString()}`);
      console.log(`   Ожидающих обновлений: ${response.data.result.length}`);
    }
  } catch (error) {
    console.log('❌ Ошибка проверки обновлений:', error.message);
  }
  
  console.log('');
  console.log('🔍 ДИАГНОСТИКА:');
  console.log('1. Если бот отвечает локально - проблема в VPS');
  console.log('2. Если бот не отвечает - проблема в токенах/API');
  console.log('3. Проверьте логи в консоли выше');
}

testBotResponse().catch(console.error);
