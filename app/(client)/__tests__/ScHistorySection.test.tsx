/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScHistorySection from '../ScHistorySection';

// «🧾 История SC» в кабинете: все начисления и списания, новые сверху; нет операций — раздела нет;
// по кнопке бота (?open=sc) раскрыт сразу (просьба владельца 30.09). Ответ /api/sc-history подменяем.

const USER_ID = '11111111-2222-4333-8444-555555555555';
const TX = [
  { id: 't2', created_at: '2026-09-30T09:40:00Z', amount: -50, description: 'Списание SC для заказа #03d1710f-ffe0-4b2c-8555-b784f6e34b80', source_type: 'order_discount' },
  { id: 't1', created_at: '2026-09-28T11:02:00Z', amount: 30, description: 'Бонус за задание: Telegram канал', source_type: 'subscribe_telegram' },
];

function mockHistory(transactions: unknown[]) {
  (global as any).fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: true, transactions }) });
}

beforeEach(() => {
  localStorage.clear();
});

it('нет операций — раздела нет', async () => {
  mockHistory([]);
  const { container } = render(<ScHistorySection userId={USER_ID} />);
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith(`/api/sc-history?user_id=${USER_ID}`));
  expect(container).toBeEmptyDOMElement();
});

it('свёрнут, в заголовке число операций; раскрытый — суммы, даты и короткие номера заказов', async () => {
  mockHistory(TX);
  render(<ScHistorySection userId={USER_ID} />);
  const header = await screen.findByRole('button', { name: /История SC/ });
  expect(header).toHaveTextContent('2');
  expect(screen.queryByText('+30 SC')).toBeNull();

  fireEvent.click(header);
  expect(screen.getByText('+30 SC')).toBeInTheDocument();
  expect(screen.getByText('−50 SC')).toBeInTheDocument();
  expect(screen.getByText('Списание SC для заказа #03d1710f')).toBeInTheDocument();
  expect(screen.getByText('28.09 14:02')).toBeInTheDocument();
});

it('пришли по кнопке бота «🧾 История SC» — раскрыт сразу', async () => {
  mockHistory(TX);
  render(<ScHistorySection userId={USER_ID} forceOpen />);
  expect(await screen.findByText('+30 SC')).toBeInTheDocument();
});

it('после начисления в кабинете (refreshKey) — перечитывает', async () => {
  mockHistory(TX);
  const { rerender } = render(<ScHistorySection userId={USER_ID} refreshKey={0} />);
  await screen.findByRole('button', { name: /История SC/ });
  rerender(<ScHistorySection userId={USER_ID} refreshKey={1} />);
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalledTimes(2));
});

it('без пользователя — в API не ходит', () => {
  mockHistory(TX);
  render(<ScHistorySection />);
  expect((global as any).fetch).not.toHaveBeenCalled();
});
