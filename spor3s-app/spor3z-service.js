// Служба 24/7 для @spor3z
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
require('dotenv').config({ path: 'env.local' });

async function startSpor3zService() {
  console.log('🤖 ЗАПУСК СЛУЖБЫ 24/7 @SPOR3Z');
  console.log('=================================');
  console.log('🕐 Служба будет работать постоянно');
  console.log('📱 Бот будет отвечать на сообщения автоматически');
  console.log('');

  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;

  async function connectAndListen() {
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
      console.log('');

      // Сброс счетчика при успешном подключении
      reconnectAttempts = 0;

      // Обработчик сообщений
      let messageCount = 0;
      const serviceHandler = async (update) => {
        try {
          // Обрабатываем новые сообщения
          if (update.className === 'UpdateNewMessage' && update.message) {
            const message = update.message;
            
            // Только входящие сообщения с текстом
            if (!message.out && message.message && message.message.trim()) {
              messageCount++;
              
              console.log(`\n📨 СООБЩЕНИЕ #${messageCount}`);
              console.log(`👤 От: ${message.senderId || 'неизвестно'}`);
              console.log(`📝 Текст: "${message.message}"`);
              console.log(`⏰ Время: ${new Date().toLocaleString()}`);
              
              try {
                const response = `🤖 Привет! Я получил ваше сообщение: "${message.message}"\n\nВремя: ${new Date().toLocaleString()}\n\nЭто автоматический ответ от @spor3z!`;
                
                await client.sendMessage(message.chatId, {
                  message: response
                });

                console.log('✅ Ответ отправлен автоматически!');
              } catch (error) {
                console.log('❌ Ошибка отправки:', error.message);
              }
            }
          }
        } catch (error) {
          console.log('❌ Ошибка обработки сообщения:', error.message);
        }
      };

      client.addEventHandler(serviceHandler);

      console.log('🎯 Служба 24/7 запущена!');
      console.log('📱 Бот готов отвечать на сообщения');
      console.log('💡 Для остановки нажмите Ctrl+C');
      console.log('');

      // Обработка отключения
      process.on('SIGINT', async () => {
        console.log('\n🛑 Остановка службы...');
        await client.disconnect();
        process.exit(0);
      });

      // Обработка ошибок подключения
      client.session.setDC = function(dcId, serverAddress, port) {
        console.log(`🔄 Переключение на DC ${dcId}: ${serverAddress}:${port}`);
      };

    } catch (error) {
      console.error('❌ Ошибка подключения:', error.message);
      
      // Автоматическое переподключение
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Экспоненциальная задержка
        
        console.log(`🔄 Попытка переподключения #${reconnectAttempts} через ${delay/1000} секунд...`);
        
        setTimeout(() => {
          connectAndListen();
        }, delay);
      } else {
        console.error('❌ Превышено максимальное количество попыток переподключения');
        process.exit(1);
      }
    }
  }

  // Запуск службы
  await connectAndListen();
}

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  console.log('❌ Необработанная ошибка:', error.message);
  console.log('🔄 Перезапуск через 5 секунд...');
  setTimeout(() => {
    startSpor3zService();
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ Необработанное отклонение:', reason);
  console.log('🔄 Перезапуск через 5 секунд...');
  setTimeout(() => {
    startSpor3zService();
  }, 5000);
});

// Запуск службы
startSpor3zService().catch(console.error);
