/**
 * @jest-environment node
 */
// Приветственные SC приглашённому: сразу, один раз и только тому, кто ещё не покупал
// (решение владельца 25.09). База — поддельная, в памяти.

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let patch: Row | null = null;
  const rows = () => (db[name] ||= []).filter((r) => filters.every((f) => f(r)));
  const run = async () => {
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
    limit: () => api,
    update: (p: Row) => { patch = p; return api; },
    insert: async (items: Row[]) => {
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

import { grantReferralWelcome, getInvitedBy } from '../referral';

const welcomes = (userId: string) =>
  db.sc_transactions.filter((t) => t.user_id === userId && t.source_type === 'referral_welcome');
const balance = (userId: string) => db.user_levels.find((l) => l.user_id === userId)?.current_sc_balance ?? 0;

beforeEach(() => {
  db.users = [
    { id: 'inviter', username: 'web3grow' },
    { id: 'friend', username: 'friend' },
    { id: 'noname', username: null },
  ];
  db.referrals = [{ id: 'ref-1', referrer_user_id: 'inviter', referred_user_id: 'friend', status: 'pending' }];
  db.orders = [];
  db.sc_transactions = [];
  db.user_levels = [];
});

describe('grantReferralWelcome', () => {
  it('приглашённому, который ещё не покупал, сразу начисляет 100 SC', async () => {
    await expect(grantReferralWelcome('friend')).resolves.toBe(true);
    expect(welcomes('friend')).toEqual([
      expect.objectContaining({ amount: 100, source_id: 'ref-1', description: 'Приветственный бонус: вас пригласил @web3grow' }),
    ]);
    expect(balance('friend')).toBe(100);
  });

  it('повторный вход бонус не задваивает', async () => {
    await grantReferralWelcome('friend');
    await expect(grantReferralWelcome('friend')).resolves.toBe(false);
    expect(welcomes('friend')).toHaveLength(1);
    expect(balance('friend')).toBe(100);
  });

  it('без приглашения ничего не начисляет', async () => {
    await expect(grantReferralWelcome('inviter')).resolves.toBe(false);
    expect(db.sc_transactions).toEqual([]);
  });

  it('тому, кто уже покупал, бонус не положен', async () => {
    db.orders = [{ id: 'o1', user_id: 'friend', status: 'completed', total: 1100 }];
    await expect(grantReferralWelcome('friend')).resolves.toBe(false);
    expect(db.sc_transactions).toEqual([]);
  });

  it('неоплаченные и отменённые заказы покупкой не считаются', async () => {
    db.orders = [
      { id: 'o1', user_id: 'friend', status: 'pending', total: 1100 },
      { id: 'o2', user_id: 'friend', status: 'cancelled', total: 1400 },
    ];
    await expect(grantReferralWelcome('friend')).resolves.toBe(true);
  });

  it('при оплате первого заказа сам этот заказ прежней покупкой не считается', async () => {
    db.orders = [{ id: 'o1', user_id: 'friend', status: 'paid', total: 1100 }];
    await expect(grantReferralWelcome('friend', { orderId: 'o1' })).resolves.toBe(true);
    expect(welcomes('friend')[0].source_id).toBe('o1');
  });

  it('при оплате, если раньше уже был оплаченный заказ, бонуса нет', async () => {
    db.orders = [
      { id: 'o1', user_id: 'friend', status: 'completed', total: 1100 },
      { id: 'o2', user_id: 'friend', status: 'paid', total: 3000 },
    ];
    await expect(grantReferralWelcome('friend', { orderId: 'o2' })).resolves.toBe(false);
  });
});

describe('getInvitedBy', () => {
  it('имя пригласившего и сколько приветственных SC уже начислено', async () => {
    await expect(getInvitedBy('friend')).resolves.toEqual({ name: '@web3grow', welcomeSc: 0 });
    await grantReferralWelcome('friend');
    await expect(getInvitedBy('friend')).resolves.toEqual({ name: '@web3grow', welcomeSc: 100 });
  });

  it('у пригласившего без username — «друг»', async () => {
    db.referrals[0].referrer_user_id = 'noname';
    await expect(getInvitedBy('friend')).resolves.toEqual({ name: 'друг', welcomeSc: 0 });
  });

  it('не приглашён — null', async () => {
    await expect(getInvitedBy('inviter')).resolves.toBeNull();
  });
});
