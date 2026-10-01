/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RaffleBanner, { RaffleTeaser } from '../RaffleBanner';
import { prizeForFriends, prizeRulesText, raffleMe } from '../../../lib/raffle';

// Розыгрыш 10.10: карточка в кабинете (с 01.10 — всегда раскрыта, как у Walt: дедлайн, шаги,
// одна главная кнопка) и строка на главной. Ответ /api/raffle подменяем — проверяется отображение.

const TG_ID = '54993853';
const USER_ID = '11111111-2222-4333-8444-555555555555';

function mockRaffle(view: object, join?: { status: number; body: object }) {
  (global as any).fetch = jest.fn(async (_url: string, opts?: { method?: string }) =>
    opts?.method === 'POST' && join
      ? { ok: join.status < 400, status: join.status, json: async () => join.body }
      : { ok: true, json: async () => ({ success: true, ...view }) },
  );
}

async function renderCard(props: Partial<React.ComponentProps<typeof RaffleBanner>> = {}) {
  const onOpenTasks = jest.fn();
  render(<RaffleBanner userId={USER_ID} telegramId={TG_ID} onOpenTasks={onOpenTasks} {...props} />);
  await screen.findByRole('heading', { name: /Розыгрыш 10\.10/ });
  return { onOpenTasks };
}

// С 28.09 участник = задание + нажатая «Участвую»; друзья увеличивают приз
const me = (tasks: number, friends: number, joined = false) => raffleMe({ tasks, friends, joined });

// Дедлайн на карточке считается от «сейчас»: фиксируем только Date, таймеры остаются настоящими
beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers({
    now: new Date('2026-10-01T12:00:00Z'),
    doNotFake: [
      'nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
      'queueMicrotask', 'hrtime', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback',
    ],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

it('ничего не показывает после окончания розыгрыша', async () => {
  mockRaffle({ stage: 'hidden', me: null, winners: null });
  const { container } = render(<RaffleBanner userId={USER_ID} telegramId={TG_ID} onOpenTasks={jest.fn()} />);
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

it('раскрыта сразу: дедлайн, шаги, приз и главная кнопка «Выполнить задание»', async () => {
  mockRaffle({ stage: 'open', me: me(0, 1), winners: null });
  const { onOpenTasks } = await renderCard();
  expect(screen.getByText('⏳ Ещё 10 дней')).toBeInTheDocument();
  expect(screen.getByText('0 из 2 условий')).toBeInTheDocument();
  expect(screen.getByText('⬜ Задание')).toBeInTheDocument();
  expect(screen.getByText('⬜ Участвую')).toBeInTheDocument();
  expect(screen.getByText('👥 1 друг')).toBeInTheDocument();
  expect(screen.getByText(`🎁 Приз сейчас: ${prizeForFriends(1).label}`)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '✋ Участвую' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '🎯 Выполнить задание' }));
  expect(onOpenTasks).toHaveBeenCalled();
});

describe('кнопка «Участвую»', () => {
  it('после задания: нажал — участвуешь, приз и что даст друг, кнопка становится «Пригласить друга»', async () => {
    mockRaffle({ stage: 'open', me: me(1, 0), winners: null }, { status: 200, body: { success: true, me: me(1, 0, true) } });
    await renderCard();
    expect(screen.getByText('1 из 2 условий')).toBeInTheDocument();
    expect(screen.getByText('✅ Задание')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '✋ Участвую' }));

    expect(await screen.findByText(/Ты участвуешь! Если выиграешь — 1 добавка на выбор\. Пригласи друга — будет 2 добавки на выбор/)).toBeInTheDocument();
    const post = (global as any).fetch.mock.calls.find(([, o]: any) => o?.method === 'POST');
    expect(post[0]).toBe('/api/raffle');
    expect(JSON.parse(post[1].body)).toEqual({ user_id: USER_ID, action: 'join' });
    expect(screen.getByText('✅ Ты участвуешь')).toBeInTheDocument();
    expect(screen.getByText('✅ Участвую')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '✋ Участвую' })).toBeNull();
    expect(screen.getByRole('button', { name: '👥 Пригласить друга' })).toBeInTheDocument();
  });

  it('ошибку сервера показывает под кнопкой', async () => {
    mockRaffle({ stage: 'open', me: me(1, 0), winners: null }, { status: 503, body: { error: 'Скоро можно будет нажать «Участвую»' } });
    await renderCard();
    fireEvent.click(screen.getByRole('button', { name: '✋ Участвую' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Скоро можно будет нажать «Участвую»');
  });
});

it('участнику — приз, сколько друзей до следующего и «Пригласить» копирует ссылку', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  mockRaffle({ stage: 'open', me: me(1, 2, true), winners: null });
  await renderCard();
  expect(screen.getByText(/Если выиграешь — 2 добавки на выбор\. Пригласи ещё 1 друга — будет комплекс добавок/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Выполнить задание/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '👥 Пригласить друга' }));
  expect(await screen.findByRole('button', { name: /Ссылка скопирована/ })).toBeInTheDocument();
  expect(writeText).toHaveBeenCalledWith(`https://t.me/spor3sbot?start=${TG_ID}`);
});

it('«Условия ›» — правила призов, кто считается другом и сроки', async () => {
  mockRaffle({ stage: 'open', me: me(0, 0), winners: null });
  await renderCard();
  expect(screen.queryByText(/Друг засчитывается/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Условия ›' }));
  expect(screen.getByText(new RegExp(prizeRulesText()))).toBeInTheDocument();
  expect(screen.getByText(/Друг засчитывается, если перешёл по твоей ссылке и открыл магазин/)).toBeInTheDocument();
  expect(screen.getByText(/Победителей выберем 12 октября/)).toBeInTheDocument();
});

it('гостю без Telegram объясняет, что участвовать можно только через бота, — без кнопок участия', async () => {
  mockRaffle({ stage: 'open', me: me(0, 0), winners: null });
  await renderCard({ telegramId: 'guest-1' });
  expect(screen.getByText(/только через Telegram/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Выполнить задание|Участвую|Пригласить/ })).toBeNull();
});

it('после конца приёма — «приём закрыт», без дедлайна и кнопок', async () => {
  mockRaffle({ stage: 'closed', me: me(0, 0), winners: null });
  await renderCard();
  expect(screen.getByText(/Приём заявок закрыт\. Победителей выберем 12 октября/)).toBeInTheDocument();
  expect(screen.queryByText(/⏳/)).toBeNull();
  expect(screen.queryByRole('button', { name: /Выполнить задание|Участвую|Пригласить/ })).toBeNull();
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
  await renderCard();
  expect(screen.getByText('🏆 Итоги')).toBeInTheDocument();
  expect(screen.getByText(/1\. @anna — комплекс добавок/)).toBeInTheDocument();
  expect(screen.getByText(/2\. участник …1234 — 2 добавки на выбор/)).toBeInTheDocument();
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
    expect(screen.queryByText(/Выполнить задание/)).toBeNull();
  });

  it('пропадает после окончания розыгрыша', async () => {
    mockRaffle({ stage: 'hidden', me: null, winners: null });
    const { container } = render(<RaffleTeaser userId={USER_ID} telegramId={TG_ID} onOpen={jest.fn()} />);
    await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
