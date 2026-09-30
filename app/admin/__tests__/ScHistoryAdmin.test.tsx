/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ScHistoryAdmin from '../ScHistoryAdmin';

// История SC выбранного в «💰 Начислить SC»: новые сверху, начисления и списания со знаком,
// ручные операции помечены, номера заказов короткие (просьба владельца 30.09). Ответ API подменяем.

const TX = [
  { id: 't4', created_at: '2026-09-30T09:40:00Z', amount: 50, description: 'Компенсация за доставку', source_type: 'manual' },
  { id: 't3', created_at: '2026-09-28T11:02:00Z', amount: 30, description: 'Бонус за задание: Telegram канал', source_type: 'subscribe_telegram' },
  { id: 't1', created_at: '2026-09-20T08:15:00Z', amount: -50, description: 'Списание SC для заказа #03d1710f-ffe0-4b2c-8555-b784f6e34b80', source_type: 'order_discount' },
];

function mockApi(status: number, body: unknown) {
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: status === 200, status, json: async () => body });
}

it('заголовок с числом операций, суммы со знаком, короткий номер заказа, пометка «вручную»', async () => {
  mockApi(200, { transactions: TX });
  render(<ScHistoryAdmin userId="u1" secret="s3cret" />);
  expect(await screen.findByText('🧾 История SC — 3 операции')).toBeInTheDocument();
  expect(screen.getByText('+50')).toBeInTheDocument();
  expect(screen.getByText('+30')).toBeInTheDocument();
  expect(screen.getByText('−50')).toBeInTheDocument();
  expect(screen.getByText('Списание SC для заказа #03d1710f')).toBeInTheDocument();
  expect(screen.getByText('30.09 12:40')).toBeInTheDocument();
  expect(screen.getAllByText('· вручную')).toHaveLength(1);
  expect((global as any).fetch).toHaveBeenCalledWith('/api/admin/sc-history?user_id=u1', { headers: { 'x-admin-secret': 's3cret' } });
});

it('после начисления (refreshKey) — перечитывает', async () => {
  mockApi(200, { transactions: TX });
  const { rerender } = render(<ScHistoryAdmin userId="u1" secret="s3cret" refreshKey={0} />);
  await screen.findByText('🧾 История SC — 3 операции');
  rerender(<ScHistoryAdmin userId="u1" secret="s3cret" refreshKey={1} />);
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalledTimes(2));
});

it('операций нет — так и пишет', async () => {
  mockApi(200, { transactions: [] });
  render(<ScHistoryAdmin userId="u1" secret="s3cret" />);
  expect(await screen.findByText('Операций пока нет')).toBeInTheDocument();
});

it('ошибка API — её текст', async () => {
  mockApi(401, { error: 'Доступ запрещён' });
  render(<ScHistoryAdmin userId="u1" secret="wrong" />);
  expect(await screen.findByText('Доступ запрещён')).toBeInTheDocument();
});
