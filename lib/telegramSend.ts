import type { TelegramNotice } from './raffle';

// Сообщение от бота через Bot API: HTML-разметка и кнопки под текстом. Пишем из приложения
// (не из процесса бота) — токен тот же, TELEGRAM_BOT_TOKEN в .env.local.
// 403 — человек ни разу не запускал бота, писать ему нельзя: просто пишем в лог.
// Сообщения уходят и из начислений SC (lib/scNotify.ts), поэтому функция никогда не бросает
// и ждёт Telegram не дольше TELEGRAM_TIMEOUT_MS: зависший Telegram не должен держать ответ сайта.
const TELEGRAM_TIMEOUT_MS = 5000;

export async function sendTelegramNotice({ chatId, text, buttons }: TelegramNotice): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });
    if (!resp.ok) console.error('[telegram] сообщение не отправлено:', resp.status, await resp.text());
    return resp.ok;
  } catch (e) {
    // Только имя и текст ошибки: в адресе запроса — токен бота
    console.error('[telegram] сообщение не отправлено:', e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    return false;
  }
}
