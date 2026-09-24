/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import LevelsModal from '../LevelsModal';

// Окно «Уровни и награды»: текущий уровень, прогресс по каждому требованию следующего
// уровня (SC и заказы) и все пять уровней с отметками. Суммы в рублях — с неразрывными пробелами.
const plain = (s: string | null) => (s || '').replace(/\s+/g, ' ');

function renderModal(props: Partial<React.ComponentProps<typeof LevelsModal>> = {}) {
  const onClose = jest.fn();
  render(<LevelsModal totalEarned={0} ordersAmount={0} ordersCount={0} onClose={onClose} {...props} />);
  return { onClose, dialog: screen.getByRole('dialog', { name: /Уровни и награды/ }) };
}

const levelCard = (code: string) => document.querySelector(`[data-level="${code}"]`) as HTMLElement;

it('с 1000 SC без заказов: Новичок, SC до Собирателя хватает, не хватает заказа', () => {
  const { dialog } = renderModal({ totalEarned: 1000 });
  expect(plain(dialog.textContent)).toContain('Твой уровень: 🌱 Новичок');
  expect(plain(dialog.textContent)).toContain('До уровня 🌿 Собиратель');
  expect(plain(dialog.textContent)).toMatch(/SC за всё время1000 \/ 100 ✅/);
  expect(plain(dialog.textContent)).toMatch(/Заказы0 \/ 1/);
  expect(within(levelCard('novice')).getByText('твой уровень')).toBeInTheDocument();
  expect(within(levelCard('collector')).getByText('🔒')).toBeInTheDocument();
});

it('показывает все пять уровней с требованиями и наградами', () => {
  renderModal();
  expect(document.querySelectorAll('[data-level]')).toHaveLength(5);
  expect(plain(levelCard('expert').textContent)).toContain('300 SC · заказы от 5 000 ₽');
  expect(levelCard('expert').textContent).toContain('Ежемесячные закрытые розыгрыши');
  expect(levelCard('expert').textContent).not.toMatch(/чат/i);
  expect(plain(levelCard('master').textContent)).toContain('5% скидка на заказ от 10 000 ₽');
});

it('Эксперту показывает пройденные уровни и прогресс по сумме заказов до Мастера', () => {
  const { dialog } = renderModal({ totalEarned: 350, ordersAmount: 6000, ordersCount: 2 });
  expect(plain(dialog.textContent)).toContain('Твой уровень: 🌳 Эксперт');
  expect(within(levelCard('collector')).getByText('✅ пройден')).toBeInTheDocument();
  expect(plain(dialog.textContent)).toMatch(/SC за всё время350 \/ 600/);
  expect(plain(dialog.textContent)).toMatch(/Сумма заказов6 000 ₽ \/ 10 000 ₽/);
});

it('на Легенде пишет, что уровень максимальный', () => {
  const { dialog } = renderModal({ totalEarned: 1200, ordersAmount: 25000, ordersCount: 5 });
  expect(dialog.textContent).toContain('Это максимальный уровень');
});

it('закрывается крестиком, тапом по фону и клавишей Escape, но не тапом внутри окна', () => {
  const { onClose, dialog } = renderModal();
  fireEvent.click(dialog);
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  fireEvent.click(dialog.parentElement!);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(3);
});
