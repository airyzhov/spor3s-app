// Упрощенная отладочная интеграция @web3grow
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

console.log('🔍 Упрощенная отладочная интеграция @web3grow');
console.log('=====================================');

// Параметры
const API_ID = 25152508;
const API_HASH = 'e6d11fbfdac29ec3f8e9f6eb4dc54385';
const SESSION_STRING = '1ApWapzMBu0-7GBPPWHF3xnHLsqVHpPfVfIwyIoX3Y4o147RRCF733k42CMfg8ZPkBXdwLb8cOLDIuetDUHaR39SjN9Ht1RyeU0gzWZiD_p44_2jUgFqGrP8-JySxW9OlZp7jM1oMSUUxUUEe63Ioxp08Dc5P0-fCRIgQlBVSxfePt0fUzBQB22q1O4JtxUNv8vOWeKu3tOb3oU22SUti96ziS4mu5cpWfsROoBAUxGHQMSdz30emwsRglWrdFEGYl1s5LR5AdHQe7Nzs2C9jnaq3rOJpNsYHpEDU325EIw3j-yEADT7I5OuTV_gon57bq_MGFkNQtUVeeOIONhvUHdJlTPvnNyg=';

// Создаем клиент
const client = new TelegramClient(
  new StringSession(SESSION_STRING),
  API_ID,
  API_HASH,
  { 
    connectionRetries: 5,
    useWSS: false
  }
);

// Supabase клиент
const supabase = createClient(
  'https://hwospkbheqaauluoytvz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs'
);

let messageCount = 0;

async function setupEventHandlers() {
  console.log('🔧 Настройка обработчиков событий...');
  
  // Обработка входящих сообщений
  client.addEventHandler(async (event) => {
    messageCount++;
    console.log(`📨 Событие #${messageCount} получено`);
    
    const message = event.message;
    
    if (!message) {
      console.log('❌ Сообщение отсутствует в событии');
      return;
    }
    
    console.log('📝 Детали сообщения:');
    console.log('- ID:', message.id);
    console.log('- Отправитель:', message.senderId);
    console.log('- Чат:', message.chatId);
    console.log('- Текст:', message.text);
    console.log('- Тип:', message.className);
    
    // Игнорируем сообщения от ботов и каналов
    if (message.senderId?.bot || message.chatId?.channel) {
      console.log('⏭️ Игнорируем бота/канал');
      return;
    }

    // Игнорируем собственные сообщения
    const me = await client.getMe();
    if (message.senderId?.toString() === me.id?.toString()) {
      console.log('⏭️ Игнорируем собственное сообщение');
      return;
    }

    try {
      console.log('✅ Обрабатываем сообщение...');
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
    console.log('❌ Недостаточно данных для обработки');
    return;
  }

  console.log(`📨 Новое сообщение от ${telegramId}: ${userMessage}`);

  try {
    // Получаем или создаем пользователя
    const user = await getOrCreateUser(telegramId);
    console.log(`✅ Пользователь: ${user.id}`);
    
    // Сохраняем сообщение пользователя
    await saveMessage(user.id, 'user', userMessage, 'web3grow');
    console.log('✅ Сообщение сохранено');

    // Показываем "печатает..."
    console.log('⌨️ Показываем "печатает..."');
    await client.sendMessage(chatId, { message: '...' });

    // Получаем контекст пользователя
    const context = await getUserContext(user.id);
    console.log(`📝 Контекст: ${context.length} сообщений`);

    // Вызываем AI API
    console.log('🤖 Вызываем AI API...');
    const aiResponse = await callAI(userMessage, context);
    console.log(`🤖 AI ответ: ${aiResponse}`);

    // Сохраняем ответ AI
    await saveMessage(user.id, 'assistant', aiResponse, 'web3grow');
    console.log('✅ AI ответ сохранен');

    // Отправляем ответ
    console.log('📤 Отправляем ответ...');
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
    console.log(`🔍 Ищем пользователя с telegram_id: ${telegramId}`);
    
    // Проверяем существующего пользователя
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Ошибка поиска пользователя:', selectError);
    }

    if (existingUser) {
      console.log('✅ Пользователь найден:', existingUser.id);
      return existingUser;
    }

    console.log('🆕 Создаем нового пользователя...');
    // Создаем нового пользователя
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ telegram_id: telegramId }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Ошибка создания пользователя:', insertError);
      throw insertError;
    }
    
    console.log('✅ Новый пользователь создан:', newUser.id);
    return newUser;
  } catch (error) {
    console.error('❌ Ошибка работы с пользователем:', error);
    // Возвращаем временного пользователя
    return { id: 'temp-' + telegramId };
  }
}

async function saveMessage(userId, role, content, source) {
  try {
    console.log(`💾 Сохраняем сообщение: ${role} -> ${source}`);
    
    const { error } = await supabase
      .from('messages')
      .insert([{
        user_id: userId,
        role,
        content,
        source
      }]);

    if (error) {
      console.error('❌ Ошибка сохранения сообщения:', error);
      throw error;
    }
    
    console.log('✅ Сообщение сохранено в БД');
  } catch (error) {
    console.error('❌ Ошибка сохранения сообщения:', error);
  }
}

async function getUserContext(userId) {
  try {
    console.log(`📚 Получаем контекст для пользователя: ${userId}`);
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Ошибка получения контекста:', error);
      return [];
    }

    console.log(`📝 Получено ${messages?.length || 0} сообщений контекста`);
    return messages || [];
  } catch (error) {
    console.error('❌ Ошибка получения контекста:', error);
    return [];
  }
}

async function callAI(message, context) {
  try {
    console.log('🤖 Отправляем запрос к AI API...');
    console.log('📝 Сообщение:', message);
    console.log('📚 Контекст:', context.length, 'сообщений');
    
    const response = await axios.post('http://localhost:3000/api/ai', {
      message,
      context,
      source: 'web3grow'
    }, {
      timeout: 10000 // 10 секунд таймаут
    });

    console.log('✅ AI API ответ получен');
    return response.data.response;
  } catch (error) {
    console.error('❌ AI API ошибка:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Сервер не запущен. Запустите: npm run dev');
    }
    return 'Извините, AI временно недоступен. Попробуйте позже.';
  }
}

async function start() {
  try {
    console.log('🚀 Запуск упрощенной отладочной интеграции с @web3grow...');
    
    // Подключаемся к Telegram
    await client.start();
    console.log('✅ Подключение к Telegram установлено');
    
    // Получаем информацию о себе
    const me = await client.getMe();
    console.log('👤 Информация о пользователе:');
    console.log('ID:', me.id);
    console.log('Username:', me.username);
    console.log('First Name:', me.firstName);
    console.log('Last Name:', me.lastName);
    
    // Настраиваем обработчики
    await setupEventHandlers();
    
    console.log('');
    console.log('✅ @web3grow упрощенная отладочная интеграция активна!');
    console.log('📱 Отправьте сообщение @web3grow для тестирования');
    console.log('🔍 Все события будут логироваться в консоль');
    
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