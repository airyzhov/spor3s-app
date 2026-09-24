/**
 * @jest-environment jsdom
 */
import { copyText } from '../copyText';

// В WebView Telegram буфер обмена бывает недоступен: тогда запасной путь через execCommand,
// а если не вышло и так — false, чтобы кнопка показала ссылку для ручного копирования.
const setClipboard = (value: unknown) =>
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });

afterEach(() => {
  setClipboard(undefined);
  (document as any).execCommand = undefined;
});

it('копирует через navigator.clipboard', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  setClipboard({ writeText });
  await expect(copyText('https://t.me/spor3sbot?start=1')).resolves.toBe(true);
  expect(writeText).toHaveBeenCalledWith('https://t.me/spor3sbot?start=1');
});

it('если буфер запрещён — копирует через скрытое поле и убирает его', async () => {
  setClipboard({ writeText: jest.fn().mockRejectedValue(new Error('denied')) });
  (document as any).execCommand = jest.fn().mockReturnValue(true);
  await expect(copyText('https://t.me/spor3sbot?start=1')).resolves.toBe(true);
  expect(document.execCommand).toHaveBeenCalledWith('copy');
  expect(document.querySelector('textarea')).toBeNull();
});

it('если не вышло никак — false', async () => {
  (document as any).execCommand = jest.fn().mockReturnValue(false);
  await expect(copyText('https://t.me/spor3sbot?start=1')).resolves.toBe(false);
});
