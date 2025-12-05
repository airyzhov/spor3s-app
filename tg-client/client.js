require('dotenv').config({ path: '/var/www/spor3s-app/tg-client/.env.local' });
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { createClient } = require('@supabase/supabase-js');

const API_ID = Number(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;
const SESSION = process.env.TELEGRAM_SESSION_STRING;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function log(...args) { console.log('[tg-client]', ...args); }

if (!API_ID || !API_HASH || !SESSION) {
  console.error('Missing TELEGRAM_API_* or TELEGRAM_SESSION_STRING');
  process.exit(1);
}

const client = new TelegramClient(new StringSession(SESSION), API_ID, API_HASH, { connectionRetries: 5 });

const EZH_REGEX = /(ёж|еж|гребенч|грибо?нч|герици|hericium|lion.?s?.?mane)/i;
const MHM_REGEX = /(мухомор|amanita|сон|стресс|тревог|бессонниц)/i;
const KOR_REGEX = /(кордицепс|cordyceps|энерги|выносливост|спорт)/i;
const CI_REGEX = /(цистозир|щитовид|йод|гормон)/i;
const ORDER_REGEX = /(заказ|купить|цена|стоимость|сколько стоит|оформить|доставк)/i;
const GREET_REGEX = /(привет|здравствуй|добрый|хай|hello|hi\b)/i;
const MEMORY_REGEX = /(память|концентрац|мозг|фокус|внимани|обучени)/i;
const DURATION_REGEX = /(месяц|3\s*мес|полгода|6\s*мес|курс)/i;
const WEIGHT_REGEX = /(\d+\s*г[рp]?|\d+\s*капсул)/i;
const CONFIRM_REGEX = /(хорошо|ок|давай|беру|хочу|буду|порошок|капсул)/i;
const QUESTION_REGEX = /^\?+$/;

async function findUserIdByTelegram(telegramId) {
  if (!supabase) return null;
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', String(telegramId))
      .limit(1);
    return users && users[0] ? users[0].id : null;
  } catch {
    return null;
  }
}

async function hasActiveCourse(userId) {
  if (!supabase || !userId) return false;
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('status, start_at, started_at, course_start_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!orders || !orders[0]) return false;
    const o = orders[0];
    const status = String(o.status || '').toLowerCase();
    const startedAt = o.start_at || o.started_at || o.course_start_at || o.created_at;
    const isStarted = startedAt ? new Date(startedAt).getTime() <= Date.now() : false;
    const isActive = ['active', 'in_progress', 'paid'].includes(status) || isStarted;
    return Boolean(isActive && isStarted);
  } catch {
    return false;
  }
}

async function upsertConsent(telegramId, consent) {
  if (!supabase) return;
  try {
    const userId = await findUserIdByTelegram(telegramId);
    const { error } = await supabase
      .from('notification_consent')
      .upsert({ user_id: userId, telegram_id: String(telegramId), consent }, { onConflict: 'telegram_id' });
    if (error) log('consent upsert error', error);
  } catch (e) {
    log('consent upsert exception', e.message);
  }
}

async function sendReminderIfConsented(targetTelegramId, message) {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('notification_consent')
        .select('consent')
        .eq('telegram_id', String(targetTelegramId))
        .maybeSingle();
      if (error) log('read consent error', error);
      if (!data || data.consent !== true) return false;
    }
    const entity = await client.getEntity(BigInt(targetTelegramId));
    await client.sendMessage(entity, { message });
    return true;
  } catch (e) {
    log('send reminder failed', e.message);
    return false;
  }
}

function scheduleDailyAt07(callback) {
  // compute next 07:00 local
  const now = new Date();
  const next = new Date();
  next.setHours(7, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  setTimeout(() => {
    callback();
    setInterval(callback, 24 * 60 * 60 * 1000);
  }, delay);
  log('daily scheduler armed for', next.toString());
}

async function runDailyReminders() {
  if (!supabase) return;
  try {
    // pending reminders due
    const { data: due, error } = await supabase
      .from('reminders')
      .select('id, telegram_id, message')
      .eq('status', 'pending')
      .lte('due_at', new Date().toISOString());
    if (error) { log('load reminders error', error); return; }
    for (const r of due || []) {
      const ok = await sendReminderIfConsented(r.telegram_id, r.message);
      if (ok) {
        await supabase
          .from('reminders')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', r.id);
      }
    }
    log('daily reminders processed', (due || []).length);
  } catch (e) {
    log('runDailyReminders exception', e.message);
  }
}

client.addEventHandler(async (event) => {
  try {
    const msg = event.message?.message?.trim();
    const isPrivate = event.isPrivate === true || (event.message?.peerId?.className === 'PeerUser');
    if (!msg || !isPrivate) return;
    const text = msg.toLowerCase();
    const fromId = event.message?.senderId?.userId?.value ?? event.message?.senderId?.value;
    if (!fromId) return;
    
    log('MSG:', text.substring(0, 50));
    let replied = false;

    // Приветствие
    if (GREET_REGEX.test(text) && !replied) {
      await client.sendMessage(event.message.peerId, { 
        message: 'Привет! 👋 Я помогу с грибными добавками.\n\n🍄 Что тебя интересует?\n• Ежовик — память, концентрация\n• Мухомор — сон, стресс\n• Кордицепс — энергия\n• Цистозира — щитовидка\n\nНапиши, что беспокоит, и подберу курс!' 
      });
      replied = true;
    }

    // Память/концентрация → Ежовик
    if (MEMORY_REGEX.test(text) && !EZH_REGEX.test(text) && !replied) {
      await client.sendMessage(event.message.peerId, { 
        message: '🧠 Для памяти и концентрации рекомендую Ежовик!\n\n📦 Варианты:\n• 100г порошок или 120 капсул — 1100₽ (месяц)\n• 300г или 360 капсул — 3000₽ (3 месяца)\n\nПорошок или капсулы удобнее?' 
      });
      replied = true;
    }

    // Ежовик
    if (EZH_REGEX.test(text) && !replied) {
      await client.sendMessage(event.message.peerId, { 
        message: '🍄 Ежовик (Hericium) — топ для памяти!\n\n📦 Варианты:\n• 100г порошок — 1100₽\n• 120 капсул — 1100₽\n• 300г порошок — 3000₽ (3 мес)\n• 360 капсул — 3000₽ (3 мес)\n\nКакой срок: месяц или курс 3 месяца?' 
      });
      replied = true;
    }

    // Мухомор / Сон / Стресс
    if (MHM_REGEX.test(text) && !replied) {
      await client.sendMessage(event.message.peerId, { 
        message: '🔴 Мухомор — отлично для сна и снятия стресса!\n\n📦 Варианты:\n• 30г шляпки — 1400₽ (месяц)\n• 60 капсул — 1400₽ (месяц)\n• 100г — 4000₽ (3 мес)\n• 180 капсул — 4000₽ (3 мес)\n\nПорошок или капсулы?' 
      });
      replied = true;
    }

    // Кордицепс / Энергия
    if (KOR_REGEX.test(text) && !replied) {
      await client.sendMessage(event.message.peerId, { 
        message: '⚡ Кордицепс — энергия и выносливость!\n\n📦 Варианты:\n• 50г — 800₽ (месяц)\n• 150г — 2000₽ (3 мес)\n\nХочешь добавить?' 
      });
      replied = true;
    }

    // Цистозира / Щитовидка
    if (CI_REGEX.test(text) && !replied) {
      await client.sendMessage(event.message.peerId, { 
        message: '🦋 Цистозира — поддержка щитовидной железы!\n\n📦 Варианты:\n• 30г — 500₽ (месяц)\n• 90г — 1350₽ (3 мес)\n\nДобавить в заказ?' 
      });
      replied = true;
    }

    // Заказ / Цена
    if (ORDER_REGEX.test(text) && !replied) {
      await client.sendMessage(event.message.peerId, { 
        message: '🛒 Для заказа напиши что хочешь, и я помогу!\n\nИли открой мини-приложение: 👉 t.me/spor3s_bot\n\nТам удобнее оформить с доставкой СДЭК 📦' 
      });
      replied = true;
    }

    // Выбор веса/количества (100г, 300г, капсулы) — ВАЖНО: до DURATION!
    if (WEIGHT_REGEX.test(text) && !replied) {
      const weight = text.match(/(\d+)/)?.[1];
      const isCaps = /капсул/i.test(text);
      const isPowder = /порош|г[рp]?/i.test(text) || (weight && !isCaps);
      
      // Определяем продукт по весу
      if (weight === '100' && isPowder) {
        await client.sendMessage(event.message.peerId, { 
          message: '✅ Ежовик 100г порошок — 1100₽ (на месяц)\n\n💡 Рекомендую сразу курс 3 мес (300г) — 3000₽, эффект накопительный!\n\nОформить: 👉 t.me/spor3s_bot' 
        });
      } else if (weight === '300') {
        await client.sendMessage(event.message.peerId, { 
          message: '✅ Ежовик 300г порошок — 3000₽ (курс 3 мес)\n\nОтличный выбор! 🎉\n\nОформить: 👉 t.me/spor3s_bot' 
        });
      } else if (weight === '30') {
        await client.sendMessage(event.message.peerId, { 
          message: '✅ Мухомор 30г — 1400₽ (на месяц)\n\n💡 Рекомендую курс 3 мес (100г) — 4000₽!\n\nОформить: 👉 t.me/spor3s_bot' 
        });
      } else if (weight === '50') {
        await client.sendMessage(event.message.peerId, { 
          message: '✅ Кордицепс 50г — 800₽ (на месяц)\n\n💡 Курс 3 мес (150г) — 2000₽!\n\nОформить: 👉 t.me/spor3s_bot' 
        });
      } else if (weight === '120' && isCaps) {
        await client.sendMessage(event.message.peerId, { 
          message: '✅ Ежовик 120 капсул — 1100₽ (на месяц)\n\nОформить: 👉 t.me/spor3s_bot' 
        });
      } else {
        await client.sendMessage(event.message.peerId, { 
          message: `✅ Записал: ${text}\n\nДля оформления с доставкой СДЭК:\n👉 t.me/spor3s_bot` 
        });
      }
      replied = true;
    }

    // Выбор срока (месяц, 3 мес и т.д.)
    if (DURATION_REGEX.test(text) && !replied) {
      const is3Month = /3\s*мес|курс/i.test(text);
      const is6Month = /6\s*мес|полгода/i.test(text);
      if (is6Month) {
        await client.sendMessage(event.message.peerId, { 
          message: '✅ Курс на 6 месяцев — максимальный эффект!\n\nОформить с доставкой СДЭК:\n👉 t.me/spor3s_bot' 
        });
      } else if (is3Month) {
        await client.sendMessage(event.message.peerId, { 
          message: '✅ Курс 3 месяца — оптимально!\n\nОформить с доставкой СДЭК:\n👉 t.me/spor3s_bot' 
        });
      } else {
        await client.sendMessage(event.message.peerId, { 
          message: '✅ На месяц — понял!\n\n💡 Курс 3 мес выгоднее и эффективнее!\n\nОформить: 👉 t.me/spor3s_bot' 
        });
      }
      replied = true;
    }

    // Подтверждение (хорошо, ок, давай, беру)
    if (CONFIRM_REGEX.test(text) && text.length < 15 && !replied) {
      await client.sendMessage(event.message.peerId, { 
        message: '🎉 Отлично!\n\nДля оформления заказа с доставкой СДЭК открой мини-приложение:\n👉 t.me/spor3s_bot\n\nТам заполнишь:\n• ФИО получателя\n• Телефон\n• Адрес ПВЗ СДЭК\n\nИ оплатишь удобным способом 💳' 
      });
      replied = true;
    }

    // Вопрос (?)
    if (QUESTION_REGEX.test(text) && !replied) {
      await client.sendMessage(event.message.peerId, { 
        message: '❓ Что-то непонятно? Спрашивай!\n\n🍄 Я помогу выбрать:\n• Ежовик — память\n• Мухомор — сон\n• Кордицепс — энергия\n• Цистозира — щитовидка\n\nИли напиши что беспокоит!' 
      });
      replied = true;
    }

    // Если ничего не подошло — общий ответ
    if (!replied && text.length > 2) {
      await client.sendMessage(event.message.peerId, { 
        message: '🍄 Интересует что-то конкретное?\n\nНапиши:\n• "память" — подберу для мозга\n• "сон" — для качественного отдыха\n• "энергия" — для бодрости\n\nИли открой каталог: 👉 t.me/spor3s_bot' 
      });
    }

    // Согласие на напоминания
    if (text === 'да' || text === 'yes') {
      const userId = await findUserIdByTelegram(String(fromId));
      const ok = await hasActiveCourse(userId);
      if (!ok) {
        await client.sendMessage(event.message.peerId, { message: 'Зафиксирую напоминания после старта курса. Как начнёшь — напиши «старт» в мини‑приложении или сюда.' });
        return;
      }
      await upsertConsent(String(fromId), true);
      await client.sendMessage(event.message.peerId, { message: 'Готово! Напоминания включены. Отключить — ответь «Нет».' });
    } else if (text === 'нет' || text === 'no') {
      await upsertConsent(String(fromId), false);
      await client.sendMessage(event.message.peerId, { message: 'Ок, отключил. Включить обратно — ответь «Да».' });
    }
  } catch (e) {
    log('Event handler error:', e.message);
  }
}, new NewMessage({}));

function normalizeTarget(input) {
  if (!input) return null;
  if (/^\d+$/.test(input)) return BigInt(input);
  if (input.startsWith('@')) return input.slice(1);
  return input;
}

// Менеджер для уведомлений о заказах
const MANAGER_USERNAME = process.env.MANAGER_USERNAME || 'ai_ryzhov';

// Функция отправки уведомления о новом заказе менеджеру
async function notifyManagerAboutOrder(orderData) {
  try {
    const items = Array.isArray(orderData.items) 
      ? orderData.items.map(item => `• ${item.name || item.id} — ${item.price || 0}₽`).join('\n')
      : 'Товары не указаны';

    const message = `🆕 НОВЫЙ ЗАКАЗ!

📱 Источник: ${orderData.source || 'неизвестен'}

👤 Данные для СДЭК:
• ФИО: ${orderData.fio || '❌ Не указано'}
• Телефон: ${orderData.phone || '❌ Не указан'}
• Адрес ПВЗ: ${orderData.address || '❌ Не указан'}

📦 Товары:
${items}

💰 Итого: ${orderData.total || 0}₽
💬 Комментарий: ${orderData.comment || 'нет'}

🕐 ${new Date().toLocaleString('ru-RU')}`;

    const entity = await client.getEntity(MANAGER_USERNAME);
    await client.sendMessage(entity, { message });
    log('✅ Order notification sent to @' + MANAGER_USERNAME);
    return true;
  } catch (e) {
    log('❌ Failed to notify manager:', e.message);
    return false;
  }
}

// Слушаем новые заказы из Supabase (realtime)
async function setupOrderNotifications() {
  if (!supabase) {
    log('Supabase not configured, order notifications disabled');
    return;
  }

  // Проверяем новые заказы каждые 30 секунд
  let lastCheckedAt = new Date().toISOString();
  
  setInterval(async () => {
    try {
      const { data: newOrders, error } = await supabase
        .from('orders')
        .select('*')
        .gt('created_at', lastCheckedAt)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        log('Error checking new orders:', error.message);
        return;
      }

      if (newOrders && newOrders.length > 0) {
        log(`Found ${newOrders.length} new order(s)`);
        for (const order of newOrders) {
          await notifyManagerAboutOrder(order);
        }
      }

      lastCheckedAt = new Date().toISOString();
    } catch (e) {
      log('Error in order check:', e.message);
    }
  }, 30000); // каждые 30 секунд

  log('Order notifications setup complete');
}

(async () => {
  await client.connect();
  if (!(await client.isUserAuthorized())) {
    console.error('Telegram client is not authorized. Update TELEGRAM_SESSION_STRING.');
    process.exit(1);
  }

  const [cmd, rawTarget, ...rest] = process.argv.slice(2);
  if (cmd === 'ask-consent') {
    const target = normalizeTarget(rawTarget);
    if (!target) return console.error('Usage: node tg-client/client.js ask-consent <id|@username>');
    const entity = await client.getEntity(target);
    await client.sendMessage(entity, { message: 'Включить напоминания о приёме и прогрессе? Ответь кнопкой: Да / Нет', buttons: [['Да'], ['Нет']] });
    log('consent request sent');
    return;
  }
  if (cmd === 'send-reminder') {
    const target = normalizeTarget(rawTarget);
    const text = rest.join(' ').trim();
    if (!target || !text) return console.error('Usage: node tg-client/client.js send-reminder <id|@username> "Текст"');
    const entity = await client.getEntity(target);
    await client.sendMessage(entity, { message: text });
    log('manual reminder sent');
    return;
  }
  if (cmd === 'notify-order') {
    // Ручная отправка уведомления о заказе
    // Usage: node client.js notify-order '{"fio":"Иван","phone":"+79991234567","address":"Москва, ПВЗ"}'
    try {
      const orderJson = rawTarget || '{}';
      const orderData = JSON.parse(orderJson);
      await notifyManagerAboutOrder(orderData);
    } catch (e) {
      console.error('Invalid order JSON:', e.message);
    }
    return;
  }

  // schedule daily 07:00
  scheduleDailyAt07(runDailyReminders);
  
  // setup order notifications
  await setupOrderNotifications();
  
  log('Telegram client is running');
  setInterval(() => {}, 1 << 30);
})().catch((e) => { console.error(e); process.exit(1); });


