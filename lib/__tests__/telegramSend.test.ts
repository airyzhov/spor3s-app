/**
 * @jest-environment node
 */
import { sendTelegramNotice } from '../telegramSend';

// Сообщения бота уходят и из начислений SC: зависший или недоступный Telegram не должен держать
// ответ сайта и ронять начисление. Токен бота не должен попасть в лог.

const notice = { chatId: '1688404602', text: 'привет', buttons: [] };

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.TELEGRAM_BOT_TOKEN;
});

it('ждёт Telegram не дольше таймаута — в запросе есть AbortSignal', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });
  (global as any).fetch = fetchMock;
  await expect(sendTelegramNotice(notice)).resolves.toBe(true);
  expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});

it('таймаут или упавшая сеть — false, без исключения', async () => {
  (global as any).fetch = jest.fn().mockRejectedValue(
    Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }),
  );
  await expect(sendTelegramNotice(notice)).resolves.toBe(false);
});

it('в лог не попадает токен бота', async () => {
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('fetch failed'));
  await sendTelegramNotice(notice);
  const logged = (console.error as jest.Mock).mock.calls.flat().map(String).join(' ');
  expect(logged).toContain('fetch failed');
  expect(logged).not.toContain('test-token');
});

it('без токена — не пишем', async () => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  const fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
  await expect(sendTelegramNotice(notice)).resolves.toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});
