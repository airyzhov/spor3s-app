/**
 * @jest-environment node
 */
import {
  RAFFLE,
  NEW_FRIEND_SLACK_MS,
  raffleNotice,
  joinedMessage,
  tierUpMessage,
  buildRaffleNotice,
  countsAsFriend,
} from '../raffle';

// Сообщения бота участникам розыгрыша: когда писать и что.
// Спека: docs/superpowers/specs/2026-09-24-raffle-10-10-design.md, §11.

describe('когда бот пишет', () => {
  it('первое задание при уже приглашённом друге — «ты в розыгрыше»', () => {
    expect(raffleNotice('task', { tasks: 1, friends: 1 })).toBe('joined');
    expect(raffleNotice('task', { tasks: 1, friends: 4 })).toBe('joined');
  });

  it('первое задание без друга или не первое задание — молчим', () => {
    expect(raffleNotice('task', { tasks: 1, friends: 0 })).toBeNull();
    expect(raffleNotice('task', { tasks: 2, friends: 1 })).toBeNull();
  });

  it('первый друг при выполненном задании — «ты в розыгрыше»', () => {
    expect(raffleNotice('friend', { tasks: 1, friends: 1 })).toBe('joined');
  });

  it('3-й и 5-й друг — приз вырос', () => {
    expect(raffleNotice('friend', { tasks: 2, friends: 3 })).toBe('tier_up');
    expect(raffleNotice('friend', { tasks: 1, friends: 5 })).toBe('tier_up');
  });

  it('остальные друзья и друзья без задания — молчим', () => {
    expect(raffleNotice('friend', { tasks: 1, friends: 2 })).toBeNull();
    expect(raffleNotice('friend', { tasks: 1, friends: 4 })).toBeNull();
    expect(raffleNotice('friend', { tasks: 1, friends: 6 })).toBeNull();
    expect(raffleNotice('friend', { tasks: 0, friends: 1 })).toBeNull();
  });
});

describe('текст «ты в розыгрыше»', () => {
  it('с одним другом: приз, сколько до следующего, сроки', () => {
    const text = joinedMessage(1);
    expect(text).toContain('Ты в розыгрыше 10.10!');
    expect(text).toContain('✅ друзей приглашено: 1');
    expect(text).toContain('Если выиграешь — <b>1 добавка на выбор</b>.');
    expect(text).toContain('Пригласи ещё 2 друзей — будет 2 добавки на выбор, а с 5 друзьями — комплекс добавок.');
    expect(text).toContain('Приём заявок — до 10 октября включительно.');
    expect(text).toContain('12 октября выберем 3 победителей и напишем им здесь.');
  });

  it('с четырьмя друзьями до комплекса остаётся один', () => {
    expect(joinedMessage(4)).toContain('Пригласи ещё 1 друга — будет комплекс добавок.');
  });

  it('с пятью друзьями — максимальный приз', () => {
    const text = joinedMessage(5);
    expect(text).toContain('Если выиграешь — <b>комплекс добавок</b>.');
    expect(text).toContain('максимальный приз');
    expect(text).not.toContain('Пригласи ещё');
  });
});

describe('текст «приз вырос»', () => {
  it('на 3-м друге — 2 добавки и сколько до комплекса', () => {
    const text = tierUpMessage(3);
    expect(text).toContain('Друзей уже 3!');
    expect(text).toContain('Если выиграешь — <b>2 добавки на выбор</b>.');
    expect(text).toContain('Ещё 2 друга — и будет комплекс добавок.');
  });

  it('на 5-м друге — комплекс, максимальный приз', () => {
    const text = tierUpMessage(5);
    expect(text).toContain('Друзей уже 5!');
    expect(text).toContain('<b>комплекс добавок</b>');
    expect(text).toContain('максимальный приз');
  });
});

describe('готовое сообщение для бота', () => {
  const during = new Date('2026-09-30T12:00:00Z');

  it('адресовано Telegram ID, с кнопками «Открыть розыгрыш» и «Пригласить друзей»', () => {
    const notice = buildRaffleNotice('task', { tasks: 1, friends: 1 }, '54993853', during)!;
    expect(notice.chatId).toBe('54993853');
    expect(notice.text).toContain('Ты в розыгрыше');
    const [open, invite] = notice.buttons.flat();
    expect(open).toEqual({ text: '🎁 Открыть розыгрыш', web_app: { url: 'https://ai.spor3s.ru' } });
    // «Пригласить» копирует реферальную ссылку — как одноимённая кнопка в приложении
    expect(invite).toEqual({ text: '👥 Пригласить друзей', copy_text: { text: 'https://t.me/spor3sbot?start=54993853' } });
  });

  it('на 3-м друге — сообщение о выросшем призе', () => {
    expect(buildRaffleNotice('friend', { tasks: 1, friends: 3 }, '54993853', during)!.text).toContain('Друзей уже 3!');
  });

  it('без повода, без числового Telegram ID и после конца приёма — ничего', () => {
    expect(buildRaffleNotice('friend', { tasks: 1, friends: 2 }, '54993853', during)).toBeNull();
    expect(buildRaffleNotice('task', { tasks: 1, friends: 1 }, 'guest-1', during)).toBeNull();
    expect(buildRaffleNotice('task', { tasks: 1, friends: 1 }, '54993853', new Date(RAFFLE.endsAt))).toBeNull();
  });
});

describe('засчитывается ли друг', () => {
  const referral = { referrer_user_id: 'host', referred_user_id: 'f1', created_at: '2026-09-30T12:00:00Z' };
  const friend = { id: 'f1', telegram_id: '7000001', created_at: '2026-09-30T11:59:58Z' };

  it('новый друг из Telegram, открывший приложение, — да', () => {
    expect(countsAsFriend(referral, friend, new Set(['f1']))).toBe(true);
  });

  it('давний пользователь или не открывший приложение — нет', () => {
    const old = { ...friend, created_at: new Date(Date.parse(referral.created_at) - NEW_FRIEND_SLACK_MS - 1000).toISOString() };
    expect(countsAsFriend(referral, old, new Set(['f1']))).toBe(false);
    expect(countsAsFriend(referral, friend, new Set())).toBe(false);
  });
});
