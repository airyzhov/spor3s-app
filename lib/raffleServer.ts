import { supabaseServer } from '../app/supabaseServerClient';
import {
  RAFFLE,
  SUBSCRIBE_TASK_TYPES,
  countTasks,
  countFriends,
  buildParticipants,
  buildAnnounceNotice,
  openedMiniApp,
  raffleMe,
  raffleStage,
  type FriendUser,
  type RaffleMe,
  type RaffleParticipant,
  type RaffleProgress,
  type RaffleWinner,
  type RaffleDraw,
} from './raffle';
import { sendTelegramNotice } from './telegramSend';

// Запросы розыгрыша к базе. Правила подсчёта — в lib/raffle.ts.

// Ошибка для человека: статус ответа API и текст (кнопка «Участвую», рассылка в админке)
export class RaffleJoinError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Нет таблицы (raffle_entries.sql / raffle_draws.sql ещё не выполнен) — это не ошибка, а tableReady: false
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|could not find the table/i.test(error.message || '')
  );
}

// Друзья, засчитанные пригласившим; referrerIds = null — все пригласившие (для админки).
// «Открыл приложение» — по ai_agent_status.last_activity (openedMiniApp), а не по наличию строки:
// её создаёт триггер БД каждому новому пользователю.
async function friendCounts(referrerIds: string[] | null): Promise<Map<string, number>> {
  let query = supabaseServer
    .from('referrals')
    .select('referrer_user_id, referred_user_id, created_at')
    .gte('created_at', RAFFLE.startsAt)
    .lt('created_at', RAFFLE.endsAt);
  if (referrerIds) query = query.in('referrer_user_id', referrerIds);
  const { data: referrals, error } = await query;
  if (error) throw new Error('referrals: ' + error.message);

  const friendIds = Array.from(new Set((referrals || []).map((r) => r.referred_user_id)));
  if (!friendIds.length) return new Map();

  const [usersRes, openedRes] = await Promise.all([
    supabaseServer.from('users').select('id, telegram_id, created_at').in('id', friendIds),
    supabaseServer.from('ai_agent_status').select('user_id, last_activity, created_at').in('user_id', friendIds),
  ]);
  if (usersRes.error) throw new Error('users: ' + usersRes.error.message);
  if (openedRes.error) throw new Error('ai_agent_status: ' + openedRes.error.message);

  const users = new Map<string, FriendUser>((usersRes.data || []).map((u) => [u.id, u]));
  const opened = new Set<string>((openedRes.data || []).filter((a) => openedMiniApp(a)).map((a) => a.user_id));
  return countFriends(referrals || [], users, opened);
}

// Кто нажал «Участвую»; userIds = null — все
async function joinedIds(userIds: string[] | null): Promise<{ ids: Set<string>; tableReady: boolean }> {
  let query = supabaseServer.from('raffle_entries').select('user_id').eq('raffle_id', RAFFLE.id);
  if (userIds) query = query.in('user_id', userIds);
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return { ids: new Set(), tableReady: false };
    throw new Error('raffle_entries: ' + error.message);
  }
  return { ids: new Set((data || []).map((r) => r.user_id)), tableReady: true };
}

async function allTaskCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabaseServer
    .from('sc_transactions')
    .select('user_id, source_type, created_at')
    .in('source_type', SUBSCRIBE_TASK_TYPES);
  if (error) throw new Error('sc_transactions: ' + error.message);
  return countTasks(data || []);
}

export async function getUserProgress(userId: string): Promise<RaffleProgress> {
  const [tasksRes, friends, joined] = await Promise.all([
    supabaseServer
      .from('sc_transactions')
      .select('user_id, source_type, created_at')
      .eq('user_id', userId)
      .in('source_type', SUBSCRIBE_TASK_TYPES),
    friendCounts([userId]),
    joinedIds([userId]),
  ]);
  if (tasksRes.error) throw new Error('sc_transactions: ' + tasksRes.error.message);
  return {
    tasks: countTasks(tasksRes.data || []).get(userId) || 0,
    friends: friends.get(userId) || 0,
    joined: joined.ids.has(userId),
  };
}

// Кнопка «Участвую»: только в окне приёма и после подписочного задания; повторное нажатие — не ошибка
export async function joinRaffle(userId: string, now: Date = new Date()): Promise<RaffleMe> {
  if (raffleStage(now, false) !== 'open') throw new RaffleJoinError(409, 'Приём заявок закрыт');
  const progress = await getUserProgress(userId);
  if (progress.tasks < 1) throw new RaffleJoinError(400, 'Сначала выполни задание на подписку');
  if (!progress.joined) {
    const { error } = await supabaseServer
      .from('raffle_entries')
      .upsert([{ raffle_id: RAFFLE.id, user_id: userId }], { onConflict: 'raffle_id,user_id', ignoreDuplicates: true });
    if (error) {
      if (isMissingTable(error)) throw new RaffleJoinError(503, 'Скоро можно будет нажать «Участвую»');
      throw new Error('raffle_entries: ' + error.message);
    }
  }
  return raffleMe({ ...progress, joined: true });
}

export async function listParticipants(): Promise<RaffleParticipant[]> {
  const [tasks, friends, joined] = await Promise.all([allTaskCounts(), friendCounts(null), joinedIds(null)]);
  const ids = Array.from(new Set([...Array.from(tasks.keys()), ...Array.from(friends.keys()), ...Array.from(joined.ids)]));
  if (!ids.length) return [];
  const { data: users, error } = await supabaseServer.from('users').select('id, username, telegram_id').in('id', ids);
  if (error) throw new Error('users: ' + error.message);
  return buildParticipants(users || [], tasks, friends, joined.ids);
}

// ---- Рассылка о розыгрыше (кнопка в админке): пользователям Telegram без «Участвую», по разу ----

const TG_ID = /^\d{5,15}$/;

async function announceTargets(): Promise<{ tableReady: boolean; targets: { id: string; telegram_id: string }[] }> {
  const [usersRes, joined, noticesRes] = await Promise.all([
    supabaseServer.from('users').select('id, telegram_id'),
    joinedIds(null),
    supabaseServer.from('raffle_notices').select('user_id').eq('raffle_id', RAFFLE.id).eq('kind', 'announce'),
  ]);
  if (noticesRes.error) {
    if (isMissingTable(noticesRes.error)) return { tableReady: false, targets: [] };
    throw new Error('raffle_notices: ' + noticesRes.error.message);
  }
  if (!joined.tableReady) return { tableReady: false, targets: [] };
  if (usersRes.error) throw new Error('users: ' + usersRes.error.message);

  const notified = new Set((noticesRes.data || []).map((n) => n.user_id));
  const targets = (usersRes.data || []).filter(
    (u) => TG_ID.test(String(u.telegram_id ?? '')) && !joined.ids.has(u.id) && !notified.has(u.id),
  );
  return { tableReady: true, targets };
}

// Сколько человек получит рассылку — для подписи кнопки в админке
export async function announceAudience(): Promise<{ tableReady: boolean; pending: number }> {
  const { tableReady, targets } = await announceTargets();
  return { tableReady, pending: targets.length };
}

// Отправить рассылку. Каждую попытку помечаем в raffle_notices — и когда Telegram отказал (человек не
// запускал бота): повторное нажатие напишет только тем, кто появился после. pause — пауза между
// сообщениями (лимит Bot API — около 30 в секунду).
export async function announceRaffle(
  { now = new Date(), pause = 50 }: { now?: Date; pause?: number } = {},
): Promise<{ sent: number; failed: number }> {
  if (raffleStage(now, false) !== 'open') throw new RaffleJoinError(409, 'Приём заявок закрыт');
  const { tableReady, targets } = await announceTargets();
  if (!tableReady) {
    throw new RaffleJoinError(409, 'Нет таблиц raffle_entries / raffle_notices — выполни raffle_entries.sql в Supabase');
  }
  const tasks = await allTaskCounts();

  let sent = 0;
  let failed = 0;
  for (const u of targets) {
    const notice = buildAnnounceNotice({ tasks: tasks.get(u.id) || 0, friends: 0, joined: false }, u.telegram_id, now);
    if (!notice) continue;
    const ok = await sendTelegramNotice(notice).catch(() => false);
    if (ok) sent++;
    else failed++;
    const { error } = await supabaseServer.from('raffle_notices').insert([{ raffle_id: RAFFLE.id, user_id: u.id, kind: 'announce' }]);
    if (error) console.error('[raffle] рассылка: не записали отметку', u.id, error.message);
    if (pause) await new Promise((r) => setTimeout(r, pause));
  }
  return { sent, failed };
}

export async function getLatestDraw(): Promise<{ draw: RaffleDraw | null; tableReady: boolean }> {
  const { data, error } = await supabaseServer
    .from('raffle_draws')
    .select('drawn_at, participants, winners')
    .eq('raffle_id', RAFFLE.id)
    .order('drawn_at', { ascending: false })
    .limit(1);
  if (error) {
    if (isMissingTable(error)) return { draw: null, tableReady: false };
    throw new Error('raffle_draws: ' + error.message);
  }
  return { draw: data?.[0] ?? null, tableReady: true };
}

export async function saveDraw(participants: RaffleParticipant[], winners: RaffleWinner[]): Promise<RaffleDraw> {
  const { data, error } = await supabaseServer
    .from('raffle_draws')
    .insert([{ raffle_id: RAFFLE.id, participants, winners }])
    .select('drawn_at, participants, winners')
    .single();
  if (error || !data) throw new Error('raffle_draws: ' + (error?.message || 'итоги не сохранились'));
  return data;
}
