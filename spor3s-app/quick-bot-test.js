// Быстрый тест бота
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

console.log('🤖 БЫСТРЫЙ ТЕСТ БОТА');
console.log('=' .repeat(40));

async function quickTest() {
  try {
    // Проверяем последние обновления
    const response = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates?limit=5`);
    
    if (response.data.ok) {
      const updates = response.data.result;
      console.log(`📬 Получено обновлений: ${updates.length}`);
      
      if (updates.length > 0) {
        console.log('\n📱 Последние сообщения:');
        updates.forEach((update, index) => {
          if (update.message) {
            const msg = update.message;
            const time = new Date(msg.date * 1000).toLocaleString();
            console.log(`${index + 1}. "${msg.text}" от ${msg.from.first_name} в ${time}`);
          }
        });
      }
      
      console.log('\n💡 СТАТУС БОТА:');
      if (updates.length > 0) {
        console.log('✅ Бот получает сообщения');
        console.log('❓ Проверьте, отвечает ли он в Telegram');
      } else {
        console.log('⚠️ Новых сообщений нет');
        console.log('💡 Отправьте боту /start для тестирования');
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
  
  console.log('\n🔧 ЕСЛИ БОТ МОЛЧИТ:');
  console.log('1. Проверьте, что процесс запущен');
  console.log('2. Проверьте логи в консоли');
  console.log('3. Проверьте токены в env.local');
  console.log('4. Перезапустите бота');
}

quickTest().catch(console.error);
