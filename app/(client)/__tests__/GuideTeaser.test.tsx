/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GuideTeaser from '../GuideTeaser';

// Плашка гида на главной (02.10): пока гид не пройден, зовёт в кабинет к гиду. Статус — /api/guide.

const USER_ID = '11111111-2222-4333-8444-555555555555';
const mockStatus = (completed: boolean) => {
  (global as any).fetch = jest.fn().mockResolvedValue({ json: async () => ({ success: true, completed }) });
};
// Дождаться, пока ответ статуса обработан
const settle = async () => {
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
  await act(async () => {});
};

it('гид не пройден — плашка с наградой, нажатие ведёт к гиду', async () => {
  mockStatus(false);
  const onOpen = jest.fn();
  render(<GuideTeaser userId={USER_ID} onOpen={onOpen} />);
  const teaser = await screen.findByRole('button', { name: /Гид новичка: 7 уроков → \+100 SC/ });
  expect((global as any).fetch).toHaveBeenCalledWith(`/api/guide?user_id=${USER_ID}`);
  fireEvent.click(teaser);
  expect(onOpen).toHaveBeenCalled();
});

it('гид пройден — плашки нет', async () => {
  mockStatus(true);
  render(<GuideTeaser userId={USER_ID} onOpen={jest.fn()} />);
  await settle();
  expect(screen.queryByRole('button')).toBeNull();
});

it('без пользователя — ничего не спрашиваем и не показываем', () => {
  (global as any).fetch = jest.fn();
  render(<GuideTeaser userId={undefined} onOpen={jest.fn()} />);
  expect((global as any).fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole('button')).toBeNull();
});

it('статус не пришёл — плашку не показываем', async () => {
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('offline'));
  render(<GuideTeaser userId={USER_ID} onOpen={jest.fn()} />);
  await settle();
  expect(screen.queryByRole('button')).toBeNull();
});
