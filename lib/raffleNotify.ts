import { supabaseServer } from '../app/supabaseServerClient';
import { RAFFLE, buildRaffleNotice, countsAsFriend, type RaffleEvent } from './raffle';
import { getUserProgress } from './raffleServer';
import { sendTelegramNotice } from './telegramSend';

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
  if (notice) await sendTelegramNotice(notice);
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
