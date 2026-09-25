import type { TelegramNotice } from './raffle';

// Сообщение от бота через Bot API: HTML-разметка и кнопки под текстом. Пишем из приложения
// (не из процесса бота) — токен тот же, TELEGRAM_BOT_TOKEN в .env.local.
// 403 — человек ни разу не запускал бота, писать ему нельзя: просто пишем в лог.
export async function sendTelegramNotice({ chatId, text, buttons }: TelegramNotice): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } }),
  });
  if (!resp.ok) console.error('[telegram] сообщение не отправлено:', resp.status, await resp.text());
  return resp.ok;
}
