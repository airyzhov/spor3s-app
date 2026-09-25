/**
 * @jest-environment node
 */
import { shopKeyboard, botFallbackReply, referralWelcomeText } from '../replies';

// Ответы бота. Раньше к каждому ответу дописывалась ссылка t.me/spor3sbot?startapp=<код> —
// у @spor3sbot нет главного мини-приложения (getMe: has_main_web_app = false), и такая ссылка
// просто открывала тот же чат. Теперь — кнопка web_app, она открывает магазин в любом случае.

describe('shopKeyboard', () => {
  it('кнопка «Открыть магазин» открывает мини-приложение по адресу сайта', () => {
    expect(shopKeyboard('https://ai.spor3s.ru/')).toEqual({
      inline_keyboard: [[{ text: '🛒 Открыть магазин', web_app: { url: 'https://ai.spor3s.ru' } }]],
    });
  });

  it('без адреса или с http — боевой сайт (web_app работает только по https)', () => {
    expect(shopKeyboard(undefined).inline_keyboard[0][0].web_app.url).toBe('https://ai.spor3s.ru');
    expect(shopKeyboard('http://localhost:3000').inline_keyboard[0][0].web_app.url).toBe('https://ai.spor3s.ru');
  });
});

describe('botFallbackReply — ответ, когда ИИ недоступен', () => {
  it.each(['Интересно', 'ежовик', 'мухомор', 'кордицепс', 'цистозира', 'комплекс 4 в 1', 'порошок', '3 месяца', 'сон'])(
    '«%s» — без звёздочек Markdown и без ссылки на этот же чат',
    (message) => {
      const reply = botFallbackReply(message);
      expect(reply).not.toMatch(/\*\*/);
      expect(reply).not.toMatch(/t\.me\/spor3sbot/);
    },
  );

  it('на непонятное — приветствие со списком добавок', () => {
    expect(botFallbackReply('Интересно')).toMatch(/Ежовик[\s\S]*Мухомор[\s\S]*Кордицепс[\s\S]*Цистозира/);
  });

  it('на вопрос про ежовик — формы и цены ежовика', () => {
    expect(botFallbackReply('Хочу ежовик')).toMatch(/Ежовик гребенчатый[\s\S]*Капсулы[\s\S]*Порошок/);
  });
});

describe('referralWelcomeText — ответ другу по реферальной ссылке', () => {
  it('ещё не покупал — 100 SC сразу, они уже в кабинете', () => {
    const text = referralWelcomeText('@web3grow', true);
    expect(text).toMatch(/^🎁 Вас пригласил @web3grow!/);
    expect(text).toMatch(/Дарим вам 100 SC \(= 100 ₽ скидки\) — они уже ждут в кабинете/);
    expect(text).not.toMatch(/первый оплаченный заказ/);
  });

  it('уже покупал — без обещания SC', () => {
    const text = referralWelcomeText('друг', false);
    expect(text).toMatch(/^🎁 Вас пригласил друг!/);
    expect(text).not.toMatch(/SC/);
  });
});
