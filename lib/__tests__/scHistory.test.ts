/**
 * @jest-environment node
 */
import { formatScAmount, shortOrderIds, scDateLabel, scChangeNotice, SC_HISTORY_APP_URL } from '../scHistory';

// История SC и сообщение бота о начислении или списании: знак суммы, короткие номера заказов,
// дата по Москве, текст и кнопка «🧾 История SC» (решение владельца 30.09).

const ORDER_ID = '03d1710f-ffe0-4b2c-8555-b784f6e34b80';

describe('formatScAmount', () => {
  it('начисление с плюсом, списание с типографским минусом', () => {
    expect(formatScAmount(30)).toBe('+30');
    expect(formatScAmount(-50)).toBe('−50');
    expect(formatScAmount(0)).toBe('0');
  });
});

describe('shortOrderIds', () => {
  it('номер заказа сокращается до 8 знаков, как в таблице заказов админки', () => {
    expect(shortOrderIds(`Списание SC для заказа #${ORDER_ID}`)).toBe('Списание SC для заказа #03d1710f');
  });

  it('несколько номеров, текст без номера и пустое описание', () => {
    expect(shortOrderIds(`#${ORDER_ID} и #${ORDER_ID.toUpperCase()}`)).toBe('#03d1710f и #03D1710F');
    expect(shortOrderIds('Бонус за задание: Telegram канал')).toBe('Бонус за задание: Telegram канал');
    expect(shortOrderIds(null)).toBe('');
    expect(shortOrderIds(undefined)).toBe('');
  });
});

describe('scDateLabel', () => {
  it('день, месяц и время по Москве', () => {
    expect(scDateLabel('2026-09-28T11:02:00Z')).toBe('28.09 14:02');
  });

  it('после полуночи по Москве — уже следующий день и 00 часов', () => {
    expect(scDateLabel('2026-09-27T21:05:00Z')).toBe('28.09 00:05');
  });

  it('неверная дата — пусто', () => {
    expect(scDateLabel('вчера')).toBe('');
  });
});

describe('scChangeNotice — сообщение бота', () => {
  it('начисление: сумма, за что, новый баланс и кнопка истории', () => {
    expect(scChangeNotice({ amount: 30, description: 'Бонус за задание: Telegram канал', balance: 130 }, '1688404602')).toEqual({
      chatId: '1688404602',
      text: '💰 <b>+30 SC</b> — Бонус за задание: Telegram канал\nБаланс: <b>130 SC</b>',
      buttons: [[{ text: '🧾 История SC', web_app: { url: 'https://ai.spor3s.ru/?open=sc' } }]],
    });
    expect(SC_HISTORY_APP_URL).toBe('https://ai.spor3s.ru/?open=sc');
  });

  it('списание: минус и короткий номер заказа', () => {
    const notice = scChangeNotice({ amount: -50, description: `Списание SC для заказа #${ORDER_ID}`, balance: 80 }, ' 1688404602 ');
    expect(notice?.chatId).toBe('1688404602');
    expect(notice?.text).toBe('💸 <b>−50 SC</b> — Списание SC для заказа #03d1710f\nБаланс: <b>80 SC</b>');
  });

  it('комментарий админа не ломает разметку Telegram', () => {
    const notice = scChangeNotice({ amount: 10, description: '<b>скидка</b> & подарок', balance: 10 }, '1688404602');
    expect(notice?.text).toBe('💰 <b>+10 SC</b> — &lt;b&gt;скидка&lt;/b&gt; &amp; подарок\nБаланс: <b>10 SC</b>');
  });

  it('без описания — только сумма и баланс', () => {
    expect(scChangeNotice({ amount: 30, description: '  ', balance: 30 }, '1688404602')?.text).toBe(
      '💰 <b>+30 SC</b>\nБаланс: <b>30 SC</b>',
    );
    expect(scChangeNotice({ amount: 30, description: null, balance: 30 }, '1688404602')?.text).toBe(
      '💰 <b>+30 SC</b>\nБаланс: <b>30 SC</b>',
    );
  });

  it('некуда писать или не о чем — null', () => {
    const change = { amount: 30, description: 'Бонус', balance: 30 };
    expect(scChangeNotice(change, 'guest-1')).toBeNull();
    expect(scChangeNotice(change, null)).toBeNull();
    expect(scChangeNotice(change, undefined)).toBeNull();
    expect(scChangeNotice({ ...change, amount: 0 }, '1688404602')).toBeNull();
  });
});
