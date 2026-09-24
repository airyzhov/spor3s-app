// Розыгрыш 10.10 — правила без обращений к базе, чтобы их проверяли юнит-тесты.
// Дизайн: docs/superpowers/specs/2026-09-24-raffle-10-10-design.md

export const RAFFLE = {
  id: 'raffle-2026-10-10',
  title: 'Розыгрыш 10.10',
  startsAt: '2026-09-24T00:00:00Z', // друзья засчитываются с этого момента
  endsAt: '2026-10-11T00:00:00Z', // приём до 10.10 включительно, 23:59:59 GMT; сама граница не входит
  hideAfter: '2026-10-19T00:00:00Z', // через неделю после итогов кнопка на главной пропадает
  deadlineLabel: 'до 10 октября включительно (23:59 GMT — 02:59 11 октября по Москве)',
  drawDateLabel: '12 октября',
  winnersCount: 3,
};

export const SUBSCRIBE_TASK_TYPES = ['subscribe_telegram', 'subscribe_youtube', 'subscribe_instagram'];

// Друг «новый», если его запись users появилась не раньше чем за 10 минут до строки referrals:
// бот создаёт пользователя по клику на ссылку и сразу записывает приглашение.
export const NEW_FRIEND_SLACK_MS = 10 * 60 * 1000;

export type RaffleStage = 'open' | 'closed' | 'drawn' | 'hidden';
export type Prize = { code: 'one' | 'two' | 'set'; label: string };
export type FriendUser = { id: string; telegram_id: string | null; created_at: string };

export type RaffleParticipant = {
  user_id: string;
  name: string;
  username: string | null;
  telegram_id: string | null;
  tasks: number;
  friends: number;
  eligible: boolean;
  prize: Prize | null;
};
export type RaffleWinner = { user_id: string; name: string; friends: number; prize: Prize | null };
export type RaffleDraw = { drawn_at: string; participants: RaffleParticipant[]; winners: RaffleWinner[] };

// Ответ /api/raffle для кнопки на главной
export type RaffleMe = {
  tasks: number;
  friends: number;
  eligible: boolean;
  prize: Prize | null;
  next: { friendsNeeded: number; prize: Prize } | null;
};
export type RaffleView = {
  success: true;
  stage: RaffleStage;
  me: RaffleMe | null;
  winners: { name: string; prize: Prize | null }[] | null;
};

// Приз победителя по числу его друзей: 1–3 → 1 добавка, 4–5 → 2 добавки, 6+ → комплекс
const PRIZE_TIERS: { minFriends: number; prize: Prize }[] = [
  { minFriends: 1, prize: { code: 'one', label: '1 добавка на выбор' } },
  { minFriends: 4, prize: { code: 'two', label: '2 добавки на выбор' } },
  { minFriends: 6, prize: { code: 'set', label: 'комплекс добавок' } },
];

export function prizeForFriends(friends: number): Prize | null {
  let prize: Prize | null = null;
  for (const tier of PRIZE_TIERS) if (friends >= tier.minFriends) prize = tier.prize;
  return prize;
}

// Следующий приз и сколько друзей до него не хватает; null — приз уже максимальный
export function nextPrize(friends: number): { friendsNeeded: number; prize: Prize } | null {
  const tier = PRIZE_TIERS.find((t) => friends < t.minFriends);
  return tier ? { friendsNeeded: tier.minFriends - friends, prize: tier.prize } : null;
}

export function raffleStage(now: Date, hasDraw: boolean): RaffleStage {
  const t = now.getTime();
  if (t >= Date.parse(RAFFLE.hideAfter)) return 'hidden';
  if (hasDraw) return 'drawn';
  return t < Date.parse(RAFFLE.endsAt) ? 'open' : 'closed';
}

export function isEligible(tasks: number, friends: number): boolean {
  return tasks >= 1 && friends >= 1;
}

type TaskRow = { user_id: string; source_type: string; created_at: string };

// Сколько разных подписочных заданий каждый выполнил до конца приёма
export function countTasks(rows: TaskRow[]): Map<string, number> {
  const end = Date.parse(RAFFLE.endsAt);
  const done = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!SUBSCRIBE_TASK_TYPES.includes(r.source_type) || Date.parse(r.created_at) >= end) continue;
    if (!done.has(r.user_id)) done.set(r.user_id, new Set());
    done.get(r.user_id)!.add(r.source_type);
  }
  return new Map(Array.from(done, ([userId, types]) => [userId, types.size]));
}

type ReferralRow = { referrer_user_id: string; referred_user_id: string; created_at: string };

// Сколько друзей засчитано каждому пригласившему (правила — §2 спеки).
// openedApp — id тех, у кого есть строка ai_agent_status, то есть кто открывал мини-апп.
export function countFriends(
  referrals: ReferralRow[],
  users: Map<string, FriendUser>,
  openedApp: Set<string>,
): Map<string, number> {
  const start = Date.parse(RAFFLE.startsAt);
  const end = Date.parse(RAFFLE.endsAt);
  const counted = new Set<string>();
  const counts = new Map<string, number>();
  const ordered = referrals.slice().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const r of ordered) {
    const linkedAt = Date.parse(r.created_at);
    const friend = users.get(r.referred_user_id);
    if (linkedAt < start || linkedAt >= end) continue;
    if (!friend || friend.id === r.referrer_user_id || counted.has(friend.id)) continue;
    if (!/^\d+$/.test(String(friend.telegram_id ?? ''))) continue;
    if (Date.parse(friend.created_at) < linkedAt - NEW_FRIEND_SLACK_MS) continue;
    if (!openedApp.has(friend.id)) continue;
    counted.add(friend.id);
    counts.set(r.referrer_user_id, (counts.get(r.referrer_user_id) || 0) + 1);
  }
  return counts;
}

// Имя для показа: @логин, без логина — «участник …1234» (последние цифры Telegram ID)
export function publicName(username: string | null | undefined, telegramId: string | null | undefined): string {
  const login = String(username ?? '').replace(/^@/, '').trim();
  if (login) return '@' + login;
  const tg = String(telegramId ?? '').trim();
  return tg ? `участник …${tg.slice(-4)}` : 'участник';
}

// Все, у кого есть задание или друг: сначала участники, затем по числу друзей и заданий
export function buildParticipants(
  users: { id: string; username: string | null; telegram_id: string | null }[],
  taskCounts: Map<string, number>,
  friendCounts: Map<string, number>,
): RaffleParticipant[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  const ids = new Set([...Array.from(taskCounts.keys()), ...Array.from(friendCounts.keys())]);
  const list: RaffleParticipant[] = Array.from(ids).map((id) => {
    const u = byId.get(id);
    const tasks = taskCounts.get(id) || 0;
    const friends = friendCounts.get(id) || 0;
    const eligible = isEligible(tasks, friends);
    return {
      user_id: id,
      name: publicName(u?.username, u?.telegram_id),
      username: u?.username ? String(u.username).replace(/^@/, '') : null,
      telegram_id: u?.telegram_id ?? null,
      tasks,
      friends,
      eligible,
      prize: eligible ? prizeForFriends(friends) : null,
    };
  });
  return list.sort(
    (a, b) =>
      Number(b.eligible) - Number(a.eligible) ||
      b.friends - a.friends ||
      b.tasks - a.tasks ||
      a.name.localeCompare(b.name),
  );
}

// Равные шансы: частичное тасование Фишера — Йетса. randomInt(max) → целое из [0, max);
// генератор внедряется, чтобы тесты были детерминированными (на сервере — crypto.randomInt).
export function pickWinners<T>(pool: T[], count: number, randomInt: (maxExclusive: number) => number): T[] {
  const items = pool.slice();
  const n = Math.min(count, items.length);
  for (let i = 0; i < n; i++) {
    const j = i + randomInt(items.length - i);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, n);
}

// CSV для Excel с русской локалью: разделитель «;», UTF-8 с BOM, строки через CRLF
export function toCsv(rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    const s = String(value);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((row) => row.map(cell).join(';')).join('\r\n') + '\r\n';
}
