// Улучшенная интеграция @spor3z с правильной обработкой заказов
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

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

// Базовый URL для API - используем переменную окружения или production URL
const BASE_API_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_API_URL || 'https://ai.spor3s.ru';
console.log('API_URL:', BASE_API_URL);

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

// Функция для вызова AI API с интеллектуальным fallback
async function callAI(message, context, userId) {
  try {
    console.log('🤖 Вызываем AI API:', `${BASE_API_URL}/api/ai`);
    console.log('📝 Сообщение:', message);
    console.log('👤 User ID:', userId);
    console.log('📋 Контекст:', context.length, 'сообщений');
    
    const requestData = {
      message: message,
      context: Array.isArray(context) ? context : [],
      source: 'spor3z',
      user_id: userId,
      telegram_id: userId.toString()
    };
    
    console.log('📤 Отправляем данные:', JSON.stringify(requestData, null, 2));
    
    const response = await axios.post(`${BASE_API_URL}/api/ai`, requestData, {
      timeout: 60000, // Увеличиваем timeout до 60 секунд
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'spor3z-bot/1.0',
        'Connection': 'keep-alive'
      },
      validateStatus: () => true // Принимаем любые статусы для обработки
    });

    console.log('📊 Статус ответа:', response.status);
    console.log('📥 Ответ API:', JSON.stringify(response.data).substring(0, 200));
    
    if (response.status !== 200) {
      console.log('❌ API вернул ошибку:', response.status);
      throw new Error(`API вернул статус ${response.status}`);
    }
    
    const aiResponse = response.data?.response || response.data?.reply || response.data?.message;
    
    if (!aiResponse || aiResponse.trim().length === 0) {
      console.log('⚠️ Пустой ответ от API, используем fallback');
      return generateIntelligentFallback(message, context);
    }
    
    console.log('✅ AI ответ получен:', aiResponse.substring(0, 100) + '...');
    
    return aiResponse;
  } catch (error) {
    console.log('❌ Ошибка AI API:', error.message);
    console.log('❌ Код ошибки:', error.code);
    if (error.response) {
      console.log('📊 Статус ошибки:', error.response.status);
      console.log('📥 Данные ошибки:', JSON.stringify(error.response.data).substring(0, 200));
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      console.log('⚠️ API недоступен, используем fallback');
    }
    // Используем интеллектуальный fallback
    const fallbackResponse = generateIntelligentFallback(message, context);
    console.log('✅ Fallback ответ сгенерирован:', fallbackResponse.substring(0, 100) + '...');
    return fallbackResponse;
  }
}

// Интеллектуальный fallback для spor3z агента
function generateIntelligentFallback(message, context) {
  const lastMessage = message.toLowerCase();
  
  console.log('[spor3z] Генерируем интеллектуальный fallback ответ');
  console.log('[spor3z] Последнее сообщение:', lastMessage);
  
  // Анализируем намерение пользователя
  if (lastMessage.includes('ежовик') || lastMessage.includes('память') || lastMessage.includes('концентрация')) {
    return `Отлично! Я spor3z, твой персональный AI-ассистент. Ежовик гребенчатый отлично помогает с памятью, концентрацией и обучением.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 120 капсул на месяц за 1100₽)
• Порошок (быстрее эффект, 100г на месяц за 1100₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
  }
  
  if (lastMessage.includes('мухомор') || lastMessage.includes('сон') || lastMessage.includes('стресс')) {
    return `Отлично! Я spor3z, твой персональный AI-ассистент. Мухомор красный отлично помогает со сном, стрессом и тревожностью.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 60 капсул на месяц за 1400₽)
• Порошок (быстрее эффект, 30г на месяц за 1400₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
  }
  
  if (lastMessage.includes('кордицепс') || lastMessage.includes('энергия') || lastMessage.includes('выносливость')) {
    return `Отлично! Я spor3z, твой персональный AI-ассистент. Кордицепс китайский отлично помогает с энергией, выносливостью и спортивными результатами.

В какой форме предпочитаете:
• Порошок (50г на месяц за 800₽)
• Порошок (150г на 3 месяца за 2000₽)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
  }
  
  if (lastMessage.includes('цистозира') || lastMessage.includes('щитовидка') || lastMessage.includes('йод')) {
    return `Отлично! Я spor3z, твой персональный AI-ассистент. Цистозира отлично помогает с щитовидной железой и гормональной системой.

В какой форме предпочитаете:
• Порошок (30г на месяц за 500₽)
• Порошок (90г на 3 месяца за 1350₽)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
  }
  
  if (lastMessage.includes('комплекс') || lastMessage.includes('4 в 1') || lastMessage.includes('все вместе')) {
    return `Отлично! Я spor3z, твой персональный AI-ассистент. Комплекс 4 в 1 включает все основные добавки для максимального эффекта.

Варианты:
• 4 в 1 (месяц) - 3300₽
• 4 в 1 (3 месяца) - 9000₽

Включает: Ежовик + Мухомор + Кордицепс + Цистозира

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
  }
  
  if (lastMessage.includes('порошок') || lastMessage.includes('капсулы')) {
    // Пользователь уточняет форму - продолжаем диалог
    return `Отлично! ${lastMessage.includes('порошок') ? 'Порошок' : 'Капсулы'} - хороший выбор!

Теперь уточните срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
  }
  
  if (lastMessage.includes('месяц') || lastMessage.includes('3 месяца') || lastMessage.includes('6 месяцев')) {
    // Пользователь выбрал срок - предлагаем оформить
    return `Отлично! Вы выбрали ${lastMessage.includes('3 месяца') ? '3 месяца' : lastMessage.includes('6 месяцев') ? '6 месяцев' : 'месяц'}.

Теперь добавлю в корзину и вы сможете оформить заказ!

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
  }
  
  // Общий ответ для неопределенных запросов
  return `Привет! Я spor3z, твой персональный AI-ассистент по грибным добавкам SPOR3S.

Помогу подобрать добавки для ваших целей:

🧠 **Память и концентрация** → Ежовик
😴 **Сон и стресс** → Мухомор  
⚡ **Энергия и выносливость** → Кордицепс
🦋 **Щитовидная железа** → Цистозира
🎯 **Все вместе** → Комплекс 4 в 1

Что вас интересует? Расскажите о ваших целях, и я подберу оптимальный вариант!

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
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

    // Формируем контекст в правильном формате для API
    const context = [];
    
    if (messages && messages.length > 0) {
      // Преобразуем сообщения в формат {role, content}
      messages.reverse().forEach(msg => {
        if (msg.role && msg.content) {
          context.push({
            role: msg.role,
            content: msg.content
      });
    }
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
    
    // Проверяем, что сообщение существует и содержит текст
    if (!message || !message.message || !message.message.trim()) {
      console.log('⚠️ Пустое сообщение, пропускаем');
      return;
    }
    
    const sender = await message.getSender();
    
    if (!sender || sender.isSelf) {
      console.log('⚠️ Сообщение от бота или без отправителя, пропускаем');
      return; // Игнорируем собственные сообщения
    }

    const telegramId = sender.id?.toString();
    if (!telegramId) {
      console.log('⚠️ Не удалось получить telegram_id отправителя');
      return;
    }

    console.log(`📱 Новое сообщение от ${sender.firstName || sender.username || telegramId}: ${message.message}`);

    // Получаем или создаем пользователя
    const user = await getOrCreateUser(telegramId);
    console.log('✅ Пользователь получен:', user.id, 'telegram_id:', user.telegram_id);
    
    // Если user.id временный (temp-*), используем telegram_id для API
    const userIdForAPI = user.id.startsWith('temp-') ? null : user.id;

    // Сохраняем сообщение пользователя (пропускаем ошибки)
    if (!user.id.startsWith('temp-')) {
    try {
      await saveMessage(user.id, 'user', message.message, 'spor3z');
        console.log('✅ Сообщение пользователя сохранено');
    } catch (error) {
        console.log('⚠️ Не удалось сохранить сообщение пользователя:', error.message);
      }
    }

    // Получаем контекст пользователя (пропускаем ошибки)
    let context = [];
    if (!user.id.startsWith('temp-')) {
    try {
      context = await getUserContext(user.id);
        console.log('✅ Контекст получен:', context.length, 'сообщений');
    } catch (error) {
        console.log('⚠️ Не удалось получить контекст пользователя:', error.message);
      }
    }

    // Вызываем AI API
    console.log('🤖 Вызываем AI API...');
    console.log('📝 Сообщение пользователя:', message.message);
    console.log('👤 User ID для API:', userIdForAPI || 'null (используем telegram_id)');
    console.log('📋 Контекст:', context.length, 'сообщений');
    
    const aiResponse = await callAI(message.message, context, userIdForAPI || telegramId);
    
    console.log('✅ AI ответ получен:', aiResponse.substring(0, 100) + '...');

    // Сохраняем ответ AI (пропускаем ошибки)
    if (!user.id.startsWith('temp-')) {
    try {
      await saveMessage(user.id, 'assistant', aiResponse, 'spor3z');
        console.log('✅ Ответ AI сохранен');
    } catch (error) {
        console.log('⚠️ Не удалось сохранить ответ AI:', error.message);
      }
    }

    // Отправляем ответ
    try {
    await message.reply({
      message: aiResponse
    });
      console.log('✅ Ответ отправлен пользователю');
    } catch (error) {
      console.log('❌ Ошибка отправки ответа:', error.message);
      // Пробуем отправить напрямую
      try {
        await client.sendMessage(message.chatId, { message: aiResponse });
        console.log('✅ Ответ отправлен напрямую');
      } catch (sendError) {
        console.log('❌ Критическая ошибка отправки:', sendError.message);
      }
    }

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
