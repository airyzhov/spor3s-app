/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InviterCodeForm from '../InviterCodeForm';

// Поле «Код друга» в разделе «Реферальная система»: пришёл без ссылки — вводит @username или
// Telegram ID пригласившего и сразу получает 100 SC. Ответ /api/referral-bonus подменяем.

const USER_ID = '11111111-2222-4333-8444-555555555555';

function mockResponse(status: number, body: unknown) {
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
}

function type(value: string) {
  fireEvent.change(screen.getByLabelText('Код друга'), { target: { value } });
}

it('без кода кнопка неактивна', () => {
  render(<InviterCodeForm userId={USER_ID} onClaimed={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Получить 100 SC' })).toBeDisabled();
});

it('отправляет код друга и сообщает кабинету об успехе', async () => {
  mockResponse(200, { success: true, invitedBy: { name: '@web3grow', welcomeSc: 100 } });
  const onClaimed = jest.fn();
  render(<InviterCodeForm userId={USER_ID} onClaimed={onClaimed} />);
  type(' @web3grow ');
  fireEvent.click(screen.getByRole('button', { name: 'Получить 100 SC' }));

  await screen.findByRole('button', { name: 'Получить 100 SC' });
  expect((global as any).fetch).toHaveBeenCalledWith('/api/referral-bonus', expect.objectContaining({ method: 'POST' }));
  const body = JSON.parse((global as any).fetch.mock.calls[0][1].body);
  expect(body).toEqual({ user_id: USER_ID, code: '@web3grow' });
  expect(onClaimed).toHaveBeenCalledTimes(1);
});

it('показывает ошибку сервера и не сообщает об успехе', async () => {
  mockResponse(409, { error: 'Пригласивший у вас уже есть' });
  const onClaimed = jest.fn();
  render(<InviterCodeForm userId={USER_ID} onClaimed={onClaimed} />);
  type('5554098114');
  fireEvent.click(screen.getByRole('button', { name: 'Получить 100 SC' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Пригласивший у вас уже есть');
  expect(onClaimed).not.toHaveBeenCalled();
});

it('нет сети — просит попробовать ещё раз', async () => {
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('offline'));
  render(<InviterCodeForm userId={USER_ID} onClaimed={jest.fn()} />);
  type('@web3grow');
  fireEvent.click(screen.getByRole('button', { name: 'Получить 100 SC' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Нет связи — попробуйте ещё раз');
});
