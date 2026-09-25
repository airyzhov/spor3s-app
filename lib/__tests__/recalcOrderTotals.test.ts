/**
 * @jest-environment node
 */
// Сумма заказов для уровня — только оплаченные заказы (paid / shipped / completed).
// Пересчёт пишет её в user_levels и сразу пересчитывает уровень. База — поддельная, в памяти.

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};

function table(name: string) {
  const filters: [string, unknown][] = [];
  let patch: Row | null = null;
  const run = async () => {
    const rows = (db[name] ||= []).filter((r) => filters.every(([c, v]) => r[c] === v));
    if (patch) {
      rows.forEach((r) => Object.assign(r, patch));
      return { data: null, error: null };
    }
    return { data: rows, error: null };
  };
  const api: any = {
    select: () => api,
    eq: (c: string, v: unknown) => { filters.push([c, v]); return api; },
    update: (p: Row) => { patch = p; return api; },
    single: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: r.data?.[0] ? null : { code: 'PGRST116' } })),
    maybeSingle: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: null })),
    then: (res: any, rej: any) => run().then(res, rej),
  };
  return api;
}

jest.mock('../../app/supabaseServerClient', () => ({ supabaseServer: { from: (name: string) => table(name) } }));

import { recalcOrderTotals } from '../referral';

beforeEach(() => {
  db.orders = [
    { user_id: 'u1', status: 'pending', total: 20000 },
    { user_id: 'u1', status: 'shipped', total: 3000 },
    { user_id: 'u1', status: 'cancelled', total: 5000 },
    { user_id: 'u2', status: 'paid', total: 9999 },
  ];
  db.user_levels = [
    { user_id: 'u1', level_code: 'novice', total_sc_earned: 150, total_orders_amount: 28000, orders_count: 3 },
  ];
});

it('оставляет в сумме только оплаченные заказы клиента и пересчитывает уровень', async () => {
  await recalcOrderTotals('u1');
  expect(db.user_levels[0]).toMatchObject({
    total_orders_amount: 3000,
    orders_count: 1,
    level_code: 'collector', // 150 SC и 1 оплаченный заказ
  });
});

it('неоплаченный заказ на 20 000 ₽ не поднимает до Легенды', async () => {
  db.user_levels[0].total_sc_earned = 1000;
  await recalcOrderTotals('u1');
  expect(db.user_levels[0].level_code).toBe('collector');
});
