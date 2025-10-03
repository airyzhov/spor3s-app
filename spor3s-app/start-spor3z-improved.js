// Улучшенная интеграция @spor3z с правильной обработкой заказов
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

console.log('🤖 УЛУЧШЕННАЯ ИНТЕГРАЦИЯ @SPOR3Z');
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
console.log('SUPABASE_KEY:', SUPABASE_KEY ? '✅' : '❌');

if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.log('❌ Отсутствуют необходимые переменные окружения');
  process.exit(1);
}

// Создаем клиенты
const client = new TelegramClient(new StringSession(SESSION_STRING), parseInt(API_ID), API_HASH, {
  connectionRetries: 5,
  deviceModel: 'Spor3z Bot',
  systemVersion: '1.0.0',
  appVersion: '1.0.0',
  langCode: 'ru'
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Функция для сохранения сообщений с поддержкой source
async function saveMessage(userId, role, content, source = 'spor3z') {
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        role: role,
        content: content,
        source: source,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.log('❌ Ошибка сохранения сообщения:', error);
    } else {
      console.log('✅ Сообщение сохранено (source:', source + ')');
    }
  } catch (error) {
    console.log('❌ Ошибка сохранения:', error.message);
  }
}

// Функция для получения или создания пользователя
async function getOrCreateUser(telegramId) {
  try {
    // Ищем пользователя по telegram_id
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId.toString())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.log('❌ Ошибка поиска пользователя:', error);
      // Fallback: создаем временного пользователя
      return { id: `temp-${telegramId}`, telegram_id: telegramId.toString() };
    }

    if (!user) {
      // Создаем нового пользователя
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId.toString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Ошибка создания пользователя:', createError);
        // Fallback: создаем временного пользователя
        return { id: `temp-${telegramId}`, telegram_id: telegramId.toString() };
      }

      user = newUser;
      console.log('✅ Создан новый пользователь:', user.id);
    }

    return user;
  } catch (error) {
    console.log('❌ Ошибка getOrCreateUser:', error.message);
    // Fallback: создаем временного пользователя
    return { id: `temp-${telegramId}`, telegram_id: telegramId.toString() };
  }
}

// Функция для вызова AI API с ngrok заголовками
async function callAI(message, context, userId) {
  try {
    const baseUrl = 'http://localhost:3000';
    const response = await axios.post(`${baseUrl}/api/test-api`, {
      message: message,
      context: context,
      source: 'spor3z',
      user_id: userId,
      telegram_id: userId
    }, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'spor3z-bot/1.0'
      }
    });

    console.log('✅ AI API ответ получен');
    return response.data.response || response.data.reply || 'Извините, не удалось получить ответ.';
  } catch (error) {
    console.log('❌ Ошибка AI API:', error.message);
    if (error.response) {
      console.log('Детали ошибки:', error.response.data);
    }
    return 'Извините, произошла ошибка при обращении к ИИ. Попробуйте позже.';
  }
}

// Функция для получения контекста пользователя
async function getUserContext(userId) {
  try {
    // Получаем последние сообщения
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.log('❌ Ошибка получения сообщений:', messagesError);
      return [];
    }

    // Получаем заказы пользователя
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) {
      console.log('❌ Ошибка получения заказов:', ordersError);
    }

    // Формируем контекст
    const context = [];
    
    if (messages && messages.length > 0) {
      context.push('Последние сообщения:');
      messages.reverse().forEach(msg => {
        context.push(`${msg.role}: ${msg.content}`);
      });
    }

    if (orders && orders.length > 0) {
      context.push('Последние заказы:');
      orders.forEach(order => {
        context.push(`Заказ ${order.id}: ${order.products} - ${order.status}`);
      });
    }

    return context;
  } catch (error) {
    console.log('❌ Ошибка получения контекста:', error.message);
    return [];
  }
}

// Обработчик новых сообщений
async function handleNewMessage(event) {
  try {
    const message = event.message;
    const sender = await message.getSender();
    
    if (!sender || sender.isSelf) {
      return; // Игнорируем собственные сообщения
    }

    console.log(`📱 Новое сообщение от ${sender.firstName || sender.username}: ${message.message}`);

    // Получаем или создаем пользователя
    const user = await getOrCreateUser(sender.id);
    console.log('✅ Пользователь получен:', user.id);

    // Сохраняем сообщение пользователя (пропускаем ошибки)
    try {
      await saveMessage(user.id, 'user', message.message, 'spor3z');
    } catch (error) {
      console.log('⚠️ Не удалось сохранить сообщение пользователя');
    }

    // Получаем контекст пользователя (пропускаем ошибки)
    let context = [];
    try {
      context = await getUserContext(user.id);
    } catch (error) {
      console.log('⚠️ Не удалось получить контекст пользователя');
    }

    // Вызываем AI API
    console.log('🤖 Вызываем AI API...');
    const aiResponse = await callAI(message.message, context, user.id);

    // Сохраняем ответ AI (пропускаем ошибки)
    try {
      await saveMessage(user.id, 'assistant', aiResponse, 'spor3z');
    } catch (error) {
      console.log('⚠️ Не удалось сохранить ответ AI');
    }

    // Отправляем ответ
    await message.reply({
      message: aiResponse
    });

    console.log('✅ Ответ отправлен');

  } catch (error) {
    console.log('❌ Ошибка обработки сообщения:', error.message);
    
    // Отправляем сообщение об ошибке
    try {
      await event.message.reply({
        message: 'Извините, произошла ошибка. Попробуйте позже или обратитесь в поддержку.'
      });
    } catch (replyError) {
      console.log('❌ Ошибка отправки сообщения об ошибке:', replyError.message);
    }
  }
}

// Запуск интеграции
async function startIntegration() {
  try {
    console.log('🚀 Запуск интеграции...');
    
    await client.start();
    console.log('✅ Telegram клиент подключен');

    // Подписываемся на новые сообщения
    client.addEventHandler(handleNewMessage, new NewMessage({}));
    console.log('✅ Обработчик сообщений добавлен');

    console.log('🎉 @spor3z интеграция активна и готова к работе!');
    console.log('📱 Отправьте сообщение @spor3z для тестирования');

    // Держим процесс активным
    process.on('SIGINT', async () => {
      console.log('🛑 Остановка интеграции...');
      await client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.log('❌ Ошибка запуска интеграции:', error.message);
    process.exit(1);
  }
}

// Запускаем интеграцию
startIntegration().catch(console.error);
