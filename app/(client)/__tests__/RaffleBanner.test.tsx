/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RaffleBanner from '../RaffleBanner';
import { prizeForFriends, nextPrize } from '../../../lib/raffle';

// Кнопка «Розыгрыш 10.10» на главной: что видит человек в каждой стадии розыгрыша.
// Ответ /api/raffle подменяем — здесь проверяется только отображение.

const TG_ID = '54993853';
const USER_ID = '11111111-2222-4333-8444-555555555555';

function mockRaffle(view: object) {
  (global as any).fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: true, ...view }) });
}

async function renderOpened(props: Partial<React.ComponentProps<typeof RaffleBanner>> = {}) {
  const onOpenTasks = jest.fn();
  render(<RaffleBanner userId={USER_ID} telegramId={TG_ID} onOpenTasks={onOpenTasks} {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: /Розыгрыш 10\.10/ }));
  return { onOpenTasks };
}

const me = (tasks: number, friends: number) => {
  const eligible = tasks >= 1 && friends >= 1;
  return { tasks, friends, eligible, prize: eligible ? prizeForFriends(friends) : null, next: nextPrize(friends) };
};

beforeEach(() => {
  localStorage.clear();
});

it('ничего не показывает, пока нет ответа, и после окончания розыгрыша', async () => {
  mockRaffle({ stage: 'hidden', me: null, winners: null });
  const { container } = render(<RaffleBanner userId={USER_ID} telegramId={TG_ID} onOpenTasks={jest.fn()} />);
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

it('гостю без Telegram объясняет, что участвовать можно только через бота', async () => {
  mockRaffle({ stage: 'open', me: me(0, 0), winners: null });
  await renderOpened({ telegramId: 'guest-1' });
  expect(screen.getByText(/только через Telegram/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Пригласить/ })).toBeNull();
});

it('показывает прогресс по условиям и ведёт к заданиям', async () => {
  mockRaffle({ stage: 'open', me: me(0, 1), winners: null });
  const { onOpenTasks } = await renderOpened();
  expect(screen.getByRole('button', { name: /1 из 2 условий/ })).toBeInTheDocument();
  expect(screen.getByText(/Друзей: 1/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /К заданиям/ }));
  expect(onOpenTasks).toHaveBeenCalled();
});

it('участнику показывает приз и сколько друзей до следующего', async () => {
  mockRaffle({ stage: 'open', me: me(1, 4), winners: null });
  await renderOpened();
  expect(screen.getByRole('button', { name: /Ты участвуешь/ })).toBeInTheDocument();
  expect(screen.getByText(/1–2 друга — 1 добавка на выбор, 3–4 друга — 2 добавки на выбор, 5 и больше — комплекс/)).toBeInTheDocument();
  expect(screen.getByText(/Если выиграешь — 2 добавки на выбор\. Пригласи ещё 1 друга — будет комплекс добавок/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /К заданиям/ })).toBeNull();
});

it('после конца приёма пишет, что приём закрыт, и не предлагает приглашать', async () => {
  mockRaffle({ stage: 'closed', me: me(0, 0), winners: null });
  await renderOpened();
  expect(screen.getByText(/Приём заявок закрыт\. Победителей выберем 12 октября/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Пригласить/ })).toBeNull();
});

it('после итогов показывает победителей с призами', async () => {
  mockRaffle({
    stage: 'drawn',
    me: me(1, 1),
    winners: [
      { name: '@anna', prize: prizeForFriends(6) },
      { name: 'участник …1234', prize: prizeForFriends(1) },
    ],
  });
  await renderOpened();
  expect(screen.getByText(/1\. @anna — комплекс добавок/)).toBeInTheDocument();
  expect(screen.getByText(/2\. участник …1234 — 1 добавка на выбор/)).toBeInTheDocument();
});
