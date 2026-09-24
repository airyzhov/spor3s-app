import { supabaseServer } from '../app/supabaseServerClient';
import { RAFFLE, buildRaffleNotice, countsAsFriend, type RaffleEvent, type TelegramNotice } from './raffle';
import { getUserProgress } from './raffleServer';

// Сообщения участникам розыгрыша в боте. Что и когда писать — buildRaffleNotice в lib/raffle.ts,
// здесь только данные из базы и отправка. Ошибки ловит вызывающий: уведомление не должно
// ломать ни начисление за задание, ни вход в приложение.

const acceptingEntries = () => Date.now() < Date.parse(RAFFLE.endsAt);

// Пользователь выполнил задание или у него засчитался новый друг — может, пора написать
export async function notifyRaffle(userId: string, event: RaffleEvent): Promise<void> {
  if (!acceptingEntries()) return;
  const [progress, userRes] = await Promise.all([
    getUserProgress(userId),
    supabaseServer.from('users').select('telegram_id').eq('id', userId).maybeSingle(),
  ]);
  const notice = buildRaffleNotice(event, progress, userRes.data?.telegram_id);
  if (notice) await sendTelegram(notice);
}

// Человек впервые открыл приложение. Если он пришёл по чьей-то ссылке в окне розыгрыша
// и засчитался другом — у пригласившего стало на одного друга больше.
export async function notifyReferrerOfNewFriend(friendUserId: string): Promise<void> {
  if (!acceptingEntries()) return;
  const [refRes, friendRes] = await Promise.all([
    supabaseServer
      .from('referrals')
      .select('referrer_user_id, referred_user_id, created_at')
      .eq('referred_user_id', friendUserId)
      .gte('created_at', RAFFLE.startsAt)
      .lt('created_at', RAFFLE.endsAt)
      .order('created_at', { ascending: true })
      .limit(1),
    supabaseServer.from('users').select('id, telegram_id, created_at').eq('id', friendUserId).maybeSingle(),
  ]);
  const referral = refRes.data?.[0];
  if (!referral || !countsAsFriend(referral, friendRes.data ?? undefined, new Set([friendUserId]))) return;
  await notifyRaffle(referral.referrer_user_id, 'friend');
}

async function sendTelegram({ chatId, text, buttons }: TelegramNotice): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } }),
  });
  // 403 — человек не запускал бота: писать ему нельзя, участником он остаётся
  if (!resp.ok) console.error('[raffle] сообщение не отправлено:', resp.status, await resp.text());
}
