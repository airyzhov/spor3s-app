/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CourseSection from '../CourseSection';

// «📊 Мой курс»: «Начало курса» и «Еженедельные отметки» в одном разделе. Одна кнопка
// «Я начал(а) курс», дальше отчёт раз в неделю (+25 SC). Ответы API подменяем.

const USER_ID = '11111111-2222-4333-8444-555555555555';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

type Api = { course?: object | null; surveys?: object[]; post?: Record<string, object> };

function mockApi({ course = null, surveys = [], post = {} }: Api) {
  const fetchMock = jest.fn((url: string, opts?: RequestInit) => {
    const isPost = opts?.method === 'POST';
    const path = url.split('?')[0];
    const body = isPost ? post[path] ?? { error: 'нет ответа' }
      : path === '/api/start-course' ? { success: true, course }
      : path === '/api/survey' ? { success: true, surveys }
      : {};
    return Promise.resolve({ ok: !('error' in body), json: async () => body });
  });
  (global as any).fetch = fetchMock;
  return fetchMock;
}

const postBody = (fetchMock: jest.Mock, path: string) =>
  JSON.parse(fetchMock.mock.calls.find(([url, o]) => url === path && o?.method === 'POST')![1].body);

beforeEach(() => localStorage.clear());

it('без оплаченного заказа раздела нет', () => {
  mockApi({});
  const { container } = render(<CourseSection userId={USER_ID} visible={false} />);
  expect(container).toBeEmptyDOMElement();
});

it('изначально свёрнут; раскрытый — одна кнопка «Я начал(а) курс», после неё сразу отчёт за неделю 1', async () => {
  const fetchMock = mockApi({
    post: { '/api/start-course': { success: true, course: { id: 'c1', start_date: new Date().toISOString(), status: 'active' } } },
  });
  render(<CourseSection userId={USER_ID} visible />);
  const header = await screen.findByRole('button', { name: /Мой курс.*не начат/ });
  expect(screen.queryByRole('button', { name: /Я начал\(а\) курс/ })).toBeNull();
  fireEvent.click(header);
  fireEvent.click(screen.getByRole('button', { name: /Я начал\(а\) курс/ }));
  expect(await screen.findByText(/Как прошла неделя 1\?/)).toBeInTheDocument();
  expect(postBody(fetchMock, '/api/start-course')).toEqual({ user_id: USER_ID });
});

it('отчёт за неделю: оценки уходят в /api/survey, +25 SC и бонус цели месяца', async () => {
  const fetchMock = mockApi({
    course: { id: 'c1', start_date: daysAgo(8), status: 'active' },
    surveys: [{ week: 1, memory: 5, sleep: 5, energy: 5, stress: 5 }],
    post: { '/api/survey': { success: true, week: 2, scEarned: 25, monthGoalBonus: 50 } },
  });
  const onSCUpdate = jest.fn();
  render(<CourseSection userId={USER_ID} visible forceOpen onSCUpdate={onSCUpdate} />);
  expect(await screen.findByText(/Как прошла неделя 2\?/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Качество сна/), { target: { value: '8' } });
  fireEvent.change(screen.getByPlaceholderText(/Заметки о неделе/), { target: { value: 'сплю лучше' } });
  fireEvent.click(screen.getByRole('button', { name: /Сохранить неделю 2/ }));
  expect(await screen.findByText(/Неделя 2 сохранена: \+25 SC/)).toBeInTheDocument();
  expect(screen.getByText(/Цель месяца выполнена: \+50 SC/)).toBeInTheDocument();
  expect(postBody(fetchMock, '/api/survey')).toEqual({ user_id: USER_ID, memory: 5, sleep: 8, energy: 5, stress: 5, note: 'сплю лучше' });
  expect(onSCUpdate).toHaveBeenCalled();
});

it('отчёт за эту неделю уже есть — пишет, когда откроется следующий, и показывает историю', async () => {
  mockApi({
    course: { id: 'c1', start_date: daysAgo(3), status: 'active' },
    surveys: [{ week: 1, memory: 7, sleep: 6, energy: 5, stress: 4 }],
  });
  render(<CourseSection userId={USER_ID} visible forceOpen />);
  expect(await screen.findByText(/Отчёт за неделю 2 откроется/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Сохранить неделю/ })).toBeNull();
  expect(screen.getByText(/Неделя 1: 🧠 7 · 😴 6 · ⚡ 5 · 😌 4/)).toBeInTheDocument();
});

it('в заголовке — идущая неделя курса', async () => {
  mockApi({ course: { id: 'c1', start_date: daysAgo(15), status: 'active' } });
  render(<CourseSection userId={USER_ID} visible />);
  expect(await screen.findByRole('button', { name: /Мой курс.*неделя 3/ })).toBeInTheDocument();
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalledTimes(2));
});
