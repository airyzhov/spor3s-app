/**
 * @jest-environment node
 */
import {
  RAFFLE,
  NEW_FRIEND_SLACK_MS,
  raffleStage,
  prizeForFriends,
  nextPrize,
  prizeRulesText,
  isEligible,
  countTasks,
  countFriends,
  publicName,
  buildParticipants,
  pickWinners,
  toCsv,
  type FriendUser,
} from '../raffle';

// Правила розыгрыша 10.10 — docs/superpowers/specs/2026-09-24-raffle-10-10-design.md, §2.

const at = (iso: string) => new Date(iso);

describe('стадии розыгрыша', () => {
  it('до конца приёма — open, включая последнюю секунду 10.10 по Гринвичу', () => {
    expect(raffleStage(at('2026-09-25T12:00:00Z'), false)).toBe('open');
    expect(raffleStage(at('2026-10-10T23:59:59Z'), false)).toBe('open');
  });

  it('с 11.10 00:00 GMT приём закрыт', () => {
    expect(raffleStage(at('2026-10-11T00:00:00Z'), false)).toBe('closed');
  });

  it('после сохранения итогов — drawn', () => {
    expect(raffleStage(at('2026-10-12T10:00:00Z'), true)).toBe('drawn');
  });

  it('через неделю после итогов кнопка прячется', () => {
    expect(raffleStage(at('2026-10-19T00:00:00Z'), true)).toBe('hidden');
    expect(raffleStage(at('2026-10-20T00:00:00Z'), false)).toBe('hidden');
  });
});

describe('призы по числу своих друзей', () => {
  it.each([
    [0, null],
    [1, 'one'],
    [2, 'one'],
    [3, 'two'],
    [4, 'two'],
    [5, 'set'],
    [10, 'set'],
  ])('%i друзей → %s', (friends, code) => {
    expect(prizeForFriends(friends as number)?.code ?? null).toBe(code);
  });

  it('подсказывает, сколько друзей до следующего приза', () => {
    expect(nextPrize(0)).toEqual({ friendsNeeded: 1, prize: prizeForFriends(1) });
    expect(nextPrize(1)).toEqual({ friendsNeeded: 2, prize: prizeForFriends(3) });
    expect(nextPrize(4)).toEqual({ friendsNeeded: 1, prize: prizeForFriends(5) });
    expect(nextPrize(5)).toBeNull();
  });

  it('правила призов одной строкой — для кнопки и сообщений бота', () => {
    expect(prizeRulesText()).toBe(
      '1–2 друга — 1 добавка на выбор, 3–4 друга — 2 добавки на выбор, 5 и больше — комплекс добавок',
    );
  });
});

describe('условия участия', () => {
  it('нужны и задание, и друг', () => {
    expect(isEligible(1, 1)).toBe(true);
    expect(isEligible(3, 0)).toBe(false);
    expect(isEligible(0, 2)).toBe(false);
  });
});

describe('подсчёт заданий', () => {
  it('считает разные подписочные задания до конца приёма, в том числе выполненные до старта', () => {
    const counts = countTasks([
      { user_id: 'a', source_type: 'subscribe_telegram', created_at: '2026-07-01T10:00:00Z' },
      { user_id: 'a', source_type: 'subscribe_youtube', created_at: '2026-09-30T10:00:00Z' },
      { user_id: 'a', source_type: 'subscribe_youtube', created_at: '2026-10-01T10:00:00Z' },
      { user_id: 'b', source_type: 'subscribe_instagram', created_at: '2026-10-11T00:00:00Z' },
      { user_id: 'c', source_type: 'order', created_at: '2026-09-30T10:00:00Z' },
    ]);
    expect(counts.get('a')).toBe(2);
    expect(counts.has('b')).toBe(false);
    expect(counts.has('c')).toBe(false);
  });
});

describe('подсчёт друзей', () => {
  const linkAt = '2026-09-30T12:00:00Z';
  const friend = (id: string, over: Partial<FriendUser> = {}): FriendUser => ({
    id,
    telegram_id: '7000001',
    created_at: '2026-09-30T11:59:58Z',
    ...over,
  });
  const ref = (referred: string, created_at = linkAt) => ({
    referrer_user_id: 'host',
    referred_user_id: referred,
    created_at,
  });
  const count = (refs: ReturnType<typeof ref>[], friends: FriendUser[], opened: string[]) =>
    countFriends(refs, new Map(friends.map((f) => [f.id, f])), new Set(opened)).get('host') || 0;

  it('засчитывает нового друга из Telegram, который открыл приложение', () => {
    expect(count([ref('f1')], [friend('f1')], ['f1'])).toBe(1);
  });

  it('не засчитывает друга, который не открыл приложение', () => {
    expect(count([ref('f1')], [friend('f1')], [])).toBe(0);
  });

  it('не засчитывает гостя без числового Telegram ID', () => {
    expect(count([ref('f1')], [friend('f1', { telegram_id: 'guest-1' })], ['f1'])).toBe(0);
  });

  it('не засчитывает того, кто был в приложении задолго до ссылки', () => {
    const wasHereBefore = new Date(Date.parse(linkAt) - NEW_FRIEND_SLACK_MS - 1000).toISOString();
    expect(count([ref('f1')], [friend('f1', { created_at: wasHereBefore })], ['f1'])).toBe(0);
  });

  it('не засчитывает приглашения до старта и после конца приёма', () => {
    const before = '2026-09-23T23:59:59Z';
    expect(count([ref('f1', before)], [friend('f1', { created_at: before })], ['f1'])).toBe(0);
    expect(count([ref('f2', RAFFLE.endsAt)], [friend('f2', { created_at: RAFFLE.endsAt })], ['f2'])).toBe(0);
  });

  it('считает одного друга один раз, даже если строк приглашения две', () => {
    expect(count([ref('f1'), ref('f1', '2026-10-01T00:00:00Z')], [friend('f1')], ['f1'])).toBe(1);
  });
});

describe('имя участника', () => {
  it('логин с @, без логина — хвост Telegram ID', () => {
    expect(publicName('Ivan', '54993853')).toBe('@Ivan');
    expect(publicName('@Ivan', '54993853')).toBe('@Ivan');
    expect(publicName(null, '54993853')).toBe('участник …3853');
    expect(publicName(null, null)).toBe('участник');
  });
});

describe('список участников для админки', () => {
  it('сначала выполнившие оба условия, приз — по их друзьям', () => {
    const list = buildParticipants(
      [
        { id: 'a', username: 'anna', telegram_id: '111111' },
        { id: 'b', username: null, telegram_id: '222222' },
        { id: 'c', username: 'max', telegram_id: '333333' },
      ],
      new Map([['a', 1], ['b', 2]]),
      new Map([['b', 4], ['c', 7]]),
    );
    expect(list.map((p) => p.user_id)).toEqual(['b', 'c', 'a']);
    expect(list[0]).toMatchObject({ name: 'участник …2222', tasks: 2, friends: 4, eligible: true, prize: { code: 'two' } });
    expect(list[1]).toMatchObject({ name: '@max', eligible: false, prize: null });
    expect(list[2]).toMatchObject({ name: '@anna', eligible: false, friends: 0 });
  });
});

describe('выбор победителей', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'];

  it('выбирает нужное число без повторов', () => {
    const winners = pickWinners(pool, 3, (max) => max - 1);
    expect(winners).toHaveLength(3);
    expect(new Set(winners).size).toBe(3);
    winners.forEach((w) => expect(pool).toContain(w));
  });

  it('выбор определяется генератором случайных чисел', () => {
    expect(pickWinners(pool, 3, () => 0)).toEqual(['a', 'b', 'c']);
    expect(pickWinners(pool, 2, (max) => max - 1)).toEqual(['e', 'a']);
  });

  it('если участников меньше трёх — побеждают все', () => {
    expect(pickWinners(['a', 'b'], 3, () => 0).sort()).toEqual(['a', 'b']);
    expect(pickWinners([], 3, () => 0)).toEqual([]);
  });

  it('не портит исходный список', () => {
    const copy = pool.slice();
    pickWinners(pool, 3, (max) => max - 1);
    expect(pool).toEqual(copy);
  });
});

describe('таблица для Excel', () => {
  it('разделитель «;», UTF-8 BOM, строки через CRLF', () => {
    const csv = toCsv([['Логин', 'Друзей'], ['@anna', 3]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1)).toBe('Логин;Друзей\r\n@anna;3\r\n');
  });

  it('экранирует кавычки и разделитель', () => {
    expect(toCsv([['a;b', 'say "hi"']]).slice(1)).toBe('"a;b";"say ""hi"""\r\n');
  });
});
