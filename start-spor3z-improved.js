const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Конфигурация
const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const session = new StringSession(process.env.TELEGRAM_SESSION_STRING);

// Создаем клиент
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

// Базовый URL для AI API
const baseUrl = 'http://localhost:3000';

// Кеш последних сообщений для каждого пользователя
const userMessages = new Map();

async function callAI(message, userId) {
  try {
    // Получаем историю сообщений пользователя
    let messages = userMessages.get(userId) || [];
    
    // Добавляем текущее сообщение
    messages.push({ role: 'user', content: message });
    
    // Ограничиваем историю последними 10 сообщениями
    if (messages.length > 10) {
      messages = messages.slice(-10);
    }
    
    const response = await axios.post(`${baseUrl}/api/ai`, {
      message: message,
      context: messages.slice(0, -1), // Отправляем все кроме последнего (он уже в message)
      source: 'spor3z',
      user_id: userId
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    const aiResponse = response.data.response;
    
    // Сохраняем ответ AI в историю
    messages.push({ role: 'assistant', content: aiResponse });
    
    // Обновляем кеш
    if (messages.length > 10) {
      messages = messages.slice(-10);
    }
    userMessages.set(userId, messages);
    
    return aiResponse;
  } catch (error) {
    console.error('AI API ошибка:', error.message);
    return 'Извините, произошла ошибка при обращении к ИИ. Попробуйте позже.';
  }
}

async function handleMessage(event) {
  try {
    const message = event.message;
    
    if (!message || !message.text) return;
    
    const text = message.text;
    const userId = message.fromId ? message.fromId.userId.toString() : message.peerId.userId.toString();
    
    console.log(`📨 Получено сообщение от ${userId}: ${text}`);
    
    // Получаем ответ от AI
    const aiResponse = await callAI(text, userId);
    
    if (!aiResponse) {
      console.log('⚠️ Пустой ответ от AI');
      return;
    }
    
    // Отправляем ответ
    await client.sendMessage(message.peerId, { message: aiResponse });
    console.log(`✅ Ответ отправлен: ${aiResponse.substring(0, 50)}...`);
    
  } catch (error) {
    console.error('❌ Ошибка обработки сообщения:', error);
  }
}

async function startBot() {
  try {
    console.log('🚀 Запуск Spor3z бота...');
    
    // Если есть SESSION_STRING, используем автоматическую авторизацию
    if (process.env.TELEGRAM_SESSION_STRING) {
      await client.connect();
      console.log('✅ Подключено через сохраненную сессию');
    } else {
      throw new Error('TELEGRAM_SESSION_STRING не найден в .env');
    }
    
    console.log('✅ Spor3z бот запущен!');
    
    // Слушаем новые сообщения
    const { NewMessage } = require('telegram/events');
    client.addEventHandler(handleMessage, new NewMessage({}));
    
  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error);
    process.exit(1);
  }
}

// Запуск бота и keep alive
startBot().then(() => {
  console.log('📱 Spor3z готов к получению сообщений...');
}).catch(error => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});

// Обработка сигналов завершения
process.on('SIGINT', async () => {
  console.log('\n🛑 Остановка Spor3z...');
  await client.disconnect();
  process.exit(0);
});
