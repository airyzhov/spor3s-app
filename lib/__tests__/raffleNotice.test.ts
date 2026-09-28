/**
 * @jest-environment node
 */
import {
  RAFFLE,
  RAFFLE_APP_URL,
  NEW_FRIEND_SLACK_MS,
  raffleNotice,
  joinReminderMessage,
  tierUpMessage,
  announceMessage,
  buildRaffleNotice,
  buildAnnounceNotice,
  countsAsFriend,
} from '../raffle';

// Сообщения бота участникам розыгрыша: когда писать и что. С 28.09 участник = задание + «Участвую».
// Спека: docs/superpowers/specs/2026-09-28-raffle-join-design.md, §4.

describe('когда бот пишет', () => {
  it('первое задание, «Участвую» не нажато — напомнить нажать', () => {
    expect(raffleNotice('task', { tasks: 1, friends: 0, joined: false })).toBe('join_reminder');
    expect(raffleNotice('task', { tasks: 1, friends: 2, joined: false })).toBe('join_reminder');
  });

  it('не первое задание или уже нажал — молчим', () => {
    expect(raffleNotice('task', { tasks: 2, friends: 0, joined: false })).toBeNull();
    expect(raffleNotice('task', { tasks: 1, friends: 0, joined: true })).toBeNull();
  });

  it('участнику на 1-м и 3-м друге — приз вырос', () => {
    expect(raffleNotice('friend', { tasks: 1, friends: 1, joined: true })).toBe('tier_up');
    expect(raffleNotice('friend', { tasks: 2, friends: 3, joined: true })).toBe('tier_up');
  });

  it('участнику на остальных друзьях — молчим', () => {
    expect(raffleNotice('friend', { tasks: 1, friends: 2, joined: true })).toBeNull();
    expect(raffleNotice('friend', { tasks: 1, friends: 4, joined: true })).toBeNull();
  });

  it('первый друг у того, кто не нажал «Участвую», — напомнить; дальше молчим', () => {
    expect(raffleNotice('friend', { tasks: 0, friends: 1, joined: false })).toBe('join_reminder');
    expect(raffleNotice('friend', { tasks: 1, friends: 1, joined: false })).toBe('join_reminder');
    expect(raffleNotice('friend', { tasks: 1, friends: 2, joined: false })).toBeNull();
  });
});

describe('текст напоминания нажать «Участвую»', () => {
  it('после задания: осталось нажать, призы, сроки', () => {
    const text = joinReminderMessage({ tasks: 1, friends: 0 });
    expect(text).toContain('Задание выполнено!');
    expect(text).toContain('нажми «✋ Участвую»');
    expect(text).toContain('без друзей — 1 добавка на выбор, 1–2 друга — 2 добавки на выбор, 3 и больше — комплекс добавок');
    expect(text).toContain('Приём заявок — до 10 октября включительно.');
    expect(text).toContain('12 октября выберем 3 победителей');
  });

  it('друг засчитан, а задания нет — оба шага', () => {
    const text = joinReminderMessage({ tasks: 0, friends: 1 });
    expect(text).toContain('Друг засчитан!');
    expect(text).toContain('выполни задание на подписку');
    expect(text).toContain('нажми «✋ Участвую»');
  });
});

describe('текст «приз вырос»', () => {
  it('1-й друг — 2 добавки и сколько до комплекса', () => {
    const text = tierUpMessage(1);
    expect(text).toContain('Друг засчитан! Друзей: 1');
    expect(text).toContain('Если выиграешь — <b>2 добавки на выбор</b>.');
    expect(text).toContain('Ещё 2 друга — и будет комплекс добавок.');
  });

  it('3-й друг — комплекс, максимальный приз', () => {
    const text = tierUpMessage(3);
    expect(text).toContain('Друзей: 3');
    expect(text).toContain('<b>комплекс добавок</b>');
    expect(text).toContain('максимальный приз');
  });
});

describe('рассылка о розыгрыше', () => {
  it('всем: как участвовать, призы и сроки', () => {
    const text = announceMessage({ tasks: 0, friends: 0 });
    expect(text).toContain('Розыгрыш 10.10');
    expect(text).toContain('Выполни задание на подписку');
    expect(text).toContain('Нажми «✋ Участвую»');
    expect(text).toContain('без друзей — 1 добавка на выбор');
    expect(text).not.toContain('уже выполнено');
  });

  it('у выполнившего задание — «осталось нажать»', () => {
    expect(announceMessage({ tasks: 2, friends: 0 })).toContain(
      '✅ Задание у тебя уже выполнено — осталось нажать «✋ Участвую».',
    );
  });
});

describe('готовые сообщения для бота', () => {
  const during = new Date('2026-09-30T12:00:00Z');

  it('кнопки «Открыть розыгрыш» (сразу к карточке) и «Пригласить друзей»', () => {
    const notice = buildRaffleNotice('task', { tasks: 1, friends: 0, joined: false }, '54993853', during)!;
    expect(notice.chatId).toBe('54993853');
    expect(notice.text).toContain('Задание выполнено!');
    const [open, invite] = notice.buttons.flat();
    expect(RAFFLE_APP_URL).toBe('https://ai.spor3s.ru/?open=raffle');
    expect(open).toEqual({ text: '🎁 Открыть розыгрыш', web_app: { url: RAFFLE_APP_URL } });
    // «Пригласить» копирует реферальную ссылку — как одноимённая кнопка в приложении
    expect(invite).toEqual({ text: '👥 Пригласить друзей', copy_text: { text: 'https://t.me/spor3sbot?start=54993853' } });
  });

  it('участнику на 3-м друге — «приз вырос»', () => {
    expect(buildRaffleNotice('friend', { tasks: 1, friends: 3, joined: true }, '54993853', during)!.text).toContain(
      'комплекс добавок',
    );
  });

  it('без повода, без числового Telegram ID и после конца приёма — ничего', () => {
    expect(buildRaffleNotice('friend', { tasks: 1, friends: 2, joined: true }, '54993853', during)).toBeNull();
    expect(buildRaffleNotice('task', { tasks: 1, friends: 0, joined: false }, 'guest-1', during)).toBeNull();
    expect(buildRaffleNotice('task', { tasks: 1, friends: 0, joined: false }, '54993853', new Date(RAFFLE.endsAt))).toBeNull();
  });

  it('рассылка: нажавшим «Участвую», без Telegram ID и после приёма — не отправляется', () => {
    expect(buildAnnounceNotice({ tasks: 1, friends: 0, joined: false }, '54993853', during)!.text).toContain('осталось нажать');
    expect(buildAnnounceNotice({ tasks: 1, friends: 0, joined: true }, '54993853', during)).toBeNull();
    expect(buildAnnounceNotice({ tasks: 0, friends: 0, joined: false }, 'guest-1', during)).toBeNull();
    expect(buildAnnounceNotice({ tasks: 0, friends: 0, joined: false }, '54993853', new Date(RAFFLE.endsAt))).toBeNull();
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
