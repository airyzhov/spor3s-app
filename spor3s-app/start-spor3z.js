// Запуск интеграции @spor3z
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

console.log('🤖 Запуск интеграции @spor3z');
console.log('=====================================');

// Проверяем переменные окружения
const API_ID = process.env.TELEGRAM_API_ID;
const API_HASH = process.env.TELEGRAM_API_HASH;
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('📋 Проверка переменных:');
console.log('API_ID:', API_ID ? '✅' : '❌');
console.log('API_HASH:', API_HASH ? '✅' : '❌');
console.log('SESSION_STRING:', SESSION_STRING ? '✅' : '❌');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');

if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.error('❌ Отсутствуют обязательные переменные окружения');
  process.exit(1);
}

// Создаем клиенты
const client = new TelegramClient(
  new StringSession(SESSION_STRING),
  parseInt(API_ID),
  API_HASH,
  { 
    connectionRetries: 5,
    useWSS: false
  }
);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupEventHandlers() {
  console.log('🔧 Настройка обработчиков событий...');
  
  // Обработка входящих сообщений
  client.addEventHandler(async (event) => {
    const message = event.message;
    
    // Игнорируем сообщения от ботов и каналов
    if (message.senderId?.bot || message.chatId?.channel) {
      return;
    }

    try {
      await handleIncomingMessage(message);
    } catch (error) {
      console.error('❌ Ошибка обработки сообщения:', error);
    }
  }, new NewMessage({}));
  
  console.log('✅ Обработчики настроены');
}

async function handleIncomingMessage(message) {
  const telegramId = message.senderId?.toString();
  const userMessage = message.text;
  const chatId = message.chatId;

  if (!telegramId || !userMessage) {
    return;
  }

  console.log(`📨 Новое сообщение от ${telegramId}: ${userMessage}`);

  try {
    // Получаем или создаем пользователя
    const user = await getOrCreateUser(telegramId);
    console.log(`✅ Пользователь: ${user.id}`);
    
    // Сохраняем сообщение пользователя
    await saveMessage(user.id, 'user', userMessage, 'spor3z');
    console.log('✅ Сообщение сохранено');

    // Показываем "печатает..."
    await client.sendMessage(chatId, { message: '...' });

    // Получаем контекст пользователя
    const context = await getUserContext(user.id);
    console.log(`📝 Контекст: ${context.length} сообщений`);

    // Вызываем AI API
    const aiResponse = await callAI(userMessage, context);
    console.log(`🤖 AI ответ: ${aiResponse}`);

    // Сохраняем ответ AI
    await saveMessage(user.id, 'assistant', aiResponse, 'spor3z');
    console.log('✅ AI ответ сохранен');

    // Отправляем ответ
    await client.sendMessage(chatId, { message: aiResponse });
    console.log('✅ Ответ отправлен');

  } catch (error) {
    console.error('❌ Ошибка обработки сообщения:', error);
    await client.sendMessage(chatId, { 
      message: 'Извините, произошла ошибка. Попробуйте позже.' 
    });
  }
}

async function getOrCreateUser(telegramId) {
  try {
    // Проверяем существующего пользователя
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // Создаем нового пользователя
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ telegram_id: telegramId }])
      .select()
      .single();

    if (error) throw error;
    return newUser;
  } catch (error) {
    console.error('❌ Ошибка работы с пользователем:', error);
    // Возвращаем временного пользователя
    return { id: 'temp-' + telegramId };
  }
}

async function saveMessage(userId, role, content, source) {
  try {
    const { error } = await supabase
      .from('messages')
      .insert([{
        user_id: userId,
        role,
        content,
        source
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Ошибка сохранения сообщения:', error);
  }
}

async function getUserContext(userId) {
  try {
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return messages || [];
  } catch (error) {
    console.error('❌ Ошибка получения контекста:', error);
    return [];
  }
}

async function callAI(message, context) {
  try {
    const response = await axios.post('http://localhost:3000/api/ai', {
      message,
      context,
      source: 'spor3z'
    }, {
      timeout: 10000
    });

    return response.data.response;
  } catch (error) {
    console.error('❌ AI API ошибка:', error.message);
    return 'Извините, AI временно недоступен. Попробуйте позже.';
  }
}

async function start() {
  try {
    console.log('🚀 Запуск интеграции с @spor3z...');
    
    // Подключаемся к Telegram
    await client.start();
    console.log('✅ Подключение к Telegram установлено');
    
    // Настраиваем обработчики
    await setupEventHandlers();
    
    console.log('✅ @spor3z интеграция активна и готова к работе!');
    console.log('📱 Отправьте сообщение @spor3z для тестирования');
    
    // Держим процесс активным
    process.on('SIGINT', async () => {
      console.log('\n🛑 Остановка интеграции...');
      await client.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Ошибка запуска:', error.message);
    console.log('');
    console.log('💡 Возможные решения:');
    console.log('1. Проверьте session string');
    console.log('2. Убедитесь что сервер запущен: npm run dev');
    console.log('3. Проверьте интернет соединение');
  }
}

// Запускаем интеграцию
start();
