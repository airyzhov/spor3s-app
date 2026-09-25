/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import OrderForm from '../order-form';
import { CartProvider } from '../CartContext';

// Форма заказа заранее показывает скидку уровня и сумму к оплате — ту же, что посчитает корзина
// (lib/orderPricing.ts). Ответы API подменяем.

const USER_ID = '11111111-2222-4333-8444-555555555555';
const items = [{ id: 'ezh100', name: 'Ежовик 100г порошок', price: 1500, quantity: 1 }];
// Постоянная ссылка обязательна: без products форма берёт `[]` по умолчанию, новый на каждом
// рендере, и её эффект с зависимостью [products] крутится бесконечно (AppClient всегда передаёт products)
const products = [{ id: 'ezh100', name: 'Ежовик 100г порошок', price: 1500 }];

function mockApi(levelTotals: { totalEarned: number; orders: { amount: number; count: number } }, scBalance = 0) {
  (global as any).fetch = jest.fn((url: string) => {
    const body = url.includes('/api/home-summary') ? { success: true, ...levelTotals }
      : url.includes('/api/referral-stats') ? { success: true, stats: { balance: scBalance } }
      : url.includes('/api/products') ? { products: [{ id: 'ezh100', name: 'Ежовик 100г порошок', price: 1500 }] }
      : {};
    return Promise.resolve({ ok: true, json: async () => body });
  });
}

function renderForm() {
  localStorage.setItem('spor3s_cart_items', JSON.stringify(items));
  return render(
    <CartProvider>
      <OrderForm userId={USER_ID} cartItems={items} products={products} />
    </CartProvider>,
  );
}

beforeEach(() => localStorage.clear());

it('Легенде показывает скидку 10% и сумму к оплате до оформления', async () => {
  mockApi({ totalEarned: 1000, orders: { amount: 20000, count: 3 } });
  renderForm();
  expect(await screen.findByText(/🌟 Легенда: скидка 10% — −150 ₽/)).toBeInTheDocument();
  expect(screen.getByText(/К оплате: 1350 ₽/)).toBeInTheDocument();
});

it('без уровня со скидкой строки скидки нет', async () => {
  mockApi({ totalEarned: 1000, orders: { amount: 0, count: 0 } });
  renderForm();
  await waitFor(() => expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining('/api/home-summary')));
  await screen.findByText(/Ежовик 100г порошок/);
  expect(screen.queryByText(/скидка \d+%/)).toBeNull();
});

it('списание SC считает «к оплате» уже со скидкой уровня', async () => {
  mockApi({ totalEarned: 1000, orders: { amount: 20000, count: 3 } }, 1000);
  renderForm();
  // SC — до 30% суммы: 450 из 1500; скидка Легенды — 150
  fireEvent.click(await screen.findByRole('button', { name: 'Списать 450' }));
  expect(await screen.findByText('Скидка SC 450 ₽ — к оплате 900 ₽')).toBeInTheDocument();
  expect(screen.getByText(/К оплате: 900 ₽/)).toBeInTheDocument();
});
