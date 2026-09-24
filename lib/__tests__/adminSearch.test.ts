/**
 * @jest-environment node
 */
import { matchesOrder, matchesUser } from '../adminSearch';

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
