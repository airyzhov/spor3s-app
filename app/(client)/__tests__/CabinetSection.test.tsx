/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CabinetSection from '../CabinetSection';

// Разделы кабинета изначально свёрнуты и раскрываются по нажатию (просьба владельца 25.09).

beforeEach(() => localStorage.clear());

const renderSection = (props: Partial<React.ComponentProps<typeof CabinetSection>> = {}) =>
  render(
    <CabinetSection title="📦 Мои заказы" summary="2 заказа" storageKey="spor3s_test_section" {...props}>
      <div>содержимое</div>
    </CabinetSection>,
  );

it('изначально свёрнут: виден заголовок с краткой сводкой, содержимого нет', () => {
  renderSection();
  expect(screen.getByRole('button', { name: /Мои заказы.*2 заказа/ })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('содержимое')).toBeNull();
});

it('раскрывается и сворачивается по нажатию и помнит выбор', () => {
  const { unmount } = renderSection();
  fireEvent.click(screen.getByRole('button', { name: /Мои заказы/ }));
  expect(screen.getByText('содержимое')).toBeInTheDocument();
  unmount();
  renderSection();
  expect(screen.getByText('содержимое')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Мои заказы/ }));
  expect(screen.queryByText('содержимое')).toBeNull();
});

it('открывается сам, если пришли по кнопке (forceOpen)', () => {
  renderSection({ forceOpen: true });
  expect(screen.getByText('содержимое')).toBeInTheDocument();
});
