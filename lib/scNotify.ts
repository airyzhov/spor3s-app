import { supabaseServer } from '../app/supabaseServerClient';
import { scChangeNotice, type ScChange } from './scHistory';
import { sendTelegramNotice } from './telegramSend';

// Бот пишет человеку о начислении или списании SC (решение владельца 30.09). Текст — scChangeNotice
// в lib/scHistory.ts, здесь только Telegram ID из базы и отправка. Никогда не бросает: сообщение
// не должно ломать саму операцию с SC. Нет токена бота (тесты, локальная разработка) — в базу не ходим.
export async function notifyScChange(userId: string, change: ScChange): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const { data } = await supabaseServer.from('users').select('telegram_id').eq('id', userId).maybeSingle();
    const notice = scChangeNotice(change, data?.telegram_id);
    if (notice) await sendTelegramNotice(notice);
  } catch (e) {
    console.error('[sc] сообщение в боте не отправлено:', e);
  }
}
