/**
 * @jest-environment node
 */
import { referralLink, referralShareUrl, REFERRAL_TERMS } from '../referralLink';

// Бот (tg-bot/bot.ts, bot.start) засчитывает приглашение только по /start <числовой telegram_id>.
// Ссылка с @логином или телефоном приглашение не записывает — такой ссылки быть не должно.
describe('referralLink', () => {
  it('строит ссылку на бота по числовому Telegram ID', () => {
    expect(referralLink('54993853')).toBe('https://t.me/spor3sbot?start=54993853');
  });

  it.each(['guest-123', 'test-1', 'temp', '@ivan', '', null, undefined])('для «%s» ссылки нет', (id) => {
    expect(referralLink(id)).toBeNull();
  });
});

describe('referralShareUrl', () => {
  it('упаковывает ссылку приглашения в окно «поделиться» Telegram', () => {
    const url = new URL(referralShareUrl('54993853')!);
    expect(url.origin + url.pathname).toBe('https://t.me/share/url');
    expect(url.searchParams.get('url')).toBe('https://t.me/spor3sbot?start=54993853');
    expect(url.searchParams.get('text')).toMatch(/100 SC/);
  });

  it('без числового ID — null', () => {
    expect(referralShareUrl('guest-1')).toBeNull();
  });
});

describe('тексты приглашения', () => {
  it('«Поделиться» обещает 100 SC сразу, а не на первый заказ', () => {
    const text = new URL(referralShareUrl('54993853')!).searchParams.get('text')!;
    expect(text).toMatch(/сразу получишь 100 SC/);
    expect(text).not.toMatch(/первый заказ/);
  });

  it('условия в кабинете: другу 100 SC сразу, пригласившему 5% с оплаченных заказов', () => {
    expect(REFERRAL_TERMS).toBe('Друг сразу получает 100 SC, а вы — 5% с каждого его оплаченного заказа');
  });
});
