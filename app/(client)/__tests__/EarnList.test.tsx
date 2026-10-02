/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import EarnList from '../EarnList';

// «Как получить SC» в кабинете (экран как у Walt, 01.10): один список вместо плашки «Получи 90 SC»,
// раздела «Задания» и раздела «Реферальная система». Список без своих запросов — всё приходит пропсами.

function renderList(props: Partial<React.ComponentProps<typeof EarnList>> = {}) {
  const handlers = {
    onOpenChannel: jest.fn(),
    onClaim: jest.fn(),
    onOpenCatalog: jest.fn(),
    onOpenCourse: jest.fn(),
  };
  render(
    <EarnList tasksDone={{}} opened={{}} loading={null} showCourse={false} {...handlers} {...props}>
      <div>панель приглашения</div>
    </EarnList>,
  );
  return handlers;
}

const task = (name: string) => within(screen.getByRole('group', { name }));

it('заголовок и три подписки с суммой и кнопкой «Подписаться»', () => {
  renderList();
  expect(screen.getByRole('heading', { name: 'Как получить SC' })).toBeInTheDocument();
  for (const name of ['Telegram', 'YouTube', 'Instagram']) {
    expect(task(name).getByText('+30 SC')).toBeInTheDocument();
    expect(task(name).getByRole('button', { name: 'Подписаться' })).toBeInTheDocument();
  }
});

it('«Подписаться» открывает канал; после перехода — «Получить +30 SC»', () => {
  const { onOpenChannel, onClaim } = renderList({ opened: { youtube: true } });
  fireEvent.click(task('Telegram').getByRole('button', { name: 'Подписаться' }));
  expect(onOpenChannel).toHaveBeenCalledWith('telegram');
  fireEvent.click(task('YouTube').getByRole('button', { name: 'Получить +30 SC' }));
  expect(onClaim).toHaveBeenCalledWith('youtube');
});

it('выполненная подписка — «✅ +30 SC получено», без кнопок; во время начисления — «⏳»', () => {
  renderList({ tasksDone: { telegram: true }, opened: { youtube: true }, loading: 'youtube' });
  expect(task('Telegram').getByText('✅ +30 SC получено')).toBeInTheDocument();
  expect(task('Telegram').queryByRole('button')).toBeNull();
  expect(task('YouTube').getByRole('button', { name: '⏳' })).toBeDisabled();
});

it('«Пригласи друга» раскрывает и сворачивает панель приглашения', () => {
  renderList();
  const row = screen.getByRole('button', { name: /Пригласи друга.*другу 100 SC, тебе 5% с его заказов/ });
  expect(row).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('панель приглашения')).toBeNull();
  fireEvent.click(row);
  expect(row).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('панель приглашения')).toBeInTheDocument();
  fireEvent.click(row);
  expect(screen.queryByText('панель приглашения')).toBeNull();
});

it('«Покупки» ведут в каталог', () => {
  const { onOpenCatalog } = renderList();
  fireEvent.click(screen.getByRole('button', { name: /Покупки.*1 SC за каждые 100 ₽/ }));
  expect(onOpenCatalog).toHaveBeenCalled();
});

it('отчёт о самочувствии — только когда доступен курс, и ведёт к разделу курса', () => {
  renderList();
  expect(screen.queryByRole('button', { name: /Отчёт о самочувствии/ })).toBeNull();
});

describe('гид новичка (02.10)', () => {
  it('первая строка списка: «Гид новичка» и сумма, нажатие открывает гид', () => {
    const onOpenGuide = jest.fn();
    renderList({ onOpenGuide });
    const row = screen.getByRole('button', { name: /Гид новичка.*\+100 SC · 7 уроков, 10 минут/ });
    expect(screen.getAllByRole('button')[0]).toBe(row);
    fireEvent.click(row);
    expect(onOpenGuide).toHaveBeenCalled();
  });

  it('пройден — «✅ +100 SC получено», перечитать можно', () => {
    const onOpenGuide = jest.fn();
    renderList({ onOpenGuide, guideDone: true });
    fireEvent.click(screen.getByRole('button', { name: /Гид новичка.*✅ \+100 SC получено/ }));
    expect(onOpenGuide).toHaveBeenCalled();
  });

  it('без обработчика строки нет', () => {
    renderList();
    expect(screen.queryByRole('button', { name: /Гид новичка/ })).toBeNull();
  });
});

it('с курсом — строка отчёта с суммами', () => {
  const { onOpenCourse } = renderList({ showCourse: true });
  fireEvent.click(screen.getByRole('button', { name: /Отчёт о самочувствии.*\+25 SC в неделю, \+50 SC за 4 отчёта в месяц/ }));
  expect(onOpenCourse).toHaveBeenCalled();
});
