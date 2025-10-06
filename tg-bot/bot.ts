import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
);

// Функция для получения или создания пользователя
async function getOrCreateUser(telegramId: string, userInfo?: any) {
  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('id, name')
    .eq('telegram_id', telegramId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Создаем нового пользователя
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([{ 
      telegram_id: telegramId, 
      name: userInfo?.first_name || userInfo?.username || 'User' 
    }])
    .select('id, name')
    .single();

  if (insertError) {
    throw new Error(`Error creating user: ${insertError.message}`);
  }

  return newUser;
}

// Функция для сохранения сообщения в базу
async function saveMessage(userId: string, content: string, role: 'user' | 'assistant' = 'user') {
  const { error } = await supabase
    .from('messages')
    .insert([{
      user_id: userId,
      role,
      content,
      created_at: new Date().toISOString()
    }]);

  if (error) {
    console.error('Error saving message:', error);
  }
}

// Функция для вызова ИИ API
async function callAI(message: string, context: any[], userId: string, telegramId?: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
        source: 'telegram_bot',
        user_id: userId,
        telegram_id: telegramId
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}. ${text}`);
    }

    const data: any = await response.json().catch(() => ({}));
    return data.response || data.reply || 'Извините, не удалось получить ответ от ИИ.';
  } catch (error: unknown) {
    console.error('AI API error:', error);
    return 'Извините, произошла ошибка при обращении к ИИ. Попробуйте позже.';
  }
}

// Генерация корректной deep-link для Mini App
async function buildMiniAppLink(telegramId: string): Promise<string> {
  const botUsername = process.env.BOT_USERNAME || 'spor3s_bot';
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
  try {
    const resp = await fetch(`${baseUrl}/api/generate-auth-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId })
    });
    if (resp.ok) {
      const data: any = await resp.json();
      if (data?.auth_code) {
        return `https://t.me/${botUsername}?startapp=${encodeURIComponent(data.auth_code)}`;
      }
    }
  } catch {}
  return `https://t.me/${botUsername}`;
}

// Функция для создания заказа
async function createOrder(userId: string, orderData: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/order-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        ...orderData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка создания заказа');
    }

    const data: any = await response.json();
    return data;
  } catch (error: any) {
    console.error('Order API error:', error);
    throw error;
  }
}

// Функция для отправки уведомления менеджеру
async function notifyManager(orderData: any, userInfo: any) {
  const managerChatId = process.env.MANAGER_CHAT_ID;
  if (!managerChatId) {
    console.log('MANAGER_CHAT_ID not set, skipping notification');
    return;
  }

  try {
    const message = `🆕 НОВЫЙ ЗАКАЗ ЧЕРЕЗ БОТА!

👤 Пользователь: ${userInfo.first_name} ${userInfo.last_name || ''} (@${userInfo.username || 'без username'})
🆔 Telegram ID: ${userInfo.id}

📦 Товары: ${JSON.stringify(orderData.items)}
💰 Сумма: ${orderData.total}₽
📍 Адрес: ${orderData.address}
📞 Телефон: ${orderData.phone}
👤 ФИО: ${orderData.fio}
💬 Комментарий: ${orderData.comment || 'нет'}

🕐 Время: ${new Date().toLocaleString('ru-RU')}`;

    await bot.telegram.sendMessage(managerChatId, message);
  } catch (error: unknown) {
    console.error('Error notifying manager:', error);
  }
}

// Функция для проверки YouTube подписки
async function verifyYouTubeSubscription(userId: string, channelId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/subscribe-bonus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        channel_type: 'youtube'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка проверки подписки');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('YouTube verification error:', error);
    throw error;
  }
}

// /start <auth_code> - привязка аккаунта
bot.start(async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length === 2) {
    const auth_code = parts[1];
    try {
    // 1. Найти auth_code в tg_link_codes
    const { data: link } = await supabase
      .from('tg_link_codes')
      .select('user_id, telegram_id, expires_at')
      .eq('auth_code', auth_code)
      .single();

    if (!link) {
      return ctx.reply('❌ Код не найден или истёк.');
    }

    if (new Date(link.expires_at) < new Date()) {
      return ctx.reply('❌ Код истёк.');
    }

    // 2. Привязать telegram_id к users
    const { error: updateError } = await supabase
      .from('users')
      .update({ telegram_id: ctx.from.id.toString() })
      .eq('id', link.user_id);

    if (updateError) {
      return ctx.reply('❌ Ошибка привязки: ' + updateError.message);
    }

      ctx.reply('✅ Привязка успешна! Теперь вы можете общаться с ИИ агентом spor3s.');
    } catch (error) {
      ctx.reply('❌ Ошибка привязки: ' + error.message);
    }
  } else {
    ctx.reply('Привет! Для привязки аккаунта отправьте: /start <код>\n\nИли просто напишите мне, и я помогу с выбором грибных добавок! 🍄');
  }
});

// /verify_youtube @spor3s - проверка YouTube подписки
bot.command('verify_youtube', async (ctx) => {
  try {
    const telegram_id = ctx.from.id.toString();
    const user = await getOrCreateUser(telegram_id, ctx.from);
    
    // Проверяем, получал ли пользователь уже бонус за YouTube
    const { data: existingBonus } = await supabase
      .from('coin_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'subscribe_youtube')
      .single();

    if (existingBonus) {
      return ctx.reply('✅ Вы уже получили бонус за подписку на YouTube канал! +50 SC');
    }

    // Отправляем инструкции для проверки
    const instructions = `📺 Проверка подписки на YouTube канал @spor3s

🔍 Для подтверждения подписки:

1️⃣ Перейдите на канал: https://www.youtube.com/@spor3s
2️⃣ Убедитесь, что вы подписаны на канал
3️⃣ Отправьте скриншот подписки в этот чат

📸 Скриншот должен показывать:
• Название канала @spor3s
• Кнопку "Подписка" (должна быть активна)
• Или статус "Вы подписаны"

💰 После подтверждения вы получите: +50 SC

⚠️ Внимание: Проверка выполняется вручную модератором в течение 24 часов.`;

    await ctx.reply(instructions);

    // Сохраняем состояние ожидания скриншота
    await supabase
      .from('youtube_verification_requests')
      .insert([{
        user_id: user.id,
        telegram_id: telegram_id,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);

  } catch (error: any) {
    console.error('Error in verify_youtube command:', error);
    ctx.reply('❌ Ошибка проверки подписки: ' + error.message);
  }
});

// Обработка фото для проверки YouTube подписки
bot.on('photo', async (ctx) => {
  try {
    const telegram_id = ctx.from.id.toString();
    const user = await getOrCreateUser(telegram_id, ctx.from);

    // Проверяем, есть ли активная заявка на верификацию
    const { data: verificationRequest } = await supabase
      .from('youtube_verification_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!verificationRequest) {
      return ctx.reply('❌ Сначала отправьте команду /verify_youtube @spor3s для начала проверки.');
    }

    // Получаем фото
    const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Самое большое фото
    const file = await bot.telegram.getFile(photo.file_id);
    const photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    // Обновляем заявку с URL фото
    await supabase
      .from('youtube_verification_requests')
      .update({
        screenshot_url: photoUrl,
        status: 'screenshot_received',
        updated_at: new Date().toISOString()
      })
      .eq('id', verificationRequest.id);

    // Уведомляем менеджера о новой заявке
    const managerChatId = process.env.MANAGER_CHAT_ID;
    if (managerChatId) {
      const managerMessage = `📸 НОВАЯ ЗАЯВКА НА ПРОВЕРКУ YOUTUBE ПОДПИСКИ!

👤 Пользователь: ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'без username'})
🆔 Telegram ID: ${ctx.from.id}
🆔 User ID: ${user.id}

📸 Скриншот: ${photoUrl}

✅ Для подтверждения: /approve_youtube ${user.id}
❌ Для отклонения: /reject_youtube ${user.id}

🕐 Время: ${new Date().toLocaleString('ru-RU')}`;

      await bot.telegram.sendMessage(managerChatId, managerMessage);
    }

    await ctx.reply('📸 Скриншот получен! Модератор проверит вашу подписку в течение 24 часов. Вы получите уведомление о результате.');

  } catch (error: any) {
    console.error('Error processing photo:', error);
    ctx.reply('❌ Ошибка обработки скриншота. Попробуйте еще раз.');
  }
});

// Команды для модератора
bot.command('approve_youtube', async (ctx) => {
  try {
    const parts = ctx.message.text.split(' ');
    if (parts.length !== 2) {
      return ctx.reply('❌ Использование: /approve_youtube <user_id>');
    }

    const userId = parts[1];
    const managerChatId = process.env.MANAGER_CHAT_ID;

    // Проверяем, что команда от модератора
    if (ctx.from.id.toString() !== managerChatId) {
      return ctx.reply('❌ У вас нет прав для выполнения этой команды.');
    }

    // Начисляем бонус
    const result = await verifyYouTubeSubscription(userId, '@spor3s');

    // Обновляем статус заявки
    await supabase
      .from('youtube_verification_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: ctx.from.id.toString()
      })
      .eq('user_id', userId)
      .eq('status', 'screenshot_received');

    // Уведомляем пользователя
    const { data: user } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('id', userId)
      .single();

    if (user?.telegram_id) {
      await bot.telegram.sendMessage(user.telegram_id, 
        '✅ Ваша подписка на YouTube канал @spor3s подтверждена!\n\n💰 Начислено: +50 SC\n\nСпасибо за подписку! 🍄'
      );
    }

    await ctx.reply(`✅ Бонус начислен пользователю ${userId}! +50 SC`);

  } catch (error: any) {
    console.error('Error approving YouTube subscription:', error);
    ctx.reply('❌ Ошибка подтверждения: ' + error.message);
  }
});

bot.command('reject_youtube', async (ctx) => {
  try {
    const parts = ctx.message.text.split(' ');
    if (parts.length !== 2) {
      return ctx.reply('❌ Использование: /reject_youtube <user_id>');
    }

    const userId = parts[1];
    const managerChatId = process.env.MANAGER_CHAT_ID;

    // Проверяем, что команда от модератора
    if (ctx.from.id.toString() !== managerChatId) {
      return ctx.reply('❌ У вас нет прав для выполнения этой команды.');
    }

    // Обновляем статус заявки
    await supabase
      .from('youtube_verification_requests')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: ctx.from.id.toString()
      })
      .eq('user_id', userId)
      .eq('status', 'screenshot_received');

    // Уведомляем пользователя
    const { data: user } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('id', userId)
      .single();

    if (user?.telegram_id) {
      await bot.telegram.sendMessage(user.telegram_id, 
        '❌ Ваша заявка на проверку YouTube подписки отклонена.\n\n📺 Убедитесь, что вы подписаны на канал @spor3s и отправьте новый скриншот командой /verify_youtube @spor3s'
      );
    }

    await ctx.reply(`❌ Заявка пользователя ${userId} отклонена.`);

  } catch (error: unknown) {
    console.error('Error rejecting YouTube subscription:', error);
    ctx.reply('❌ Ошибка отклонения: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
  }
});

// /my_coins — баланс пользователя
bot.command('my_coins', async (ctx) => {
  try {
  const telegram_id = ctx.from.id.toString();
    const user = await getOrCreateUser(telegram_id, ctx.from);
    
    // Получаем баланс SC
    const { data: userLevel } = await supabase
      .from('user_levels')
      .select('current_sc_balance, current_level')
      .eq('user_id', user.id)
    .single();

    const balance = userLevel?.current_sc_balance || 0;
    const level = userLevel?.current_level || '🌱 Новичок';

    ctx.reply(`💰 Ваш баланс Spor3s Coins: ${balance} SC\n🏆 Уровень: ${level}`);
  } catch (error: any) {
    ctx.reply('❌ Ошибка получения баланса: ' + error.message);
  }
});

// /help — справка
bot.command('help', async (ctx) => {
  const helpText = `🤖 Добро пожаловать в spor3s AI Assistant!

🍄 Я помогу вам выбрать грибные добавки:
• Ежовик — для памяти и концентрации
• Мухомор — для сна и снятия стресса  
• Кордицепс — для энергии
• Курс 4 в 1 — комплексное решение

💬 Просто напишите мне, что вас беспокоит, и я порекомендую подходящие продукты!

📋 Доступные команды:
/my_coins — проверить баланс SC
/verify_youtube @spor3s — проверить подписку на YouTube (+50 SC)
/help — показать эту справку
/start <код> — привязать аккаунт

🛒 Можете оформить заказ прямо в чате!`;

  ctx.reply(helpText);
});

// Обработка всех текстовых сообщений
bot.on('text', async (ctx) => {
  try {
    const telegram_id = ctx.from.id.toString();
    const user = await getOrCreateUser(telegram_id, ctx.from);
    const userMessage = ctx.message.text;

    // Сохраняем сообщение пользователя
    await saveMessage(user.id, userMessage, 'user');

    // Показываем "печатает..."
    await ctx.replyWithChatAction('typing');

    // Получаем историю сообщений пользователя
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Формируем контекст для ИИ
    const messages = recentMessages?.reverse().map(msg => ({
      role: 'user',
      content: msg.content
    })) || [];

    // Добавляем текущее сообщение
    messages.push({ role: 'user', content: userMessage });

    // Вызываем ИИ с текущим сообщением и контекстом
    const aiResponse = await callAI(userMessage, messages, user.id, telegram_id);

    // Сохраняем ответ ИИ
    await saveMessage(user.id, aiResponse, 'assistant');

    // Проверяем, содержит ли ответ команды для заказа
    if (aiResponse.includes('[order_now:') || aiResponse.includes('заказ') || aiResponse.includes('оформить')) {
      // Добавляем кнопку для оформления заказа
      const appLink = await buildMiniAppLink(telegram_id);
      const keyboard = {
        inline_keyboard: [[
          { text: '🛒 Открыть магазин', url: appLink }
        ]]
      };
      await ctx.reply(aiResponse, { reply_markup: keyboard });
    } else {
      const appLink = await buildMiniAppLink(telegram_id);
      await ctx.reply(`${aiResponse}\n\nОформить в Mini App: ${appLink}`);
    }

  } catch (error: any) {
    console.error('Error processing message:', error);
    ctx.reply('Извините, произошла ошибка. Попробуйте позже.');
  }
});

// Обработка callback запросов
bot.action('create_order', async (ctx) => {
  try {
    const telegram_id = ctx.from.id.toString();
    const user = await getOrCreateUser(telegram_id, ctx.from);

    // Создаем форму заказа
    const orderForm = {
      inline_keyboard: [
        [{ text: '📝 Заполнить данные заказа', callback_data: 'order_form' }],
        [{ text: '❌ Отмена', callback_data: 'cancel_order' }]
      ]
    };

    await ctx.editMessageText('🛒 Для оформления заказа нужно заполнить данные. Нажмите кнопку ниже:', {
      reply_markup: orderForm
    });

  } catch (error: any) {
    console.error('Error creating order form:', error);
    ctx.answerCbQuery('Ошибка создания формы заказа');
  }
});

bot.action('order_form', async (ctx) => {
  try {
    // Здесь можно реализовать интерактивную форму заказа
    // Пока что отправляем инструкцию
    await ctx.editMessageText(`📝 Для оформления заказа напишите мне в следующем формате:

ЗАКАЗ:
Товары: [список товаров]
Сумма: [сумма в рублях]
ФИО: [ваше имя]
Телефон: [ваш телефон]
Адрес: [адрес доставки]
Комментарий: [дополнительная информация]

Пример:
ЗАКАЗ:
Товары: Ежовик 100г, Мухомор 30г
Сумма: 2500
ФИО: Иванов Иван
Телефон: +7 999 123-45-67
Адрес: г. Москва, ул. Примерная, д. 1, кв. 1
Комментарий: Доставка до 18:00`);

  } catch (error: unknown) {
    console.error('Error showing order form:', error);
    ctx.answerCbQuery('Ошибка показа формы заказа');
  }
});

bot.action('cancel_order', async (ctx) => {
  try {
    await ctx.editMessageText('❌ Оформление заказа отменено. Можете продолжить общение с ИИ!');
  } catch (error: unknown) {
    console.error('Error canceling order:', error);
  }
});

// Обработка команды заказа
bot.hears(/ЗАКАЗ:/i, async (ctx) => {
  try {
    const telegram_id = ctx.from.id.toString();
    const user = await getOrCreateUser(telegram_id, ctx.from);
    const orderText = ctx.message.text;

    // Парсим данные заказа
    const orderData = parseOrderData(orderText);
    
    if (!orderData) {
      return ctx.reply('❌ Неверный формат заказа. Используйте формат:\n\nЗАКАЗ:\nТовары: ...\nСумма: ...\nФИО: ...\nТелефон: ...\nАдрес: ...');
    }

    // Создаем заказ
    const orderResult: any = await createOrder(user.id, orderData);

    // Уведомляем менеджера
    await notifyManager(orderResult.order, ctx.from);

    // Отправляем подтверждение пользователю
    await ctx.reply(`✅ Заказ успешно создан!

📦 Номер заказа: #${orderResult.order.id}
💰 Сумма: ${orderResult.order.total}₽
📞 Менеджер свяжется с вами в ближайшее время.

Спасибо за заказ! 🍄`);

  } catch (error: unknown) {
    console.error('Error processing order:', error);
    ctx.reply(`❌ Ошибка создания заказа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
});

// Функция для парсинга данных заказа
function parseOrderData(orderText: string) {
  try {
    const lines = orderText.split('\n');
    const orderData: any = {};

    for (const line of lines) {
      if (line.includes('Товары:')) {
        orderData.items = line.split('Товары:')[1].trim();
      } else if (line.includes('Сумма:')) {
        orderData.total = parseInt(line.split('Сумма:')[1].trim());
      } else if (line.includes('ФИО:')) {
        orderData.fio = line.split('ФИО:')[1].trim();
      } else if (line.includes('Телефон:')) {
        orderData.phone = line.split('Телефон:')[1].trim();
      } else if (line.includes('Адрес:')) {
        orderData.address = line.split('Адрес:')[1].trim();
      } else if (line.includes('Комментарий:')) {
        orderData.comment = line.split('Комментарий:')[1].trim();
      }
    }

    // Проверяем обязательные поля
    if (!orderData.items || !orderData.total || !orderData.fio || !orderData.phone || !orderData.address) {
      return null;
    }

    return orderData;
  } catch (error) {
    console.error('Error parsing order data:', error);
    return null;
  }
}

// Обработка ошибок
bot.catch((err: any, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('Произошла ошибка. Попробуйте позже.');
});

bot.launch();
console.log('🤖 Spor3s AI Bot started successfully!');

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 