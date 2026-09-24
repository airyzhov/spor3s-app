/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScStatus from '../ScStatus';
import { nextLevelNeeds } from '../../../lib/levelUtils';

// Панель SC в кабинете: строка уровня говорит, чего не хватает — SC или заказов, —
// «Пригласить друга» копирует ссылку, а после начисления в кабинете данные перечитываются.
// Ответ /api/home-summary подменяем.

const USER_ID = '11111111-2222-4333-8444-555555555555';

function mockSummary({ sc, telegramId = '54993853' }: { sc: number; telegramId?: string | null }) {
  const needs = nextLevelNeeds(sc, 0, 0);
  (global as any).fetch = jest.fn().mockResolvedValue({
    json: async () => ({
      success: true,
      sc,
      totalEarned: sc,
      level: { code: 'novice', name: '🌱 Новичок', icon: '🌱', progress: Math.min(1, sc / 100), scToNext: 100 - sc, nextName: needs?.name ?? null, needs },
      friends: 0,
      referralEarned: 0,
      telegramId,
      tasks: { done: 0, total: 3, left: 3, bonusPerTask: 30 },
      monthGoal: { reportsDone: 0, reportsTarget: 4, bonus: 50, bonusPaid: false, completed: false },
    }),
  });
}

async function renderOpened() {
  render(<ScStatus userId={USER_ID} />);
  fireEvent.click(await screen.findByRole('button', { name: /SC/ }));
}

beforeEach(() => {
  localStorage.clear();
});

it('с 1000 SC без заказов пишет, что до Собирателя не хватает заказа, а не минус SC', async () => {
  mockSummary({ sc: 1000 });
  await renderOpened();
  expect(screen.getByText('До уровня 🌿 Собиратель: ещё 1 заказ')).toBeInTheDocument();
  expect(screen.queryByText(/-\d+ SC/)).toBeNull();
});

it('«Пригласить друга» копирует реферальную ссылку', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  mockSummary({ sc: 0 });
  await renderOpened();
  fireEvent.click(screen.getByRole('button', { name: /Пригласить друга/ }));
  expect(await screen.findByRole('button', { name: /Ссылка скопирована/ })).toBeInTheDocument();
  expect(writeText).toHaveBeenCalledWith('https://t.me/spor3sbot?start=54993853');
});

it('без Telegram ID кнопки приглашения нет', async () => {
  mockSummary({ sc: 0, telegramId: null });
  await renderOpened();
  expect(screen.queryByRole('button', { name: /Пригласить/ })).toBeNull();
});

it('уровень в шапке и кнопка «Уровни и награды» открывают окно уровней', async () => {
  mockSummary({ sc: 1000 });
  render(<ScStatus userId={USER_ID} />);
  fireEvent.click(await screen.findByRole('button', { name: /Новичок ›/ }));
  expect(screen.getByRole('dialog', { name: /Уровни и награды/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  expect(screen.queryByRole('dialog')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /SC/ }));
  fireEvent.click(screen.getByRole('button', { name: /Уровни и награды/ }));
  expect(screen.getByRole('dialog', { name: /Уровни и награды/ })).toBeInTheDocument();
});

it('перечитывает данные, когда в кабинете начислили SC', async () => {
  mockSummary({ sc: 0 });
  const { rerender } = render(<ScStatus userId={USER_ID} refreshKey={0} />);
  await screen.findByText('💰 0 SC');
  mockSummary({ sc: 30 });
  rerender(<ScStatus userId={USER_ID} refreshKey={1} />);
  expect(await screen.findByText('💰 30 SC')).toBeInTheDocument();
});
