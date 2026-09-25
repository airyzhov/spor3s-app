/**
 * @jest-environment node
 */
// Поле «Код друга» в кабинете: пришедший без ссылки вводит @username или Telegram ID пригласившего
// и сразу получает приветственные SC (решение владельца 25.09). База — поддельная, в памяти.

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};

// SQL LIKE → RegExp: % — любые символы, _ — один символ, \x — сам символ x
function likeToRegExp(pattern: string): RegExp {
  const lit = (ch: string) => ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\' && i + 1 < pattern.length) out += lit(pattern[++i]);
    else if (ch === '%') out += '.*';
    else if (ch === '_') out += '.';
    else out += lit(ch);
  }
  return new RegExp(`^${out}$`, 'i');
}

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
    ilike: (c: string, p: string) => { const re = likeToRegExp(p); filters.push((r) => re.test(String(r[c] ?? ''))); return api; },
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

import { parseInviterCode, ownReferralCode, claimReferral, canEnterInviterCode, ReferralClaimError } from '../referral';

const welcomes = (userId: string) =>
  db.sc_transactions.filter((t) => t.user_id === userId && t.source_type === 'referral_welcome');

beforeEach(() => {
  db.users = [
    // Стоит раньше настоящего Ryzhov_ai: без экранирования _ в ilike код @ryzhov_ai попал бы сюда
    { id: 'decoy', username: 'ryzhovXai', telegram_id: '1111111111' },
    { id: 'owner', username: 'Ryzhov_ai', telegram_id: '5554098114' },
    { id: 'noname', username: null, telegram_id: '7000000002' },
    { id: 'placeholder', username: 'someone', telegram_id: 'pending-someone' },
    { id: 'friend', username: 'friend_one', telegram_id: '7000000001' },
    { id: 'guest', username: null, telegram_id: 'guest-abc' },
  ];
  db.referrals = [];
  db.orders = [];
  db.sc_transactions = [];
  db.user_levels = [];
});

async function claimError(userId: string, code: unknown): Promise<ReferralClaimError> {
  try {
    await claimReferral(userId, code);
  } catch (e) {
    return e as ReferralClaimError;
  }
  throw new Error('ожидалась ошибка');
}

describe('parseInviterCode', () => {
  it('принимает @username и числовой Telegram ID', () => {
    expect(parseInviterCode(' @Ryzhov_ai ')).toEqual({ kind: 'username', value: 'Ryzhov_ai' });
    expect(parseInviterCode('Ryzhov_ai')).toEqual({ kind: 'username', value: 'Ryzhov_ai' });
    expect(parseInviterCode('5554098114')).toEqual({ kind: 'telegram_id', value: '5554098114' });
  });

  it.each(['', '@', '+7 999 123-45-67', '89991234567x', 'ab', 'ryzhov ai', '1_bad', null, undefined])(
    '«%s» — не код',
    (raw) => {
      expect(parseInviterCode(raw)).toBeNull();
    },
  );
});

describe('ownReferralCode', () => {
  it('@username, а без ника — Telegram ID, телефон не показываем', () => {
    expect(ownReferralCode({ username: 'Ryzhov_ai', telegram_id: '5554098114' })).toBe('@Ryzhov_ai');
    expect(ownReferralCode({ username: null, telegram_id: '5554098114' })).toBe('5554098114');
    expect(ownReferralCode({ username: null, telegram_id: 'guest-abc' })).toBeNull();
    expect(ownReferralCode(null)).toBeNull();
  });
});

describe('claimReferral', () => {
  it('по @username без учёта регистра: привязывает к тому, кто пригласил, и сразу даёт 100 SC', async () => {
    await expect(claimReferral('friend', '@ryzhov_ai')).resolves.toEqual({ name: '@Ryzhov_ai', welcomeSc: 100 });
    expect(db.referrals).toEqual([
      expect.objectContaining({ referrer_user_id: 'owner', referred_user_id: 'friend', status: 'pending' }),
    ]);
    expect(welcomes('friend')).toHaveLength(1);
  });

  it('по Telegram ID; пригласивший без ника — «друг»', async () => {
    await expect(claimReferral('friend', '7000000002')).resolves.toEqual({ name: 'друг', welcomeSc: 100 });
  });

  it('непохожий на код ввод — 400', async () => {
    const e = await claimError('friend', '+79991234567');
    expect([e.status, e.message]).toEqual([400, 'Введите @username или Telegram ID друга']);
  });

  it('гость из браузера — 403', async () => {
    const e = await claimError('guest', '@Ryzhov_ai');
    expect([e.status, e.message]).toEqual([403, 'Код друга можно ввести в приложении из Telegram']);
  });

  it('нет такого пользователя — 404', async () => {
    const e = await claimError('friend', '@nobody_here');
    expect([e.status, e.message]).toEqual([404, 'Не нашли такого пользователя — проверьте код']);
  });

  it('«заочная» запись из реф-кода заказа пригласившим не считается — 404', async () => {
    const e = await claimError('friend', '@someone');
    expect(e.status).toBe(404);
    expect(db.referrals).toEqual([]);
  });

  it('свой код — 400', async () => {
    const e = await claimError('friend', '@friend_one');
    expect([e.status, e.message]).toEqual([400, 'Это ваш собственный код — отправьте его друзьям']);
  });

  it('пригласивший уже есть — 409, прежняя привязка остаётся', async () => {
    db.referrals = [{ id: 'r0', referrer_user_id: 'noname', referred_user_id: 'friend', status: 'pending' }];
    const e = await claimError('friend', '@Ryzhov_ai');
    expect([e.status, e.message]).toEqual([409, 'Пригласивший у вас уже есть']);
    expect(db.referrals).toHaveLength(1);
  });

  it('уже покупал — 409, без привязки и SC', async () => {
    db.orders = [{ id: 'o1', user_id: 'friend', status: 'shipped', total: 1100 }];
    const e = await claimError('friend', '@Ryzhov_ai');
    expect([e.status, e.message]).toEqual([409, 'Код друга можно ввести только до первой покупки']);
    expect(db.referrals).toEqual([]);
    expect(db.sc_transactions).toEqual([]);
  });
});

describe('canEnterInviterCode', () => {
  it('да — у Telegram-пользователя без пригласившего и покупок', async () => {
    await expect(canEnterInviterCode('friend')).resolves.toBe(true);
  });

  it('нет — если пригласивший уже есть', async () => {
    db.referrals = [{ id: 'r0', referrer_user_id: 'owner', referred_user_id: 'friend', status: 'pending' }];
    await expect(canEnterInviterCode('friend')).resolves.toBe(false);
  });

  it('нет — если уже покупал (неоплаченные заказы не мешают)', async () => {
    db.orders = [{ id: 'o1', user_id: 'friend', status: 'pending', total: 1100 }];
    await expect(canEnterInviterCode('friend')).resolves.toBe(true);
    db.orders.push({ id: 'o2', user_id: 'friend', status: 'completed', total: 1100 });
    await expect(canEnterInviterCode('friend')).resolves.toBe(false);
  });

  it('нет — гостю из браузера', async () => {
    await expect(canEnterInviterCode('guest')).resolves.toBe(false);
  });
});
