import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';

// Загружаем .env и .env.local (.env.local имеет приоритет)
// __dirname в dist/ указывает на compiled код, поэтому поднимаемся на уровень выше
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });

console.log('🔧 Переменные окружения загружены');
console.log('🔍 Отладка переменных окружения:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ЕСТЬ' : 'НЕТ');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'ЕСТЬ' : 'НЕТ');

// Проверяем что ключи загружены ПЕРЕД созданием клиентов
if (!process.env.SUPABASE_URL) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: SUPABASE_URL не загружен!');
  process.exit(1);
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Telegram Bot Token не загружен!');
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Используем SERVICE_ROLE_KEY если есть, иначе ANON_KEY (с RLS политиками)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Нет ни SERVICE_ROLE_KEY ни ANON_KEY!');
  process.exit(1);
}

console.log('🔑 Используем Supabase ключ:', supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON');

const supabase = createClient(
  process.env.SUPABASE_URL,
  supabaseKey
);

// Кеш контекста в памяти (fallback если Supabase не работает)
const userContextCache = new Map<string, Array<{role: string, content: string}>>();

// Кеш для подтверждения заказа (храним данные заказа для подтверждения)
const pendingOrderCache = new Map<string, any>();

// Функция для получения или создания пользователя
async function getOrCreateUser(telegramId: string, userInfo?: any) {
  try {
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
      console.warn(`⚠️ Supabase error: ${insertError.message}, using fallback mode`);
      // Fallback: возвращаем объект с telegram_id как id
      return { id: telegramId, name: userInfo?.first_name || 'User' };
    }

    return newUser;
  } catch (error: unknown) {
    console.warn('⚠️ Supabase unavailable, using fallback mode');
    return { id: telegramId, name: userInfo?.first_name || 'User' };
  }
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

// Функция для вызова ИИ API с интеллектуальным fallback
async function callAI(message: string, context: any[], userId: string, telegramId?: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai`, {
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
      console.error('AI API error:', response.status, text);
      // Используем интеллектуальный fallback
      return generateIntelligentFallback(message, context);
    }

    const data: any = await response.json().catch(() => ({}));
    return data.response || data.reply || 'Извините, не удалось получить ответ от ИИ.';
  } catch (error: unknown) {
    console.error('AI API error:', error);
    // Используем интеллектуальный fallback
    return generateIntelligentFallback(message, context);
  }
}

// Интеллектуальный fallback для Telegram бота
function generateIntelligentFallback(message: string, context: any[]): string {
  const lastMessage = message.toLowerCase();
  
  console.log('[spor3s_bot] Генерируем интеллектуальный fallback ответ');
  console.log('[spor3s_bot] Последнее сообщение:', lastMessage);
  
  // Анализируем намерение пользователя
  if (lastMessage.includes('ежовик') || lastMessage.includes('память') || lastMessage.includes('концентрация')) {
    return `Отлично! Ежовик гребенчатый отлично помогает с памятью, концентрацией и обучением.

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
    return `Отлично! Мухомор красный отлично помогает со сном, стрессом и тревожностью.

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
    return `Отлично! Кордицепс Милитарис плодовые тела отлично помогает с энергией, выносливостью и спортивными результатами.

В какой форме предпочитаете:
• Порошок плодовые тела (50г на месяц за 800₽)
• Порошок плодовые тела (150г на 3 месяца за 2000₽)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
  }
  
  if (lastMessage.includes('цистозира') || lastMessage.includes('щитовидка') || lastMessage.includes('йод')) {
    return `Отлично! Цистозира отлично помогает с щитовидной железой и гормональной системой.

В какой форме предпочитаете:
• Порошок (30г на месяц за 500₽)
• Порошок (90г на 3 месяца за 1350₽)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
  }
  
  if (lastMessage.includes('комплекс') || lastMessage.includes('4 в 1') || lastMessage.includes('все вместе')) {
    return `Отлично! Комплекс 4 в 1 включает все основные добавки для максимального эффекта.

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
  return `Привет! Я консультант по грибным добавкам СПОРС.

Помогу подобрать добавки для ваших целей:

🧠 **Память и концентрация** → Ежовик
😴 **Сон и стресс** → Мухомор  
⚡ **Энергия и выносливость** → Кордицепс
🦋 **Щитовидная железа** → Цистозира
🎯 **Все вместе** → Комплекс 4 в 1

Что вас интересует? Расскажите о ваших целях, и я подберу оптимальный вариант!

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
}

// Генерация корректной deep-link для Mini App
async function buildMiniAppLink(telegramId: string): Promise<string> {
  const botUsername = process.env.BOT_USERNAME || 'spor3s_bot';
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
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
    console.log('[spor3s_bot] 📦 Создание заказа:', { userId, orderData });
    
    // Нормализуем формат данных заказа
    const normalizedData = {
      user_id: userId,
      items: Array.isArray(orderData.items) ? orderData.items : (orderData.items || []),
      total: orderData.total || 0,
      address: orderData.address || '',
      fio: orderData.fio || '',
      phone: orderData.phone || '',
      referral_code: orderData.referral_code || null,
      comment: orderData.comment || '',
      coins_to_use: orderData.coins_to_use || 0
    };
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/order-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[spor3s_bot] ❌ Order API error:', response.status, errorText);
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {}
      throw new Error(errorData.error || errorText || 'Ошибка создания заказа');
    }

    const data: any = await response.json();
    console.log('[spor3s_bot] ✅ Заказ создан:', data);
    return data;
  } catch (error: any) {
    console.error('[spor3s_bot] ❌ Order API error:', error);
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
    // Нормализуем данные заказа
    const items = Array.isArray(orderData.items) ? orderData.items : (orderData.items || []);
    const itemsText = items.length > 0 
      ? items.map((item: any) => `${item.name || item.id || 'Товар'} - ${item.price || 0}₽`).join('\n')
      : JSON.stringify(orderData.items);
    
    const message = `🆕 НОВЫЙ ЗАКАЗ ЧЕРЕЗ БОТА!

👤 Пользователь: ${userInfo.first_name || ''} ${userInfo.last_name || ''} (@${userInfo.username || 'без username'})
🆔 Telegram ID: ${userInfo.id}

📦 Товары:
${itemsText}
💰 Сумма: ${orderData.total || 0}₽
📍 Адрес: ${orderData.address || 'Не указан'}
📞 Телефон: ${orderData.phone || 'Не указан'}
👤 ФИО: ${orderData.fio || 'Не указано'}
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
      const errorData = await response.json() as { error?: string };
      throw new Error(errorData.error || 'Ошибка проверки подписки');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('YouTube verification error:', error);
    throw error;
  }
}

// Реферальная привязка: /start <telegram_id пригласившего>
// Ссылка вида https://t.me/Spor3s_bot?start=54993853 — друг кликает и сразу привязывается.
async function handleReferralStart(ctx: any, referrerTgId: string): Promise<void> {
  const invitedTgId = ctx.from.id.toString();
  if (referrerTgId === invitedTgId) {
    await ctx.reply('🙂 Это ваша собственная реферальная ссылка — отправьте её друзьям!');
    return;
  }

  // 1. Приглашённый: создаём/находим по telegram_id
  let { data: invited } = await supabase
    .from('users').select('id').eq('telegram_id', invitedTgId).single();
  if (!invited) {
    const { data: created } = await supabase
      .from('users')
      .insert([{ telegram_id: invitedTgId, username: ctx.from.username || null }])
      .select('id').single();
    invited = created;
  }
  if (!invited) {
    await ctx.reply('❌ Не получилось активировать ссылку, попробуйте позже.');
    return;
  }

  // 2. Пригласивший: находим (или создаём заочно — активируется при первом входе)
  let { data: referrer } = await supabase
    .from('users').select('id, username').eq('telegram_id', referrerTgId).single();
  if (!referrer) {
    const { data: created } = await supabase
      .from('users').insert([{ telegram_id: referrerTgId }]).select('id, username').single();
    referrer = created;
  }
  if (!referrer || referrer.id === invited.id) {
    await ctx.reply('❌ Ссылка недействительна.');
    return;
  }

  const openShop = Markup.inlineKeyboard([
    Markup.button.webApp('🛒 Открыть магазин', 'https://ai.spor3s.ru'),
  ]);

  // 3. Первая ссылка побеждает: если рефер уже есть — не перезаписываем
  const { data: existing } = await supabase
    .from('referrals').select('id').eq('referred_user_id', invited.id).limit(1);
  if (existing && existing.length) {
    await ctx.reply('👋 С возвращением! Пригласивший у вас уже закреплён. Выбирайте добавки в магазине 👇', openShop);
    return;
  }

  await supabase.from('referrals').insert([{
    referrer_user_id: referrer.id,
    referred_user_id: invited.id,
    status: 'pending',
    created_at: new Date().toISOString(),
  }]);

  const refName = referrer.username ? `@${referrer.username}` : 'друг';
  await ctx.reply(
    `🎁 Вас пригласил ${refName}!\n\n` +
    `За первый оплаченный заказ вы получите 100 SC (= 100 ₽ скидки на будущие покупки), ` +
    `а бонусы начисляются автоматически — ничего вводить не нужно.\n\n` +
    `Выбирайте грибные добавки 👇`,
    openShop
  );
}

// /start <auth_code> - привязка аккаунта, /start <telegram_id> - реферальная ссылка
bot.start(async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length === 2 && /^\d{5,15}$/.test(parts[1])) {
    try {
      await handleReferralStart(ctx, parts[1]);
    } catch (e: any) {
      console.error('[referral start] ошибка:', e?.message);
      ctx.reply('❌ Не получилось активировать ссылку, попробуйте позже.');
    }
    return;
  }
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
    } catch (error: any) {
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

    // Показываем "печатает..."
    await ctx.replyWithChatAction('typing');

    // Получаем контекст из кеша (приоритет - кеш, т.к. Supabase может не работать)
    let messages: Array<{role: string, content: string}> = userContextCache.get(telegram_id) || [];
    
    console.log(`[spor3s_bot] 📦 Кеш для ${telegram_id}:`, messages.length, 'сообщений');

    try {
      // Пытаемся сохранить в Supabase
      await saveMessage(user.id, userMessage, 'user');

      // Если Supabase работает, получаем историю оттуда (более надежно)
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentMessages && recentMessages.length > 0) {
        messages = recentMessages.reverse().map(msg => ({
          role: msg.role || 'user',
          content: msg.content
        }));
        console.log('[spor3s_bot] ✅ Контекст из Supabase:', messages.length);
      }
    } catch (error: unknown) {
      console.warn('⚠️ Supabase unavailable, using cache');
    }

    // Добавляем текущее сообщение пользователя
    messages.push({ role: 'user', content: userMessage });

    console.log('[spor3s_bot] Отправляем в AI контекст:', messages.length, 'сообщений');
    console.log('[spor3s_bot] Последние 3 сообщения:', messages.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 30)}...`));

    // Вызываем ИИ с полным контекстом диалога
    const aiResponse = await callAI(userMessage, messages, user.id, telegram_id);

    try {
      // Сохраняем ответ ИИ
      await saveMessage(user.id, aiResponse, 'assistant');
    } catch (error: unknown) {
      console.warn('⚠️ Failed to save message to DB');
    }

    // Обновляем кеш
    messages.push({ role: 'assistant', content: aiResponse });
    if (messages.length > 10) {
      messages = messages.slice(-10);
    }
    userContextCache.set(telegram_id, messages);

    // Извлекаем теги товаров из ответа AI
    const addToCartMatches = [...aiResponse.matchAll(/\[add_to_cart:([\w-]+)\]/g)];
    const productIds = [...new Set(addToCartMatches.map(m => m[1]))];
    
    // Определяем форму продукта из сообщений пользователя (порошок vs капсулы)
    const allMessagesText = messages.map(m => m.content).join(' ').toLowerCase();
    const userWantsPowder = /порошок|порошк|в порошке/i.test(allMessagesText);
    const userWantsCapsules = /капсул|капсул/i.test(allMessagesText);
    
    // Проверяем соответствие формы продукта
    const productFormMap: Record<string, { powder: string[], capsules: string[], name: string }> = {
      'ezh': { powder: ['ezh100', 'ezh300', 'ezh500'], capsules: ['ezh120k', 'ezh360k'], name: 'Ежовик' },
      'mhm': { powder: ['mhm30', 'mhm50', 'mhm100'], capsules: ['mhm60k', 'mhm180k'], name: 'Мухомор' },
      'kor': { powder: ['kor50', 'kor150'], capsules: [], name: 'Кордицепс' },
      'ci': { powder: ['ci30', 'ci90'], capsules: [], name: 'Цистозира' }
    };
    
    // Проверяем, есть ли товары с несколькими формами, но форма не указана
    let needsFormClarification = false;
    let clarificationProduct = null;
    
    for (const productId of productIds) {
      for (const [prefix, forms] of Object.entries(productFormMap)) {
        if (productId.startsWith(prefix)) {
          // Проверяем, есть ли у продукта обе формы
          if (forms.powder.length > 0 && forms.capsules.length > 0) {
            // Если форма не указана явно - нужно уточнение
            if (!userWantsPowder && !userWantsCapsules) {
              needsFormClarification = true;
              clarificationProduct = { prefix, name: forms.name, powder: forms.powder, capsules: forms.capsules };
              console.log(`[spor3s_bot] ⚠️ Форма продукта ${forms.name} не указана, требуется уточнение`);
              break;
            }
          }
        }
      }
      if (needsFormClarification) break;
    }
    
    // Если форма не указана, но есть товар с двумя формами - убираем тег и спрашиваем уточнение
    if (needsFormClarification && clarificationProduct) {
      // Убираем теги [add_to_cart] из ответа
      let cleanAiResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
      
      // Формируем вопрос об уточнении формы
      const clarificationMessage = `📋 **Уточните форму продукта:**

Для ${clarificationProduct.name} доступны две формы:

• **Порошок** - быстрее эффект, удобно для опытных пользователей
• **Капсулы** - удобно принимать, идеально для новичков

Какую форму вы предпочитаете? Напишите "порошок" или "капсулы".`;

      await ctx.reply(cleanAiResponse);
      await ctx.reply(clarificationMessage);
      
      // Очищаем кеш контекста, чтобы не добавлять товар автоматически
      messages[messages.length - 1].content = cleanAiResponse;
      userContextCache.set(telegram_id, messages);
      
      return; // Выходим, чтобы не обрабатывать дальше
    }
    
    // Проверяем соответствие формы продукта и корректируем если нужно
    let correctedProductIds = [...productIds];
    if (userWantsPowder || userWantsCapsules) {
      correctedProductIds = productIds.map(productId => {
        for (const [prefix, forms] of Object.entries(productFormMap)) {
          if (productId.startsWith(prefix)) {
            if (userWantsPowder && forms.powder.length > 0 && forms.capsules.includes(productId)) {
              // Пользователь хочет порошок, но AI добавил капсулы - заменяем на порошок
              console.log(`[spor3s_bot] 🔄 Заменяем ${productId} на порошок`);
              return forms.powder[0]; // Берем первый вариант порошка
            } else if (userWantsCapsules && forms.capsules.length > 0 && forms.powder.includes(productId)) {
              // Пользователь хочет капсулы, но AI добавил порошок - заменяем на капсулы
              console.log(`[spor3s_bot] 🔄 Заменяем ${productId} на капсулы`);
              return forms.capsules[0]; // Берем первый вариант капсул
            }
          }
        }
        return productId;
      });
      
      // Убираем дубликаты
      correctedProductIds = [...new Set(correctedProductIds)];
      
      if (JSON.stringify(correctedProductIds) !== JSON.stringify(productIds)) {
        console.log('[spor3s_bot] ✅ Скорректированы ID товаров:', { было: productIds, стало: correctedProductIds });
        // Обновляем теги в ответе AI для следующего шага
        let correctedAiResponse = aiResponse;
        productIds.forEach((oldId, index) => {
          if (correctedProductIds[index] && oldId !== correctedProductIds[index]) {
            correctedAiResponse = correctedAiResponse.replace(
              new RegExp(`\\[add_to_cart:${oldId}\\]`, 'g'),
              `[add_to_cart:${correctedProductIds[index]}]`
            );
          }
        });
        // Обновляем кеш с исправленным ответом
        messages[messages.length - 1].content = correctedAiResponse;
        userContextCache.set(telegram_id, messages);
      }
    }
    
    // Используем скорректированные ID
    const finalProductIds = correctedProductIds.length > 0 ? correctedProductIds : productIds;
    
    // Проверяем наличие данных для заказа в сообщениях пользователя
    const hasOrderIntent = /заказ|купить|оформить|закажи|отправь|купи|да|подтверждаю|создай заказ/i.test(userMessage) || 
                          /заказ|оформить|купить/i.test(aiResponse) ||
                          finalProductIds.length > 0;
    
    // Извлекаем данные из контекста диалога
    const allMessages = messages.map(m => m.content).join(' ');
    
    // Улучшенный парсинг ФИО
    const fioMatch = allMessages.match(/(?:фио|имя|ф\.?и\.?о\.?)[:\s]+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i) ||
                     allMessages.match(/(?:меня зовут|мое имя|зовут)[:\s]+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/i) ||
                     allMessages.match(/([А-ЯЁ][а-яё]{2,}\s+[А-ЯЁ][а-яё]{2,}(?:\s+[А-ЯЁ][а-яё]{2,})?)/);
    
    // Улучшенный парсинг телефона
    const phoneMatch = allMessages.match(/(?:телефон|тел|phone|мобильный)[:\s]*(\+?7?\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2})/i) ||
                      allMessages.match(/(\+?7?\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2})/) ||
                      allMessages.match(/(\+?7\d{10})/);
    
    // Улучшенный парсинг адреса
    const addressMatch = allMessages.match(/(?:адрес|доставка|адрес доставки|куда везти)[:\s]+([а-яё\s,\.\d-]+)/i) ||
                         allMessages.match(/((?:г\.|город|г|м\.|м|москва|спб|петербург|санкт-петербург)[\s,]+[а-яё\s,\.\d-]+(?:д\.|дом|кв\.|квартира|офис)[\s\d]+)/i) ||
                         allMessages.match(/([а-яё]+\s+[а-яё]+\s+[а-яё]+\s+\d+[,\s]+(?:д\.|дом|кв\.|квартира|офис)[\s\d]+)/i);
    
    const fio = fioMatch ? fioMatch[1].trim() : null;
    const phone = phoneMatch ? phoneMatch[1].trim().replace(/\s+/g, '') : null;
    const address = addressMatch ? addressMatch[1].trim() : null;
    
    // Проверяем, есть ли подтверждение заказа
    const isOrderConfirmation = /да|подтверждаю|подтверждаю заказ|создай заказ|оформи заказ|согласен/i.test(userMessage.toLowerCase());
    
    // Проверяем, есть ли отмена заказа
    const isOrderCancellation = /нет|отмена|отменить|не надо|не нужно|не хочу/i.test(userMessage.toLowerCase());
    
    // Если отмена - очищаем кеш подтверждения
    if (isOrderCancellation && pendingOrderCache.has(telegram_id)) {
      pendingOrderCache.delete(telegram_id);
      await ctx.reply('❌ Оформление заказа отменено. Можете продолжить общение с ИИ!');
      return;
    }
    
    console.log('[spor3s_bot] 🔍 Анализ заказа:', {
      hasOrderIntent,
      productIds: finalProductIds,
      userWantsPowder,
      userWantsCapsules,
      isOrderConfirmation,
      fio: !!fio,
      phone: !!phone,
      address: !!address,
      allDataPresent: !!(fio && phone && address && finalProductIds.length > 0)
    });
    
    // Если есть подтверждение заказа - создаем заказ
    if (isOrderConfirmation) {
      // Проверяем, есть ли сохраненный заказ для подтверждения
      const pendingOrder = pendingOrderCache.get(telegram_id);
      if (pendingOrder && pendingOrder.orderData) {
        try {
          console.log('[spor3s_bot] ✅ Подтверждение заказа, создаем...');
          
          const orderResult: any = await createOrder(user.id, pendingOrder.orderData);
          
          // Уведомляем менеджера
          const order = orderResult.order || orderResult;
          await notifyManager(order, ctx.from);
          
          // Отправляем подтверждение
          const orderConfirmMessage = `✅ Заказ успешно создан!\n\n📦 Номер заказа: #${order.id}\n💰 Сумма: ${order.total}₽\n📞 Менеджер свяжется с вами в ближайшее время.\n\nСпасибо за заказ! 🍄`;
          
          await ctx.reply(orderConfirmMessage);
          
          // Очищаем кеш подтверждения
          pendingOrderCache.delete(telegram_id);
          
          return; // Выходим, чтобы не отправлять дополнительные сообщения
        } catch (error: any) {
          console.error('[spor3s_bot] ❌ Ошибка создания заказа:', error);
          await ctx.reply(`❌ Ошибка создания заказа: ${error.message || 'Неизвестная ошибка'}`);
          return;
        }
      }
    }
    
    // Если есть все данные для заказа, но нет подтверждения - показываем подтверждение
    if (hasOrderIntent && fio && phone && address && finalProductIds.length > 0 && !isOrderConfirmation) {
      try {
        console.log('[spor3s_bot] 📋 Формируем подтверждение заказа...');
        
        // Получаем информацию о товарах
        const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products`);
        const productsData: any = await productsResponse.json();
        const products = Array.isArray(productsData) 
          ? productsData 
          : (productsData.products || []);
        
        console.log('[spor3s_bot] 📦 Получено товаров:', products.length);
        
        // Формируем список товаров для заказа
        const orderItems: any[] = [];
        let total = 0;
        
        for (const productId of finalProductIds) {
          const product = products.find((p: any) => p.id === productId);
          if (product) {
            orderItems.push({
              id: product.id,
              name: product.name,
              price: product.price,
              quantity: 1
            });
            total += product.price || 0;
            console.log('[spor3s_bot] ✅ Добавлен товар:', product.name, product.price);
          } else {
            console.warn('[spor3s_bot] ⚠️ Товар не найден:', productId);
          }
        }
        
        if (orderItems.length > 0) {
          // Сохраняем данные заказа для подтверждения
          const orderData = {
            items: orderItems,
            total,
            fio,
            phone,
            address,
            comment: `Заказ создан через Telegram бота. Продукты: ${finalProductIds.join(', ')}`
          };
          
          pendingOrderCache.set(telegram_id, { orderData, timestamp: Date.now() });
          
          // Формируем сообщение с деталями заказа
          const orderDetails = `📋 **Подтвердите заказ:**\n\n` +
            `📦 **Товары:**\n${orderItems.map(item => `• ${item.name} - ${item.price}₽`).join('\n')}\n\n` +
            `💰 **Сумма:** ${total}₽\n\n` +
            `👤 **ФИО:** ${fio}\n` +
            `📞 **Телефон:** ${phone}\n` +
            `📍 **Адрес:** ${address}\n\n` +
            `✅ Напишите "да" или "подтверждаю" для создания заказа\n` +
            `❌ Или укажите, что нужно изменить`;
          
          // Очищаем AI ответ от тегов перед отправкой
          const cleanAiResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
          
          await ctx.reply(cleanAiResponse);
          await ctx.reply(orderDetails);
          
          return; // Выходим, чтобы не отправлять дополнительные сообщения
        }
      } catch (error: any) {
        console.error('[spor3s_bot] ❌ Ошибка формирования заказа:', error);
        // Продолжаем обычную обработку, если заказ не создан
      }
    }
    
    // Если есть товары, но нет данных для заказа - показываем подтверждение добавления в корзину (для Mini App)
    // Но в боте мы сразу создаем заказ, так что эта логика не нужна
    
    // Если данных недостаточно, но есть намерение заказа - просим недостающие данные
    if (hasOrderIntent && finalProductIds.length > 0) {
      const missingFields: string[] = [];
      if (!fio) missingFields.push('ФИО');
      if (!phone) missingFields.push('телефон');
      if (!address) missingFields.push('адрес');
      
      if (missingFields.length > 0) {
        const cleanAiResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
        const requestDataMessage = `\n\n📝 Для оформления заказа мне нужны:\n${missingFields.map(f => `• ${f}`).join('\n')}\n\nПожалуйста, укажите эти данные.`;
        
        await ctx.reply(cleanAiResponse + requestDataMessage);
        return;
      }
    }
    
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
    const order = orderResult.order || orderResult;
    await notifyManager(order, ctx.from);

    // Отправляем подтверждение пользователю
    await ctx.reply(`✅ Заказ успешно создан!

📦 Номер заказа: #${order.id}
💰 Сумма: ${order.total}₽
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
      if (line.includes('Товары:') || line.includes('товары:')) {
        orderData.items = line.split(/товары?:/i)[1].trim();
      } else if (line.includes('Сумма:') || line.includes('сумма:')) {
        const totalStr = line.split(/сумма?:/i)[1].trim().replace(/[^\d]/g, '');
        orderData.total = parseInt(totalStr);
      } else if (line.includes('ФИО:') || line.includes('ф\.?и\.?о\.?:')) {
        orderData.fio = line.split(/ф\.?и\.?о\.?:/i)[1]?.trim() || line.split('ФИО:')[1]?.trim();
      } else if (line.includes('Телефон:') || line.includes('телефон:') || line.includes('тел:')) {
        orderData.phone = line.split(/телефон?:/i)[1]?.trim() || line.split('Телефон:')[1]?.trim();
        orderData.phone = orderData.phone.replace(/\s+/g, '');
      } else if (line.includes('Адрес:') || line.includes('адрес:')) {
        orderData.address = line.split(/адрес?:/i)[1]?.trim() || line.split('Адрес:')[1]?.trim();
      } else if (line.includes('Комментарий:') || line.includes('комментарий:')) {
        orderData.comment = line.split(/комментарий?:/i)[1]?.trim() || line.split('Комментарий:')[1]?.trim();
      }
    }

    // Парсим товары из строки в структурированный формат
    if (orderData.items && typeof orderData.items === 'string') {
      const itemsList = orderData.items.split(',').map((item: string) => item.trim());
      const parsedItems: any[] = [];
      
      // Пытаемся определить ID товаров по названию
      const productKeywords: Record<string, string> = {
        'ежовик 100': 'ezh100',
        'ежовик 120': 'ezh120k',
        'ежовик 300': 'ezh300',
        'ежовик 360': 'ezh360k',
        'ежовик 500': 'ezh500',
        'мухомор 30': 'mhm30',
        'мухомор 50': 'mhm50',
        'мухомор 60': 'mhm60k',
        'мухомор 100': 'mhm100',
        'мухомор 180': 'mhm180k',
        'кордицепс 50': 'kor50',
        'кордицепс 150': 'kor150',
        'цистозира 30': 'ci30',
        'цистозира 90': 'ci90',
        '4 в 1': '4v1',
        'комплекс 4': '4v1',
        '4в1': '4v1'
      };
      
      for (const item of itemsList) {
        const lowerItem = item.toLowerCase();
        let productId = null;
        
        for (const [keyword, id] of Object.entries(productKeywords)) {
          if (lowerItem.includes(keyword)) {
            productId = id;
            break;
          }
        }
        
        parsedItems.push({
          id: productId || 'unknown',
          name: item,
          quantity: 1
        });
      }
      
      orderData.items = parsedItems;
    }

    // Проверяем обязательные поля
    if (!orderData.items || !orderData.total || !orderData.fio || !orderData.phone || !orderData.address) {
      return null;
    }

    return orderData;
  } catch (error: unknown) {
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