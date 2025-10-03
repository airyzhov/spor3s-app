// Простой обработчик для @web3grow
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
require('dotenv').config({ path: 'env.local' });

async function startSimpleHandler() {
  console.log('🤖 ЗАПУСК ПРОСТОГО ОБРАБОТЧИКА @WEB3GROW');
  console.log('==========================================');

  try {
    // Создаем клиент
    const client = new TelegramClient(
      new StringSession(process.env.TELEGRAM_SESSION_STRING),
      parseInt(process.env.TELEGRAM_API_ID),
      process.env.TELEGRAM_API_HASH
    );

    console.log('🔗 Подключение к Telegram...');
    await client.start();
    
    const me = await client.getMe();
    console.log(`✅ Подключен как: ${me.firstName} ${me.lastName || ''}`);
    console.log(`🆔 ID: ${me.id}`);
    console.log(`@username: ${me.username || 'нет'}`);

    // Простой обработчик сообщений
    let messageCount = 0;
    const messageHandler = async (update) => {
      try {
        // Проверяем, что это входящее сообщение
        if (update.message && !update.message.out) {
          const message = update.message;
          messageCount++;
          
          console.log(`\n📨 СООБЩЕНИЕ #${messageCount}`);
          console.log(`👤 От: ${message.senderId || 'неизвестно'}`);
          console.log(`📝 Текст: "${message.message || '[нет текста]'}"`);
          console.log(`💬 Chat ID: ${message.chatId || 'undefined'}`);
          console.log(`⏰ Время: ${new Date().toLocaleString()}`);
          
          // Если есть текст, отправляем ответ
          if (message.message && message.message.trim()) {
            console.log(`\n🤖 ОТПРАВЛЯЕМ ОТВЕТ...`);
            
            try {
              const response = `🤖 Привет! Я получил ваше сообщение: "${message.message}"\n\nВремя: ${new Date().toLocaleString()}\n\nЭто ответ от @web3grow!`;
              
              await client.sendMessage(message.chatId, {
                message: response
              });

              console.log('✅ Ответ отправлен!');
            } catch (error) {
              console.log('❌ Ошибка отправки:', error.message);
            }
          }
        }
      } catch (error) {
        console.log('❌ Ошибка обработки сообщения:', error.message);
      }
    };

    client.addEventHandler(messageHandler);

    console.log('\n🎯 Простой обработчик готов!');
    console.log('📱 Отправьте сообщение @web3grow в Telegram');
    console.log('💡 Для остановки нажмите Ctrl+C');

    // Обработка остановки
    process.on('SIGINT', async () => {
      console.log('\n🛑 Остановка обработчика...');
      await client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Ошибка запуска:', error.message);
  }
}

// Запуск простого обработчика
startSimpleHandler().catch(console.error); 