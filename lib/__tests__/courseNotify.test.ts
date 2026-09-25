/**
 * @jest-environment node
 */
// Заказ стал «✅ Доставлен» → бот пишет покупателю «отметьте, что начали курс» с кнопкой в раздел курса.
// База и Telegram подменены: проверяем, кому и что уходит.

const db = {
  users: [{ id: 'u1', telegram_id: '54993853' }, { id: 'guest', telegram_id: 'guest-1' }],
  user_courses: [] as { user_id: string; status: string; id: string }[],
};

function table(name: 'users' | 'user_courses') {
  const filters: [string, unknown][] = [];
  const rows = () => (db[name] as any[]).filter((r) => filters.every(([c, v]) => r[c] === v));
  const api: any = {
    select: () => api,
    eq: (c: string, v: unknown) => { filters.push([c, v]); return api; },
    limit: () => Promise.resolve({ data: rows(), error: null }),
    maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
  };
  return api;
}

jest.mock('../../app/supabaseServerClient', () => ({ supabaseServer: { from: (name: any) => table(name) } }));

import { notifyCourseStart } from '../courseNotify';
import { COURSE_APP_URL } from '../course';

const sent = () => (global as any).fetch.mock.calls.map(([url, opts]: [string, any]) => ({ url, body: JSON.parse(opts.body) }));

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  db.user_courses = [];
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
});

it('заказ доставлен — покупателю уходит приглашение отметить начало курса с кнопкой', async () => {
  await notifyCourseStart('u1', 'shipped', 'completed');
  const [msg] = sent();
  expect(msg.url).toBe('https://api.telegram.org/bottest-token/sendMessage');
  expect(msg.body.chat_id).toBe('54993853');
  expect(msg.body.text).toContain('Отметьте, что вы начали курс');
  expect(msg.body.reply_markup.inline_keyboard[0][0]).toEqual({ text: '📊 Отметить начало курса', web_app: { url: COURSE_APP_URL } });
});

it('курс уже начат, статус не сменился на «доставлен» или гость — не пишем', async () => {
  db.user_courses = [{ user_id: 'u1', status: 'active', id: 'c1' }];
  await notifyCourseStart('u1', 'shipped', 'completed');
  await notifyCourseStart('u1', 'completed', 'completed');
  await notifyCourseStart('u1', 'paid', 'shipped');
  await notifyCourseStart('guest', 'shipped', 'completed');
  expect(sent()).toHaveLength(0);
});
