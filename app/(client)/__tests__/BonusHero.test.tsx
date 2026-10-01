/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BonusHero from '../BonusHero';
import { nextLevelNeeds } from '../../../lib/levelUtils';

// Шапка кабинета (экран как у Walt, 01.10): крупно баланс SC и сколько это рублей скидки, чего не
// хватает до уровня, кнопки «уровень», «История» и «Как это работает», строка «Вас пригласил».
// Ответ /api/home-summary подменяем.

const USER_ID = '11111111-2222-4333-8444-555555555555';

function mockSummary({ sc, invitedBy = null }: { sc: number; invitedBy?: { name: string; welcomeSc: number } | null }) {
  const needs = nextLevelNeeds(sc, 0, 0);
  (global as any).fetch = jest.fn().mockResolvedValue({
    json: async () => ({
      success: true,
      sc,
      totalEarned: sc,
      level: { code: 'novice', name: '🌱 Новичок', icon: '🌱', progress: Math.min(1, sc / 100), scToNext: 100 - sc, nextName: needs?.name ?? null, needs },
      orders: { amount: 0, count: 0 },
      friends: 0,
      referralEarned: 0,
      telegramId: '54993853',
      invitedBy,
      tasks: { done: 0, total: 3, left: 3, bonusPerTask: 30 },
      monthGoal: { reportsDone: 0, reportsTarget: 4, bonus: 50, bonusPaid: false, completed: false },
    }),
  });
}

const renderHero = (props: Partial<React.ComponentProps<typeof BonusHero>> = {}) =>
  render(<BonusHero userId={USER_ID} onOpenHistory={jest.fn()} {...props} />);

it('крупно баланс и сколько это рублей скидки', async () => {
  mockSummary({ sc: 130 });
  renderHero();
  expect(await screen.findByText('130')).toBeInTheDocument();
  expect(screen.getByText('Ваши SC')).toBeInTheDocument();
  expect(screen.getByText('= 130 ₽ скидки · до 30% суммы заказа')).toBeInTheDocument();
});

it('без SC — правило вместо «= 0 ₽»', async () => {
  mockSummary({ sc: 0 });
  renderHero();
  expect(await screen.findByText('1 SC = 1 ₽ скидки · до 30% суммы заказа')).toBeInTheDocument();
});

it('с 1000 SC без заказов пишет, что до Собирателя не хватает заказа, а не минус SC', async () => {
  mockSummary({ sc: 1000 });
  renderHero();
  expect(await screen.findByText('До уровня 🌿 Собиратель: ещё 1 заказ')).toBeInTheDocument();
  expect(screen.queryByText(/-\d+ SC/)).toBeNull();
});

it('кнопка уровня открывает окно «Уровни и награды»', async () => {
  mockSummary({ sc: 1000 });
  renderHero();
  fireEvent.click(await screen.findByRole('button', { name: '🌱 Новичок ›' }));
  expect(screen.getByRole('dialog', { name: /Уровни и награды/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('«🧾 История ›» ведёт к истории SC', async () => {
  mockSummary({ sc: 130 });
  const onOpenHistory = jest.fn();
  renderHero({ onOpenHistory });
  fireEvent.click(await screen.findByRole('button', { name: '🧾 История ›' }));
  expect(onOpenHistory).toHaveBeenCalled();
});

it('«Как это работает» — окно с правилами SC и способами заработать', async () => {
  mockSummary({ sc: 130 });
  renderHero();
  fireEvent.click(await screen.findByRole('button', { name: '❓ Как это работает' }));
  const dialog = screen.getByRole('dialog', { name: 'Как работают SC' });
  expect(dialog).toHaveTextContent('1 SC = 1 ₽ скидки');
  expect(dialog).toHaveTextContent('до 30% суммы');
  expect(dialog).toHaveTextContent('+30 SC за каждую');
  expect(dialog).toHaveTextContent('ему 100 SC сразу, тебе 5%');
  expect(dialog).toHaveTextContent('1 SC за каждые 100 ₽');
  expect(dialog).toHaveTextContent('+25 SC в неделю, +50 SC за 4 отчёта в месяц');
  expect(dialog).toHaveTextContent('скидку 5%');
  expect(dialog).toHaveTextContent('10%');
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('перечитывает данные, когда в кабинете начислили SC', async () => {
  mockSummary({ sc: 0 });
  const { rerender } = renderHero({ refreshKey: 0 });
  await screen.findByText('0');
  mockSummary({ sc: 30 });
  rerender(<BonusHero userId={USER_ID} onOpenHistory={jest.fn()} refreshKey={1} />);
  expect(await screen.findByText('30')).toBeInTheDocument();
});

it('приглашённому видно, кто пригласил, и приветственные SC', async () => {
  mockSummary({ sc: 100, invitedBy: { name: '@web3grow', welcomeSc: 100 } });
  renderHero();
  expect(await screen.findByText('🤝 Вас пригласил @web3grow · 🎁 +100 SC')).toBeInTheDocument();
});

it('пока бонус не начислен — только кто пригласил; без приглашения строки нет', async () => {
  mockSummary({ sc: 0, invitedBy: { name: 'друг', welcomeSc: 0 } });
  const { unmount } = renderHero();
  expect(await screen.findByText('🤝 Вас пригласил друг')).toBeInTheDocument();
  unmount();
  mockSummary({ sc: 0 });
  renderHero();
  await screen.findByText('0');
  expect(screen.queryByText(/Вас пригласил/)).toBeNull();
});

it('без пользователя — ничего не показывает и в API не ходит', () => {
  mockSummary({ sc: 0 });
  const { container } = render(<BonusHero onOpenHistory={jest.fn()} />);
  expect(container).toBeEmptyDOMElement();
  expect((global as any).fetch).not.toHaveBeenCalled();
});
