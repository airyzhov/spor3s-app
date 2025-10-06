require('dotenv').config({ path: '.env.local' });
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

    if (EZH_REGEX.test(text)) {
      await client.sendMessage(event.message.peerId, { message: 'Да, есть ежовик (Hericium). Подобрать схему под цели: сон/тревога/память/энергия?' });
    }

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
  } catch {}
}, new NewMessage({}));

function normalizeTarget(input) {
  if (!input) return null;
  if (/^\d+$/.test(input)) return BigInt(input);
  if (input.startsWith('@')) return input.slice(1);
  return input;
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

  // schedule daily 07:00
  scheduleDailyAt07(runDailyReminders);
  log('Telegram client is running');
  setInterval(() => {}, 1 << 30);
})().catch((e) => { console.error(e); process.exit(1); });


