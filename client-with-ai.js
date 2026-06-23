require('dotenv').config({ path: '.env.local' });
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const axios = require('axios');

const API_ID = Number(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;
const SESSION = process.env.TELEGRAM_SESSION_STRING;

function log(...args) { console.log('[spor3z-ai]', ...args); }

if (!API_ID || !API_HASH || !SESSION) {
  console.error('Missing TELEGRAM_API_* or TELEGRAM_SESSION_STRING');
  process.exit(1);
}

const client = new TelegramClient(new StringSession(SESSION), API_ID, API_HASH, { connectionRetries: 5 });

async function callAI(message, userId) {
  try {
    const response = await axios.post('http://localhost:3000/api/ai-simple', {
      message: message,
      source: 'spor3z',
      telegram_id: userId
    }, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.response;
  } catch (error) {
    log('AI API ошибка:', error.message);
    return 'Извините, произошла ошибка при обращении к ИИ.';
  }
}

client.addEventHandler(async (event) => {
  try {
    const msg = event.message?.message?.trim();
    const isPrivate = event.isPrivate === true || (event.message?.peerId?.className === 'PeerUser');
    if (!msg || !isPrivate) return;
    
    const fromId = event.message?.senderId?.userId?.value ?? event.message?.senderId?.value;
    if (!fromId) return;
    
    log('📨 Сообщение от', fromId, ':', msg);
    
    // Получаем ответ от AI
    const aiResponse = await callAI(msg, String(fromId));
    
    // Отправляем ответ
    await client.sendMessage(event.message.peerId, { message: aiResponse });
    log('✅ Ответ отправлен');
    
  } catch (error) {
    log('❌ Ошибка:', error.message);
  }
}, new NewMessage({}));

(async () => {
  await client.connect();
  if (!(await client.isUserAuthorized())) {
    console.error('Telegram client is not authorized.');
    process.exit(1);
  }
  log('✅ Spor3z AI бот запущен и слушает сообщения!');
  setInterval(() => {}, 1 << 30);
})().catch((e) => { console.error(e); process.exit(1); });

