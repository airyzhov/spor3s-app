/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MotivationalHabit from '../MotivationalHabit';
import { habitStatus, type HabitView } from '../../lib/habit';

// Карточка привычки в кабинете: что видит человек в каждом состоянии и что уходит в API.
// Ответы /api/motivational-habit подменяем; правила недель — настоящие (lib/habit.ts).

const USER_ID = '11111111-2222-4333-8444-555555555555';
const NOW = new Date('2026-09-25T12:00:00Z');
const presets = [
  { id: 'p1', name: 'Прогулка 30 минут', description: 'Каждый день на свежем воздухе', icon: '🚶' },
  { id: 'p2', name: 'Медитация 10 минут', description: 'Утром или перед сном', icon: '🧘' },
];

function view(over: Partial<HabitView> = {}): HabitView & { success: true } {
  return { success: true, tableReady: true, access: true, levelName: '🌿 Собиратель', needs: null, habit: null, status: null, presets, ...over };
}

function activeView(startedDaysAgo: number, reports: { week_number: number; is_completed: boolean; sc_earned?: number }[] = []) {
  const started_at = new Date(NOW.getTime() - startedDaysAgo * 24 * 60 * 60 * 1000).toISOString();
  const habit = { id: 'h1', habit_name: 'Прогулка 30 минут', habit_type: 'predefined', description: null, started_at };
  return view({ habit, status: habitStatus(started_at, reports, NOW) });
}

function mockResponses(...bodies: object[]) {
  const fetchMock = jest.fn();
  bodies.forEach((body) => fetchMock.mockResolvedValueOnce({ ok: !(body as any).error, json: async () => body }));
  (global as any).fetch = fetchMock;
  return fetchMock;
}

const postBody = (fetchMock: jest.Mock, call: number) => JSON.parse(fetchMock.mock.calls[call][1].body);

// Раздел изначально свёрнут (CabinetSection); остальные тесты смотрят содержимое — раскрываем, как человек
beforeEach(() => localStorage.setItem('spor3s_habit_open', '1'));

it('изначально свёрнута: в заголовке — идущая неделя, содержимого нет', async () => {
  localStorage.clear();
  mockResponses(activeView(8, [{ week_number: 1, is_completed: true, sc_earned: 25 }]));
  render(<MotivationalHabit userId={USER_ID} />);
  expect(await screen.findByRole('button', { name: /Мотивационная привычка.*неделя 2 из 4/ })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: /Получилось/ })).toBeNull();
});

it('пока SQL не выполнен — обещает, что скоро', async () => {
  mockResponses(view({ tableReady: false }));
  render(<MotivationalHabit userId={USER_ID} />);
  expect(await screen.findByText(/Скоро здесь можно будет выбрать привычку/)).toBeInTheDocument();
});

it('без уровня Собиратель — замок и чего не хватает', async () => {
  mockResponses(view({ access: false, levelName: '🌱 Новичок', needs: { name: '🌿 Собиратель', sc: 40, ordersAmount: 0, ordersCount: 1 } }));
  render(<MotivationalHabit userId={USER_ID} />);
  expect(await screen.findByText(/Откроется на уровне 🌿 Собиратель: ещё 40 SC и 1 заказ/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Начать/ })).toBeNull();
});

it('выбор привычки: готовая из списка уходит в API и привычка начинается', async () => {
  const fetchMock = mockResponses(view(), activeView(0));
  render(<MotivationalHabit userId={USER_ID} />);
  const startBtn = await screen.findByRole('button', { name: /Начать привычку/ });
  expect(startBtn).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Прогулка 30 минут/ }));
  expect(startBtn).toBeEnabled();
  fireEvent.click(startBtn);
  expect(await screen.findByText(/Привычка «Прогулка 30 минут» началась/)).toBeInTheDocument();
  expect(postBody(fetchMock, 1)).toEqual({ user_id: USER_ID, action: 'start', name: 'Прогулка 30 минут' });
  expect(screen.getByText('Неделя 1 из 4')).toBeInTheDocument();
});

it('отчёт «получилось» с комментарием: +25 SC и панель SC перечитывается', async () => {
  const fetchMock = mockResponses(
    activeView(2),
    { ...activeView(2, [{ week_number: 1, is_completed: true, sc_earned: 25 }]), scEarned: 25, reportedWeek: 1 },
  );
  const onSCUpdate = jest.fn();
  render(<MotivationalHabit userId={USER_ID} onSCUpdate={onSCUpdate} />);
  fireEvent.change(await screen.findByPlaceholderText(/Комментарий/), { target: { value: 'гулял каждый вечер' } });
  fireEvent.click(screen.getByRole('button', { name: /Получилось \+25 SC/ }));
  expect(await screen.findByText(/Неделя 1 засчитана: \+25 SC/)).toBeInTheDocument();
  expect(postBody(fetchMock, 1)).toEqual({ user_id: USER_ID, action: 'report', is_completed: true, note: 'гулял каждый вечер' });
  expect(onSCUpdate).toHaveBeenCalled();
  // за эту неделю отчёт уже есть — кнопок нет, указано, когда следующий
  expect(screen.queryByRole('button', { name: /Получилось/ })).toBeNull();
  expect(screen.getByText(/Отчёт за неделю 1 есть\. Следующий — с/)).toBeInTheDocument();
});

it('неделя без отчёта отмечена прочерком, идущая — точкой', async () => {
  mockResponses(activeView(15, [{ week_number: 1, is_completed: true, sc_earned: 25 }]));
  render(<MotivationalHabit userId={USER_ID} />);
  await screen.findByText('Неделя 3 из 4');
  const states = Array.from(document.querySelectorAll('[data-week]')).map((el) => el.getAttribute('data-week'));
  expect(states).toEqual(['done', 'skipped', 'current', 'upcoming']);
});

it('после 4 недель — итог и выбор новой привычки', async () => {
  mockResponses(activeView(30, [
    { week_number: 1, is_completed: true, sc_earned: 25 },
    { week_number: 2, is_completed: false, sc_earned: 0 },
    { week_number: 4, is_completed: true, sc_earned: 25 },
  ]));
  render(<MotivationalHabit userId={USER_ID} />);
  expect(await screen.findByText(/закончилась: получилось 2 из 4 недель, \+50 SC/)).toBeInTheDocument();
  expect(screen.getByText('Выбери новую привычку на 4 недели:')).toBeInTheDocument();
});

it('своя привычка короче 2 символов не отправляется, ошибка сервера показывается', async () => {
  mockResponses(view(), { error: 'Сейчас идёт привычка «X»' });
  render(<MotivationalHabit userId={USER_ID} />);
  const input = await screen.findByPlaceholderText(/Или своя/);
  fireEvent.change(input, { target: { value: 'я' } });
  expect(screen.getByRole('button', { name: /Начать привычку/ })).toBeDisabled();
  fireEvent.change(input, { target: { value: 'Английский 15 минут' } });
  fireEvent.click(screen.getByRole('button', { name: /Начать привычку/ }));
  await waitFor(() => expect(screen.getByText('Сейчас идёт привычка «X»')).toBeInTheDocument());
});

