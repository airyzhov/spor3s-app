// Реферальная ссылка на бота. Бот (tg-bot/bot.ts, bot.start) засчитывает приглашение только
// по /start <числовой telegram_id> — 5–15 цифр, как проверяет он сам. Для гостя (guest-…),
// @логина или телефона ссылки нет: бот её не засчитает, а телефон ещё и создаст фиктивного пригласившего.
const BOT_START_ID = /^\d{5,15}$/;
const SHARE_TEXT = 'Грибные добавки СПОРС 🍄 Перейди по моей ссылке — получишь 100 SC (100₽) на первый заказ!';

export function referralLink(telegramId: string | null | undefined): string | null {
  const id = String(telegramId ?? '').trim();
  return BOT_START_ID.test(id) ? `https://t.me/spor3sbot?start=${id}` : null;
}

// Окно Telegram «поделиться» с реферальной ссылкой; null, если ссылки нет.
export function referralShareUrl(telegramId: string | null | undefined): string | null {
  const link = referralLink(telegramId);
  if (!link) return null;
  return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(SHARE_TEXT)}`;
}
