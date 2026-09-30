/**
 * @jest-environment node
 */
import { matchesOrder, matchesUser, pickUsers } from '../adminSearch';

// Поиск в админке: номер заказа приходит в уведомлении менеджеру («#<uuid>»),
// Telegram ID и @логин видны в таблицах. Ищем по подстроке, без учёта регистра.

const order = {
  id: '3f2a9c1e-7b4d-4c1a-9e2f-0a1b2c3d4e5f',
  user_id: 'aa11bb22-cc33-4d44-8e55-ff6677889900',
  telegram_id: '54993853',
  username: 'Ivan_Spores',
};

const user = {
  id: 'aa11bb22-cc33-4d44-8e55-ff6677889900',
  telegram_id: '54993853',
  username: 'Ivan_Spores',
};

describe('поиск в админке по ID или логину', () => {
  it('пустой запрос показывает всё', () => {
    expect(matchesOrder(order, '')).toBe(true);
    expect(matchesOrder(order, '   ')).toBe(true);
    expect(matchesUser(user, '')).toBe(true);
  });

  it('находит заказ по номеру из уведомления — целиком, с решёткой или по началу', () => {
    expect(matchesOrder(order, '3f2a9c1e-7b4d-4c1a-9e2f-0a1b2c3d4e5f')).toBe(true);
    expect(matchesOrder(order, '#3f2a9c1e')).toBe(true);
    expect(matchesOrder(order, '3F2A9C')).toBe(true);
  });

  it('находит заказ и пользователя по Telegram ID', () => {
    expect(matchesOrder(order, '54993853')).toBe(true);
    expect(matchesUser(user, '54993853')).toBe(true);
  });

  it('находит по логину с @ и без, без учёта регистра и по части', () => {
    expect(matchesOrder(order, '@ivan_spores')).toBe(true);
    expect(matchesUser(user, 'IVAN')).toBe(true);
    expect(matchesUser(user, '@ivan_s')).toBe(true);
  });

  it('находит логин, сохранённый в базе с @', () => {
    expect(matchesUser({ ...user, username: '@Ivan_Spores' }, 'ivan_spores')).toBe(true);
  });

  it('находит пользователя по внутреннему id', () => {
    expect(matchesUser(user, 'aa11bb22')).toBe(true);
  });

  it('не находит чужое', () => {
    expect(matchesOrder(order, 'petr')).toBe(false);
    expect(matchesUser(user, '777')).toBe(false);
  });

  it('не падает на пустых полях — гость без логина, заказ без пользователя', () => {
    const guest = { id: 'bb', telegram_id: 'guest-123', username: null };
    expect(matchesUser(guest, 'ivan')).toBe(false);
    expect(matchesUser(guest, 'guest-1')).toBe(true);
    expect(matchesOrder({ id: 'cc', user_id: null, telegram_id: null, username: null }, 'cc')).toBe(true);
  });
});

// «💰 Начислить SC»: вместо длинного списка — поиск по нику или Telegram ID (просьба владельца 30.09)
describe('pickUsers — выбор пользователя для начисления SC', () => {
  const users = [
    { id: 'aa11bb22-cc33-4d44-8e55-ff6677889900', telegram_id: '1688404602', username: 'Lopata03' },
    { id: 'u2', telegram_id: '5550001234', username: '@lopatin' },
    { id: 'u3', telegram_id: '7000000001', username: null },
    { id: 'u4', telegram_id: '9001688000', username: 'grib_lopa' },
    { id: 'u5', telegram_id: '6000000005', username: 'lopa' },
  ];
  const ids = (query: string) => pickUsers(users, query).matches.map((u) => u.id);

  it('пустой запрос — никого', () => {
    expect(pickUsers(users, '')).toEqual({ matches: [], total: 0 });
    expect(pickUsers(users, '   ')).toEqual({ matches: [], total: 0 });
  });

  it('часть ника без учёта регистра и @: сначала точное совпадение, потом начало ника, потом середина', () => {
    expect(ids('@LOPA')).toEqual(['u5', users[0].id, 'u2', 'u4']);
    expect(pickUsers(users, 'lopa').total).toBe(4);
  });

  it('часть Telegram ID: сначала те, у кого ID начинается с запроса', () => {
    expect(ids('1688')).toEqual([users[0].id, 'u4']);
    expect(ids('7000000001')).toEqual(['u3']);
  });

  it('по внутреннему UUID не ищет — цифры из него дали бы случайные совпадения', () => {
    expect(pickUsers(users, 'ff6677889900').total).toBe(0);
  });

  it('не больше limit; total — сколько нашлось всего', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, telegram_id: `70000000${10 + i}`, username: null }));
    const found = pickUsers(many, '7000');
    expect(found.matches).toHaveLength(8);
    expect(found.total).toBe(12);
    expect(pickUsers(many, '7000', 3).matches).toHaveLength(3);
  });
});
