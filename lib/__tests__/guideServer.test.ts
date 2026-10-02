/**
 * @jest-environment node
 */
// Гид новичка: +100 SC за прохождение — один раз, только при верных ответах и только существующему
// пользователю. Бот пишет о начислении, как при любом SC. База и Telegram — поддельные.

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const failing = new Set<string>(); // таблицы, чтение из которых «падает»

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let patch: Row | null = null;
  let max = Infinity;
  const rows = () => (db[name] ||= []).filter((r) => filters.every((f) => f(r))).slice(0, max);
  const run = async () => {
    if (failing.has(name)) return { data: null, error: { message: `${name}: read failed` } };
    if (patch) {
      rows().forEach((r) => Object.assign(r, patch));
      return { data: null, error: null };
    }
    return { data: rows(), error: null };
  };
  const api: any = {
    select: () => api,
    eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return api; },
    in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return api; },
    order: () => api,
    limit: (n: number) => { max = n; return api; },
    update: (p: Row) => { patch = p; return api; },
    insert: async (items: Row[]) => {
      const t = (db[name] ||= []);
      items.forEach((i) => t.push({ id: `${name}-${t.length + 1}`, ...i }));
      return { data: null, error: null };
    },
    single: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: r.data?.[0] ? null : { code: 'PGRST116' } })),
    maybeSingle: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })),
    then: (res: any, rej: any) => run().then(res, rej),
  };
  return api;
}

jest.mock('../../app/supabaseServerClient', () => ({ supabaseServer: { from: (name: string) => table(name) } }));

import { guideCompleted, completeGuide } from '../guideServer';
import { GUIDE_LESSONS } from '../newbieGuide';

const RIGHT = GUIDE_LESSONS.map((l) => l.question.correct);
const level = (userId: string) => db.user_levels.find((l) => l.user_id === userId);
let sent: string[];

beforeEach(() => {
  failing.clear();
  db.users = [{ id: 'newbie', telegram_id: '5550001234', username: 'newbie' }];
  db.user_levels = [{ user_id: 'newbie', current_sc_balance: 30, total_sc_earned: 30, total_sc_spent: 0, level_code: 'novice' }];
  db.sc_transactions = [{ id: 't0', user_id: 'newbie', amount: 30, source_type: 'subscribe_telegram' }];
  db.orders = [];

  sent = [];
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  (global as any).fetch = jest.fn(async (_url: string, opts: any) => {
    sent.push(JSON.parse(opts.body).text);
    return { ok: true, status: 200, text: async () => '' };
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.TELEGRAM_BOT_TOKEN;
});

describe('guideCompleted', () => {
  it('нет операции гида — не пройден; есть — пройден', async () => {
    expect(await guideCompleted('newbie')).toBe(false);
    db.sc_transactions.push({ id: 't1', user_id: 'newbie', amount: 100, source_type: 'newbie_guide' });
    expect(await guideCompleted('newbie')).toBe(true);
    expect(await guideCompleted('other')).toBe(false);
  });

  it('база не ответила — ошибка, а не «не пройден»', async () => {
    failing.add('sc_transactions');
    await expect(guideCompleted('newbie')).rejects.toThrow('sc_transactions');
  });
});

describe('completeGuide', () => {
  it('все ответы верные — +100 SC, запись гида и сообщение бота', async () => {
    await expect(completeGuide('newbie', RIGHT)).resolves.toEqual({ ok: true, credited: true });
    expect(db.sc_transactions).toContainEqual(expect.objectContaining({
      user_id: 'newbie', amount: 100, transaction_type: 'earned', source_type: 'newbie_guide', description: 'Гид новичка пройден',
    }));
    expect(level('newbie')?.current_sc_balance).toBe(130);
    expect(sent).toEqual(['💰 <b>+100 SC</b> — Гид новичка пройден\nБаланс: <b>130 SC</b>']);
  });

  it('повтор — без второго начисления', async () => {
    await completeGuide('newbie', RIGHT);
    await expect(completeGuide('newbie', RIGHT)).resolves.toEqual({ ok: true, credited: false });
    expect(db.sc_transactions.filter((t) => t.source_type === 'newbie_guide')).toHaveLength(1);
    expect(level('newbie')?.current_sc_balance).toBe(130);
  });

  it('неверный ответ — ничего не начисляем', async () => {
    const wrong = [...RIGHT];
    wrong[3] = (wrong[3] + 1) % 3;
    await expect(completeGuide('newbie', wrong)).resolves.toEqual({ ok: false, reason: 'answers' });
    await expect(completeGuide('newbie', 'всё верно')).resolves.toEqual({ ok: false, reason: 'answers' });
    expect(db.sc_transactions).toHaveLength(1);
    expect(sent).toEqual([]);
  });

  it('такого пользователя нет — ничего не начисляем', async () => {
    await expect(completeGuide('ghost', RIGHT)).resolves.toEqual({ ok: false, reason: 'user' });
    expect(db.sc_transactions).toHaveLength(1);
    expect(db.user_levels.find((l) => l.user_id === 'ghost')).toBeUndefined();
  });
});
