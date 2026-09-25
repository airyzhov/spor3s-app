/**
 * @jest-environment node
 */
// Сервер привычки на поддельной базе в памяти: неделю считает сервер, второй отчёт за неделю
// не проходит, SC начисляются один раз и только за «получилось», законченная привычка уступает новой.

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
let nextId = 1;
const UNIQUE: Record<string, string[]> = { weekly_habit_reports: ['habit_id', 'week_number'] };
const missingTables = new Set<string>();

function table(name: string) {
  const filters: [string, unknown][] = [];
  let mode: 'select' | 'insert' | 'update' = 'select';
  let payload: any;
  let order: { col: string; asc: boolean } | null = null;
  let limit: number | null = null;

  const run = async (): Promise<{ data: any; error: any }> => {
    if (missingTables.has(name)) return { data: null, error: { code: 'PGRST205', message: 'missing table' } };
    const rows = (db[name] ||= []);
    const match = (r: Row) => filters.every(([c, v]) => r[c] === v);
    if (mode === 'insert') {
      const inserted: Row[] = [];
      for (const item of payload) {
        const key = UNIQUE[name];
        if (key && rows.some((r) => key.every((k) => r[k] === item[k]))) {
          return { data: null, error: { code: '23505', message: 'duplicate' } };
        }
        const row = { id: `id-${nextId++}`, ...item };
        rows.push(row);
        inserted.push(row);
      }
      return { data: inserted, error: null };
    }
    if (mode === 'update') {
      rows.filter(match).forEach((r) => Object.assign(r, payload));
      return { data: null, error: null };
    }
    let out = rows.filter(match);
    if (order) {
      const { col, asc } = order;
      out = out.slice().sort((a, b) => (a[col] < b[col] ? -1 : 1) * (asc ? 1 : -1));
    }
    if (limit != null) out = out.slice(0, limit);
    return { data: out, error: null };
  };

  const api: any = {
    select: () => api,
    eq: (c: string, v: unknown) => { filters.push([c, v]); return api; },
    order: (col: string, opts?: { ascending?: boolean }) => { order = { col, asc: opts?.ascending !== false }; return api; },
    limit: (n: number) => { limit = n; return api; },
    insert: (items: Row[]) => { mode = 'insert'; payload = items; return api; },
    update: (patch: Row) => { mode = 'update'; payload = patch; return api; },
    maybeSingle: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })),
    single: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })),
    then: (res: any, rej: any) => run().then(res, rej),
  };
  return api;
}

jest.mock('../../app/supabaseServerClient', () => ({ supabaseServer: { from: (name: string) => table(name) } }));
const creditSC = jest.fn().mockResolvedValue(undefined);
jest.mock('../referral', () => ({ creditSC: (...args: any[]) => creditSC(...args) }));

import { getHabitView, startHabit, submitHabitReport, HabitError } from '../habitServer';

const USER = 'u1';
const T0 = new Date('2026-09-25T10:00:00Z');
const day = (n: number) => new Date(T0.getTime() + n * 24 * 60 * 60 * 1000);

function seed({ sc = 150, amount = 1000, count = 1 } = {}) {
  for (const k of Object.keys(db)) delete db[k];
  missingTables.clear();
  creditSC.mockClear();
  db.user_levels = [{ user_id: USER, total_sc_earned: sc, total_orders_amount: amount, orders_count: count }];
  db.predefined_habits = [{ id: 'p1', name: 'Прогулка 30 минут', description: 'Каждый день', icon: '🚶', is_active: true, sort_order: 1 }];
}

const expectHabitError = async (p: Promise<unknown>, status: number, text: RegExp) => {
  await expect(p).rejects.toBeInstanceOf(HabitError);
  await p.catch((e: HabitError) => {
    expect(e.status).toBe(status);
    expect(e.message).toMatch(text);
  });
};

beforeEach(() => seed());

it('без уровня Собиратель привычку не начать', async () => {
  seed({ sc: 1000, amount: 0, count: 0 });
  await expectHabitError(startHabit(USER, 'Прогулка 30 минут', T0), 403, /Собиратель/);
  const view = await getHabitView(USER, T0);
  expect(view).toMatchObject({ access: false, needs: { ordersCount: 1 } });
});

it('начинает готовую привычку, вторую поверх идущей — нет', async () => {
  const view = await startHabit(USER, '  Прогулка   30 минут ', T0);
  expect(view.habit).toMatchObject({ habit_name: 'Прогулка 30 минут', habit_type: 'predefined', description: 'Каждый день' });
  expect(view.status).toMatchObject({ week: 1, canReport: true });
  await expectHabitError(startHabit(USER, 'Медитация', day(3)), 409, /Сейчас идёт привычка/);
});

it('отчёт: неделю считает сервер, SC — один раз и только за «получилось»', async () => {
  await startHabit(USER, 'Прогулка 30 минут', T0);

  const r1 = await submitHabitReport(USER, true, 'гулял', day(1));
  expect(r1).toMatchObject({ scEarned: 25, week: 1 });
  expect(creditSC).toHaveBeenCalledTimes(1);
  const report1 = db.weekly_habit_reports[0];
  expect(creditSC).toHaveBeenCalledWith(expect.objectContaining({ userId: USER, amount: 25, sourceType: 'habit_week', sourceId: report1.id }));

  await expectHabitError(submitHabitReport(USER, true, '', day(2)), 409, /неделю 1 уже есть/);
  expect(creditSC).toHaveBeenCalledTimes(1);

  const r2 = await submitHabitReport(USER, false, '', day(8));
  expect(r2).toMatchObject({ scEarned: 0, week: 2 });
  expect(creditSC).toHaveBeenCalledTimes(1);
  expect(r2.view.status?.weeks).toEqual(['done', 'missed', 'upcoming', 'upcoming']);
});

it('законченная привычка не принимает отчёты и уступает место новой', async () => {
  await startHabit(USER, 'Прогулка 30 минут', T0);
  await expectHabitError(submitHabitReport(USER, true, '', day(29)), 409, /закончилась/);

  const view = await startHabit(USER, 'Английский 15 минут', day(29));
  expect(view.habit).toMatchObject({ habit_name: 'Английский 15 минут', habit_type: 'custom' });
  expect(db.user_habits.filter((h) => h.is_active)).toHaveLength(1);
});

it('пока таблиц нет — tableReady false, а не ошибка', async () => {
  missingTables.add('user_habits');
  const view = await getHabitView(USER, T0);
  expect(view).toMatchObject({ tableReady: false, habit: null });
});
