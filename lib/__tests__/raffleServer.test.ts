/**
 * @jest-environment node
 */
// Розыгрыш 10.10 с 28.09: участие = задание + «Участвую» (raffle_entries), друг засчитывается,
// только если открыл мини-приложение, рассылка о розыгрыше не уходит одному человеку дважды
// (raffle_notices). База и Telegram — поддельные.

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const missing = new Set<string>();
const MISSING = { code: 'PGRST205', message: "Could not find the table 'public.x' in the schema cache" };

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = [];
  const rows = () => (db[name] ||= []).filter((r) => filters.every((f) => f(r)));
  const result = (data: unknown) => Promise.resolve(missing.has(name) ? { data: null, error: MISSING } : { data, error: null });
  const api: any = {
    select: () => api,
    eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return api; },
    in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return api; },
    gte: (c: string, v: string) => { filters.push((r) => r[c] >= v); return api; },
    lt: (c: string, v: string) => { filters.push((r) => r[c] < v); return api; },
    order: () => api,
    limit: () => api,
    maybeSingle: () => result(rows()[0] ?? null),
    insert: (items: Row[]) => {
      if (!missing.has(name)) items.forEach((i) => (db[name] ||= []).push({ ...i }));
      return result(null);
    },
    upsert: (items: Row[], opts: { onConflict: string }) => {
      if (!missing.has(name)) {
        const keys = opts.onConflict.split(',');
        for (const i of items) {
          const dup = (db[name] ||= []).some((r) => keys.every((k) => r[k] === i[k]));
          if (!dup) db[name].push({ ...i });
        }
      }
      return result(null);
    },
    then: (res: any, rej: any) => result(rows()).then(res, rej),
  };
  return api;
}

jest.mock('../../app/supabaseServerClient', () => ({ supabaseServer: { from: (name: string) => table(name) } }));

import { RAFFLE } from '../raffle';
import { getUserProgress, joinRaffle, announceRaffle, announceAudience, listParticipants, RaffleJoinError } from '../raffleServer';

const DURING = new Date('2026-09-30T12:00:00Z');
const AFTER = new Date(RAFFLE.endsAt);
const task = (user_id: string) => ({ user_id, source_type: 'subscribe_telegram', created_at: '2026-09-25T10:00:00Z', amount: 30 });
const opened = { last_activity: '2026-09-30T12:05:00Z', created_at: '2026-09-30T12:00:00Z' };
const triggerOnly = { last_activity: '2026-09-30T12:00:00Z', created_at: '2026-09-30T12:00:00Z' };

let telegram: { chat_id: string; text: string }[];
let blocked: Set<string>;

beforeEach(() => {
  missing.clear();
  db.users = [
    { id: 'host', username: 'host', telegram_id: '5554098114', created_at: '2026-08-30T10:00:00Z' },
    { id: 'f1', username: null, telegram_id: '7000000001', created_at: '2026-09-30T11:59:58Z' },
    { id: 'f2', username: null, telegram_id: '7000000002', created_at: '2026-09-30T11:59:58Z' },
    { id: 'fan', username: 'fan', telegram_id: '7000000003', created_at: '2026-08-30T10:00:00Z' },
    { id: 'guest', username: null, telegram_id: 'guest-1', created_at: '2026-08-30T10:00:00Z' },
  ];
  db.sc_transactions = [task('host')];
  db.referrals = [
    { referrer_user_id: 'host', referred_user_id: 'f1', created_at: '2026-09-30T12:00:00Z' },
    { referrer_user_id: 'host', referred_user_id: 'f2', created_at: '2026-09-30T12:00:00Z' },
  ];
  db.ai_agent_status = [
    { user_id: 'f1', ...opened }, // открыл магазин
    { user_id: 'f2', ...triggerOnly }, // только нажал Start в боте — строку создал триггер
  ];
  db.raffle_entries = [];
  db.raffle_notices = [];

  telegram = [];
  blocked = new Set();
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  (global as any).fetch = jest.fn(async (_url: string, opts: any) => {
    const body = JSON.parse(opts.body);
    telegram.push({ chat_id: body.chat_id, text: body.text });
    const ok = !blocked.has(body.chat_id);
    return { ok, status: ok ? 200 : 403, text: async () => (ok ? '' : 'Forbidden: bot can\'t initiate conversation') };
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('прогресс участника', () => {
  it('друг засчитан, только если открыл магазин; «Участвую» ещё не нажато', async () => {
    await expect(getUserProgress('host')).resolves.toEqual({ tasks: 1, friends: 1, joined: false });
  });
});

describe('кнопка «Участвую»', () => {
  it('после задания — участвует; приз по друзьям (1 друг → 2 добавки)', async () => {
    const me = await joinRaffle('host', DURING);
    expect(me).toMatchObject({ tasks: 1, friends: 1, joined: true, eligible: true, prize: { code: 'two' } });
    expect(db.raffle_entries).toEqual([expect.objectContaining({ raffle_id: RAFFLE.id, user_id: 'host' })]);
  });

  it('повторное нажатие — не ошибка и без второй строки', async () => {
    await joinRaffle('host', DURING);
    await expect(joinRaffle('host', DURING)).resolves.toMatchObject({ joined: true });
    expect(db.raffle_entries).toHaveLength(1);
  });

  it('без задания — 400', async () => {
    const e = await joinRaffle('fan', DURING).catch((x) => x);
    expect(e).toBeInstanceOf(RaffleJoinError);
    expect([e.status, e.message]).toEqual([400, 'Сначала выполни задание на подписку']);
    expect(db.raffle_entries).toEqual([]);
  });

  it('после конца приёма — 409', async () => {
    const e = await joinRaffle('host', AFTER).catch((x) => x);
    expect([e.status, e.message]).toEqual([409, 'Приём заявок закрыт']);
  });

  it('таблица ещё не создана — 503 «скоро»', async () => {
    missing.add('raffle_entries');
    const e = await joinRaffle('host', DURING).catch((x) => x);
    expect([e.status, e.message]).toEqual([503, 'Скоро можно будет нажать «Участвую»']);
  });

  it('в списке для админки нажавший — участник', async () => {
    await joinRaffle('host', DURING);
    const [host] = await listParticipants();
    expect(host).toMatchObject({ user_id: 'host', tasks: 1, friends: 1, joined: true, eligible: true });
  });
});

describe('рассылка о розыгрыше', () => {
  it('всем пользователям Telegram без «Участвую»: выполнившим задание — «осталось нажать»', async () => {
    await joinRaffle('host', DURING); // уже участвует — не пишем
    await expect(announceAudience()).resolves.toEqual({ tableReady: true, pending: 3 });

    const result = await announceRaffle({ now: DURING, pause: 0 });
    expect(result).toEqual({ sent: 3, failed: 0 });
    expect(telegram.map((m) => m.chat_id).sort()).toEqual(['7000000001', '7000000002', '7000000003']);
    expect(telegram.every((m) => m.text.includes('Нажми «✋ Участвую»'))).toBe(true);
    expect(db.raffle_notices).toHaveLength(3);
  });

  it('выполнившему задание — строка «осталось нажать»', async () => {
    db.sc_transactions.push(task('fan'));
    await announceRaffle({ now: DURING, pause: 0 });
    const fan = telegram.find((m) => m.chat_id === '7000000003')!;
    expect(fan.text).toContain('Задание у тебя уже выполнено');
    const f1 = telegram.find((m) => m.chat_id === '7000000001')!;
    expect(f1.text).not.toContain('Задание у тебя уже выполнено');
  });

  it('второе нажатие никому не пишет повторно', async () => {
    await announceRaffle({ now: DURING, pause: 0 });
    telegram = [];
    await expect(announceRaffle({ now: DURING, pause: 0 })).resolves.toEqual({ sent: 0, failed: 0 });
    expect(telegram).toEqual([]);
    await expect(announceAudience()).resolves.toEqual({ tableReady: true, pending: 0 });
  });

  it('не запускал бота (403) — считается «не дошло», но повторно не пробуем', async () => {
    blocked.add('7000000002');
    await expect(announceRaffle({ now: DURING, pause: 0 })).resolves.toEqual({ sent: 3, failed: 1 });
    await expect(announceAudience()).resolves.toEqual({ tableReady: true, pending: 0 });
  });

  it('без таблиц — 409 и ничего не отправлено', async () => {
    missing.add('raffle_notices');
    await expect(announceAudience()).resolves.toEqual({ tableReady: false, pending: 0 });
    const e = await announceRaffle({ now: DURING, pause: 0 }).catch((x) => x);
    expect(e.status).toBe(409);
    expect(telegram).toEqual([]);
  });

  it('после конца приёма — 409', async () => {
    const e = await announceRaffle({ now: AFTER, pause: 0 }).catch((x) => x);
    expect([e.status, e.message]).toEqual([409, 'Приём заявок закрыт']);
  });
});
