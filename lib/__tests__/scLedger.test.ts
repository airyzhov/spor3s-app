/**
 * @jest-environment node
 */
// Операции с SC и сообщение в боте о каждой из них (решение владельца 30.09): бот пишет сумму,
// за что и новый баланс; без Telegram ID и без токена — молчит; отказ Telegram не ломает начисление.
// База и Telegram — поддельные.

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const failing = new Set<string>(); // таблицы, запись в которые «падает»

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let patch: Row | null = null;
  let sort: { col: string; asc: boolean } | null = null;
  let max = Infinity;
  const rows = () => {
    let out = (db[name] ||= []).filter((r) => filters.every((f) => f(r)));
    if (sort) {
      const { col, asc } = sort;
      out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
    }
    return out.slice(0, max);
  };
  const run = async () => {
    if (patch) {
      if (failing.has(name)) return { data: null, error: { message: `${name}: update failed` } };
      rows().forEach((r) => Object.assign(r, patch));
      return { data: null, error: null };
    }
    return { data: rows(), error: null };
  };
  const api: any = {
    select: () => api,
    eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return api; },
    in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return api; },
    order: (col: string, opts?: { ascending?: boolean }) => { sort = { col, asc: opts?.ascending !== false }; return api; },
    limit: (n: number) => { max = n; return api; },
    update: (p: Row) => { patch = p; return api; },
    insert: async (items: Row[]) => {
      if (failing.has(name)) return { data: null, error: { message: `${name}: insert failed` } };
      const t = (db[name] ||= []);
      items.forEach((i) => t.push({ id: `${name}-${t.length + 1}`, ...i }));
      return { data: null, error: null };
    },
    single: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: r.data?.[0] ? null : { code: 'PGRST116' } })),
    maybeSingle: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: null })),
    then: (res: any, rej: any) => run().then(res, rej),
  };
  return api;
}

jest.mock('../../app/supabaseServerClient', () => ({ supabaseServer: { from: (name: string) => table(name) } }));

import { creditSC } from '../referral';
import { manualAdjustSC, spendScForOrder } from '../scLedger';

const HISTORY_BUTTON = { inline_keyboard: [[{ text: '🧾 История SC', web_app: { url: 'https://ai.spor3s.ru/?open=sc' } }]] };
const level = (userId: string) => db.user_levels.find((l) => l.user_id === userId);

let sent: { chat_id: string; text: string; reply_markup: unknown }[];
let telegram: 'ok' | 'forbidden' | 'down';

beforeEach(() => {
  failing.clear();
  db.users = [
    { id: 'buyer', telegram_id: '1688404602', username: 'Lopata03' },
    { id: 'fresh', telegram_id: '5550001234', username: null },
    { id: 'guest', telegram_id: 'guest-1', username: null },
  ];
  db.user_levels = [
    { user_id: 'buyer', current_sc_balance: 100, total_sc_earned: 100, total_sc_spent: 0, level_code: 'novice' },
  ];
  db.sc_transactions = [];
  db.orders = [];

  sent = [];
  telegram = 'ok';
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  (global as any).fetch = jest.fn(async (_url: string, opts: any) => {
    if (telegram === 'down') throw new Error('fetch failed');
    const body = JSON.parse(opts.body);
    sent.push({ chat_id: body.chat_id, text: body.text, reply_markup: body.reply_markup });
    const ok = telegram === 'ok';
    return { ok, status: ok ? 200 : 403, text: async () => (ok ? '' : "Forbidden: bot can't initiate conversation") };
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.TELEGRAM_BOT_TOKEN;
});

describe('creditSC — сообщение в боте о начислении', () => {
  it('сумма, за что и новый баланс, кнопка «История SC»', async () => {
    await creditSC({ userId: 'buyer', amount: 30, sourceType: 'subscribe_telegram', description: 'Бонус за задание: Telegram канал' });
    expect(level('buyer')?.current_sc_balance).toBe(130);
    expect(sent).toEqual([{
      chat_id: '1688404602',
      text: '💰 <b>+30 SC</b> — Бонус за задание: Telegram канал\nБаланс: <b>130 SC</b>',
      reply_markup: HISTORY_BUTTON,
    }]);
  });

  it('первое начисление (строки уровня ещё нет) — баланс равен сумме', async () => {
    await creditSC({ userId: 'fresh', amount: 100, sourceType: 'referral_welcome', description: 'Приветственный бонус: вас пригласил @Lopata03' });
    expect(level('fresh')?.current_sc_balance).toBe(100);
    expect(sent.map((m) => m.text)).toEqual(['💰 <b>+100 SC</b> — Приветственный бонус: вас пригласил @Lopata03\nБаланс: <b>100 SC</b>']);
  });

  it('без числового Telegram ID — начисляем молча', async () => {
    await creditSC({ userId: 'guest', amount: 30, sourceType: 'survey', description: 'Опрос' });
    expect(level('guest')?.current_sc_balance).toBe(30);
    expect(sent).toEqual([]);
  });

  it('без токена бота — не пишем', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await creditSC({ userId: 'buyer', amount: 30, sourceType: 'survey', description: 'Опрос' });
    expect(level('buyer')?.current_sc_balance).toBe(130);
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('Telegram отказал (не запускал бота) — начисление всё равно прошло', async () => {
    telegram = 'forbidden';
    await expect(creditSC({ userId: 'buyer', amount: 30, sourceType: 'survey', description: 'Опрос' })).resolves.toBeUndefined();
    expect(level('buyer')?.current_sc_balance).toBe(130);
    expect(db.sc_transactions).toHaveLength(1);
  });

  it('Telegram недоступен — начисление всё равно прошло', async () => {
    telegram = 'down';
    await expect(creditSC({ userId: 'buyer', amount: 30, sourceType: 'survey', description: 'Опрос' })).resolves.toBeUndefined();
    expect(level('buyer')?.current_sc_balance).toBe(130);
  });
});

describe('manualAdjustSC — ручная операция из админки', () => {
  it('начисление с комментарием: запись «вручную», баланс, сообщение с комментарием', async () => {
    await expect(manualAdjustSC({ userId: 'buyer', amount: 50, description: 'Компенсация за доставку' })).resolves.toBe(150);
    expect(db.sc_transactions).toEqual([expect.objectContaining({
      user_id: 'buyer', amount: 50, transaction_type: 'earned', source_type: 'manual', description: 'Компенсация за доставку',
    })]);
    expect(level('buyer')).toMatchObject({ current_sc_balance: 150, total_sc_earned: 150, total_sc_spent: 0 });
    expect(sent.map((m) => m.text)).toEqual(['💰 <b>+50 SC</b> — Компенсация за доставку\nБаланс: <b>150 SC</b>']);
  });

  it('списание без комментария — «Списание магазином»', async () => {
    await expect(manualAdjustSC({ userId: 'buyer', amount: -20 })).resolves.toBe(80);
    expect(db.sc_transactions).toEqual([expect.objectContaining({
      amount: -20, transaction_type: 'spent', source_type: 'manual', description: 'Списание магазином',
    })]);
    expect(level('buyer')).toMatchObject({ current_sc_balance: 80, total_sc_earned: 100, total_sc_spent: 20 });
    expect(sent.map((m) => m.text)).toEqual(['💸 <b>−20 SC</b> — Списание магазином\nБаланс: <b>80 SC</b>']);
  });

  it('начисление без комментария — «Начисление от магазина»', async () => {
    await manualAdjustSC({ userId: 'buyer', amount: 10, description: '   ' });
    expect(db.sc_transactions[0].description).toBe('Начисление от магазина');
  });

  it('галочка «Уведомить в боте» снята — без сообщения', async () => {
    await manualAdjustSC({ userId: 'buyer', amount: 10, notify: false });
    expect(level('buyer')?.current_sc_balance).toBe(110);
    expect(sent).toEqual([]);
  });

  it('у человека ещё нет строки уровня — создаём с балансом', async () => {
    await expect(manualAdjustSC({ userId: 'fresh', amount: 25 })).resolves.toBe(25);
    expect(level('fresh')).toMatchObject({ current_sc_balance: 25, total_sc_earned: 25, total_sc_spent: 0 });
  });

  it('операция не записалась — ошибка, баланс прежний, без сообщения', async () => {
    failing.add('sc_transactions');
    await expect(manualAdjustSC({ userId: 'buyer', amount: 50 })).rejects.toThrow('sc_transactions');
    expect(level('buyer')?.current_sc_balance).toBe(100);
    expect(sent).toEqual([]);
  });
});

describe('spendScForOrder — списание SC при заказе', () => {
  const ORDER_ID = '03d1710f-ffe0-4b2c-8555-b784f6e34b80';

  it('запись с номером заказа, баланс и сообщение с коротким номером', async () => {
    await spendScForOrder({ userId: 'buyer', orderId: ORDER_ID, coins: 40, balanceBefore: 100, spentBefore: 0 });
    expect(db.sc_transactions).toEqual([expect.objectContaining({
      user_id: 'buyer', amount: -40, transaction_type: 'spent', source_type: 'order_discount',
      description: `Списание SC для заказа #${ORDER_ID}`,
    })]);
    expect(level('buyer')).toMatchObject({ current_sc_balance: 60, total_sc_spent: 40 });
    expect(sent.map((m) => m.text)).toEqual(['💸 <b>−40 SC</b> — Списание SC для заказа #03d1710f\nБаланс: <b>60 SC</b>']);
  });

  it('списание не записалось — баланс не трогаем и не пишем', async () => {
    failing.add('sc_transactions');
    await spendScForOrder({ userId: 'buyer', orderId: ORDER_ID, coins: 40, balanceBefore: 100, spentBefore: 0 });
    expect(level('buyer')?.current_sc_balance).toBe(100);
    expect(sent).toEqual([]);
  });

  it('баланс не обновился — не пишем (в сообщении был бы неверный баланс)', async () => {
    failing.add('user_levels');
    await spendScForOrder({ userId: 'buyer', orderId: ORDER_ID, coins: 40, balanceBefore: 100, spentBefore: 0 });
    expect(sent).toEqual([]);
  });
});
