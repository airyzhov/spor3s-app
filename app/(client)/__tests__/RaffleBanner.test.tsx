/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RaffleBanner, { RaffleTeaser } from '../RaffleBanner';
import { prizeForFriends, raffleMe } from '../../../lib/raffle';

// Розыгрыш 10.10: карточка в кабинете и строка на главной — что видит человек в каждой стадии.
// Ответ /api/raffle подменяем — здесь проверяется только отображение.

const TG_ID = '54993853';
const USER_ID = '11111111-2222-4333-8444-555555555555';

function mockRaffle(view: object, join?: { status: number; body: object }) {
  (global as any).fetch = jest.fn(async (_url: string, opts?: { method?: string }) =>
    opts?.method === 'POST' && join
      ? { ok: join.status < 400, status: join.status, json: async () => join.body }
      : { ok: true, json: async () => ({ success: true, ...view }) },
  );
}

async function renderOpened(props: Partial<React.ComponentProps<typeof RaffleBanner>> = {}) {
  const onOpenTasks = jest.fn();
  render(<RaffleBanner userId={USER_ID} telegramId={TG_ID} onOpenTasks={onOpenTasks} {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: /Розыгрыш 10\.10/ }));
  return { onOpenTasks };
}

// С 28.09 участник = задание + нажатая «Участвую»; друзья увеличивают приз
const me = (tasks: number, friends: number, joined = false) => raffleMe({ tasks, friends, joined });

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
  // условия — задание и «Участвую»; друг их не выполняет
  expect(screen.getByRole('button', { name: /0 из 2 условий/ })).toBeInTheDocument();
  expect(screen.getByText(/Друзей: 1/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /К заданиям/ }));
  expect(onOpenTasks).toHaveBeenCalled();
});

it('«Пригласить» копирует реферальную ссылку и подтверждает это', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  mockRaffle({ stage: 'open', me: me(0, 0), winners: null });
  await renderOpened();
  fireEvent.click(screen.getByRole('button', { name: /Пригласить/ }));
  expect(await screen.findByRole('button', { name: /Ссылка скопирована/ })).toBeInTheDocument();
  expect(writeText).toHaveBeenCalledWith(`https://t.me/spor3sbot?start=${TG_ID}`);
});

it('раскрывается сразу, если пришли со строки на главной', async () => {
  mockRaffle({ stage: 'open', me: me(0, 0), winners: null });
  render(<RaffleBanner userId={USER_ID} telegramId={TG_ID} onOpenTasks={jest.fn()} expand />);
  expect(await screen.findByText(/Выполни задание на подписку/)).toBeInTheDocument();
});

describe('кнопка «Участвую»', () => {
  it('до задания неактивна и подсказывает, что сначала задание', async () => {
    mockRaffle({ stage: 'open', me: me(0, 0), winners: null });
    await renderOpened();
    expect(screen.getByRole('button', { name: '✋ Участвую' })).toBeDisabled();
    expect(screen.getByText(/Сначала выполни задание/)).toBeInTheDocument();
  });

  it('после задания: нажал — участвуешь, приз без друзей и что даст друг', async () => {
    mockRaffle({ stage: 'open', me: me(1, 0), winners: null }, { status: 200, body: { success: true, me: me(1, 0, true) } });
    await renderOpened();
    expect(screen.getByRole('button', { name: /1 из 2 условий/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '✋ Участвую' }));

    expect(await screen.findByText(/Ты участвуешь! Если выиграешь — 1 добавка на выбор\. Пригласи друга — будет 2 добавки на выбор/)).toBeInTheDocument();
    const post = (global as any).fetch.mock.calls.find(([, o]: any) => o?.method === 'POST');
    expect(post[0]).toBe('/api/raffle');
    expect(JSON.parse(post[1].body)).toEqual({ user_id: USER_ID, action: 'join' });
    expect(screen.getByRole('button', { name: /Розыгрыш 10\.10.*Ты участвуешь/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '✋ Участвую' })).toBeNull();
  });

  it('ошибку сервера показывает под кнопкой', async () => {
    mockRaffle({ stage: 'open', me: me(1, 0), winners: null }, { status: 503, body: { error: 'Скоро можно будет нажать «Участвую»' } });
    await renderOpened();
    fireEvent.click(screen.getByRole('button', { name: '✋ Участвую' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Скоро можно будет нажать «Участвую»');
  });
});

describe('строка на главной', () => {
  it('показывает статус участника и ведёт в кабинет', async () => {
    mockRaffle({ stage: 'open', me: me(1, 1, true), winners: null });
    const onOpen = jest.fn();
    render(<RaffleTeaser userId={USER_ID} telegramId={TG_ID} onOpen={onOpen} />);
    const row = await screen.findByRole('button', { name: /Розыгрыш 10\.10.*Ты участвуешь.*→/ });
    // золотая рамка карточки, а не «border: none» заголовка
    expect(row.style.border).toMatch(/^2px solid/);
    fireEvent.click(row);
    expect(onOpen).toHaveBeenCalled();
    // подробности — только в кабинете
    expect(screen.queryByText(/Выполни задание/)).toBeNull();
  });

  it('пропадает после окончания розыгрыша', async () => {
    mockRaffle({ stage: 'hidden', me: null, winners: null });
    const { container } = render(<RaffleTeaser userId={USER_ID} telegramId={TG_ID} onOpen={jest.fn()} />);
    await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

it('участнику показывает приз и сколько друзей до следующего', async () => {
  mockRaffle({ stage: 'open', me: me(1, 2, true), winners: null });
  await renderOpened();
  expect(screen.getByRole('button', { name: /Ты участвуешь/ })).toBeInTheDocument();
  expect(screen.getByText(/без друзей — 1 добавка на выбор, 1–2 друга — 2 добавки на выбор, 3 и больше — комплекс/)).toBeInTheDocument();
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
    me: me(1, 1, true),
    winners: [
      { name: '@anna', prize: prizeForFriends(6) },
      { name: 'участник …1234', prize: prizeForFriends(1) },
    ],
  });
  await renderOpened();
  expect(screen.getByText(/1\. @anna — комплекс добавок/)).toBeInTheDocument();
  expect(screen.getByText(/2\. участник …1234 — 2 добавки на выбор/)).toBeInTheDocument();
});
