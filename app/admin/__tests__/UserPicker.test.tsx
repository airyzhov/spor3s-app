/**
 * @jest-environment jsdom
 */
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserPicker, { type PickerUser } from '../UserPicker';

// «💰 Начислить SC»: человек ищется по части ника или Telegram ID, у каждого варианта видны ник, имя,
// ID и баланс; выбранный — отдельной строкой, «сменить» сбрасывает (просьба владельца 30.09).

const USERS: PickerUser[] = [
  { id: 'u1', telegram_id: '1688404602', name: 'Алексей', username: 'Lopata03', balance: 0 },
  { id: 'u2', telegram_id: '5550001234', name: null, username: '@lopatin', balance: 30 },
  { id: 'u3', telegram_id: '7000000001', name: 'Мария', username: null, balance: 130 },
];

function Harness({ users = USERS, onChange }: { users?: PickerUser[]; onChange?: (id: string) => void }) {
  const [value, setValue] = useState('');
  return <UserPicker users={users} value={value} onChange={(id) => { setValue(id); onChange?.(id); }} />;
}

const search = () => screen.getByRole('searchbox', { name: 'Поиск пользователя' });

it('пока ничего не введено — вариантов нет', () => {
  render(<Harness />);
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});

it('часть ника без учёта регистра — варианты с ником, именем, ID и балансом', () => {
  render(<Harness />);
  fireEvent.change(search(), { target: { value: 'LOPA' } });
  expect(screen.getByRole('button', { name: '@Lopata03 · Алексей · ID 1688404602 · 0 SC' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '@lopatin · ID 5550001234 · 30 SC' })).toBeInTheDocument();
});

it('часть Telegram ID; без ника — «без ника»', () => {
  render(<Harness />);
  fireEvent.change(search(), { target: { value: '7000' } });
  expect(screen.getByRole('button', { name: 'без ника · Мария · ID 7000000001 · 130 SC' })).toBeInTheDocument();
});

it('клик выбирает, «сменить» возвращает поиск', () => {
  const onChange = jest.fn();
  render(<Harness onChange={onChange} />);
  fireEvent.change(search(), { target: { value: 'lopata' } });
  fireEvent.click(screen.getByRole('button', { name: /@Lopata03/ }));
  expect(onChange).toHaveBeenLastCalledWith('u1');
  expect(screen.getByText('✅ Выбран: @Lopata03 · Алексей · ID 1688404602 · 0 SC')).toBeInTheDocument();
  expect(screen.queryByRole('searchbox')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'сменить' }));
  expect(onChange).toHaveBeenLastCalledWith('');
  expect(search()).toHaveValue('');
});

it('Enter выбирает первый вариант', () => {
  const onChange = jest.fn();
  render(<Harness onChange={onChange} />);
  fireEvent.change(search(), { target: { value: 'lopa' } });
  fireEvent.keyDown(search(), { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('u1');
});

it('никого — «Никого не нашли»; больше 8 — «ещё N — уточните поиск»', () => {
  const many: PickerUser[] = Array.from({ length: 11 }, (_, i) => ({
    id: `m${i}`, telegram_id: `70000000${10 + i}`, name: null, username: null, balance: 0,
  }));
  render(<Harness users={many} />);
  fireEvent.change(search(), { target: { value: 'zzz' } });
  expect(screen.getByText('Никого не нашли')).toBeInTheDocument();
  fireEvent.change(search(), { target: { value: '7000' } });
  expect(screen.getAllByRole('button')).toHaveLength(8);
  expect(screen.getByText('ещё 3 — уточните поиск')).toBeInTheDocument();
});
