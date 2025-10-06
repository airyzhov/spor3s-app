const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

// Конфигурация
const apiId = 123456; // Замените на ваш API ID
const apiHash = 'your_api_hash'; // Замените на ваш API Hash
const session = new StringSession(''); // Оставьте пустым для новой сессии

// Создаем клиент
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

// Базовый URL для AI API
const baseUrl = 'https://humane-jaguar-annually.ngrok-free.app';

async function callAI(message, userId) {
  try {
    const response = await axios.post(`${baseUrl}/api/ai-simple`, {
      message: message,
      source: 'spor3z',
      telegram_id: userId
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    return response.data.response;
  } catch (error) {
    console.error('AI API ошибка:', error.message);
    return 'Извините, произошла ошибка при обращении к ИИ. Попробуйте позже.';
  }
}

async function handleMessage(event) {
  try {
    const message = event.message;
    const sender = await event.getSender();
    
    if (!message || !sender) return;
    
    const userId = sender.id.toString();
    const text = message.text;
    
    if (!text) return;
    
    console.log(`📨 Получено сообщение от ${userId}: ${text}`);
    
    // Получаем ответ от AI
    const aiResponse = await callAI(text, userId);
    
    // Отправляем ответ
    await event.reply(aiResponse);
    console.log(`✅ Ответ отправлен: ${aiResponse.substring(0, 50)}...`);
    
  } catch (error) {
    console.error('❌ Ошибка обработки сообщения:', error);
  }
}

async function startBot() {
  try {
    console.log('🚀 Запуск Spor3z бота...');
    
    await client.start({
      phoneNumber: async () => await input.text('Введите номер телефона: '),
      password: async () => await input.text('Введите пароль (если есть): '),
      phoneCode: async () => await input.text('Введите код подтверждения: '),
      onError: (err) => console.log(err),
    });
    
    console.log('✅ Spor3z бот запущен!');
    console.log('📱 Сессия:', client.session.save());
    
    // Слушаем новые сообщения
    client.addEventHandler(handleMessage, { newMessage: true });
    
  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error);
  }
}

startBot();
