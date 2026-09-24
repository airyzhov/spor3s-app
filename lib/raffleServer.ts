import { supabaseServer } from '../app/supabaseServerClient';
import {
  RAFFLE,
  SUBSCRIBE_TASK_TYPES,
  countTasks,
  countFriends,
  buildParticipants,
  type FriendUser,
  type RaffleParticipant,
  type RaffleWinner,
  type RaffleDraw,
} from './raffle';

// Запросы розыгрыша к базе. Правила подсчёта — в lib/raffle.ts.

// Друзья, засчитанные пригласившим; referrerIds = null — все пригласившие (для админки)
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
    supabaseServer.from('ai_agent_status').select('user_id').in('user_id', friendIds),
  ]);
  if (usersRes.error) throw new Error('users: ' + usersRes.error.message);
  if (openedRes.error) throw new Error('ai_agent_status: ' + openedRes.error.message);

  const users = new Map<string, FriendUser>((usersRes.data || []).map((u) => [u.id, u]));
  const opened = new Set<string>((openedRes.data || []).map((a) => a.user_id));
  return countFriends(referrals || [], users, opened);
}

export async function getUserProgress(userId: string): Promise<{ tasks: number; friends: number }> {
  const [tasksRes, friends] = await Promise.all([
    supabaseServer
      .from('sc_transactions')
      .select('user_id, source_type, created_at')
      .eq('user_id', userId)
      .in('source_type', SUBSCRIBE_TASK_TYPES),
    friendCounts([userId]),
  ]);
  if (tasksRes.error) throw new Error('sc_transactions: ' + tasksRes.error.message);
  return {
    tasks: countTasks(tasksRes.data || []).get(userId) || 0,
    friends: friends.get(userId) || 0,
  };
}

export async function listParticipants(): Promise<RaffleParticipant[]> {
  const [tasksRes, friends] = await Promise.all([
    supabaseServer
      .from('sc_transactions')
      .select('user_id, source_type, created_at')
      .in('source_type', SUBSCRIBE_TASK_TYPES),
    friendCounts(null),
  ]);
  if (tasksRes.error) throw new Error('sc_transactions: ' + tasksRes.error.message);
  const tasks = countTasks(tasksRes.data || []);

  const ids = Array.from(new Set([...Array.from(tasks.keys()), ...Array.from(friends.keys())]));
  if (!ids.length) return [];
  const { data: users, error } = await supabaseServer.from('users').select('id, username, telegram_id').in('id', ids);
  if (error) throw new Error('users: ' + error.message);
  return buildParticipants(users || [], tasks, friends);
}

// Нет таблицы raffle_draws (raffle_draws.sql ещё не выполнен) — это не ошибка, а tableReady: false
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|could not find the table/i.test(error.message || '')
  );
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
