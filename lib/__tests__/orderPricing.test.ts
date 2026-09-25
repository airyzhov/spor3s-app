/**
 * @jest-environment node
 */
import { priceOrder, levelDiscountPercent } from '../orderPricing';
import { paidOrderTotals } from '../orderStatus';

// Скидка уровня — на ЛЮБОЙ заказ (решение владельца 25.09): Мастеру 5%, Легенде 10%.
// Уровень считается по SC за всё время и сумме ОПЛАЧЕННЫХ заказов клиента до этого заказа.
// SC списываются сверху, до 30% суммы заказа.

const legend = { totalScEarned: 1000, ordersAmount: 20000, ordersCount: 3 };
const master = { totalScEarned: 600, ordersAmount: 10000, ordersCount: 2 };

describe('levelDiscountPercent', () => {
  it('скидка есть только у Мастера и Легенды', () => {
    expect(['novice', 'collector', 'expert', 'master', 'legend'].map(levelDiscountPercent)).toEqual([0, 0, 0, 5, 10]);
  });
});

describe('priceOrder', () => {
  it('Легенде — 10% на небольшой заказ', () => {
    expect(priceOrder({ total: 1500, coinsRequested: 0, scBalance: 0, ...legend })).toMatchObject({
      levelCode: 'legend', levelDiscountPercent: 10, levelDiscount: 150, scDiscount: 0, finalTotal: 1350,
    });
  });

  it('Мастеру — 5% на любой заказ, копейки отбрасываются', () => {
    expect(priceOrder({ total: 999, coinsRequested: 0, scBalance: 0, ...master })).toMatchObject({
      levelCode: 'master', levelDiscount: 49, finalTotal: 950,
    });
  });

  it('SC без заказов на нужную сумму скидку не дают', () => {
    expect(priceOrder({ total: 5000, coinsRequested: 0, scBalance: 0, totalScEarned: 1000, ordersAmount: 0, ordersCount: 0 }))
      .toMatchObject({ levelCode: 'novice', levelDiscount: 0, finalTotal: 5000 });
    expect(priceOrder({ total: 5000, coinsRequested: 0, scBalance: 0, totalScEarned: 1000, ordersAmount: 19999, ordersCount: 2 }))
      .toMatchObject({ levelCode: 'master', levelDiscountPercent: 5 });
  });

  it('SC — до 30% суммы и не больше баланса, поверх скидки уровня', () => {
    expect(priceOrder({ total: 2000, coinsRequested: 900, scBalance: 1000, ...legend })).toMatchObject({
      levelDiscount: 200, scDiscount: 600, finalTotal: 1200,
    });
    expect(priceOrder({ total: 2000, coinsRequested: 900, scBalance: 150, ...legend }).scDiscount).toBe(150);
  });

  it('отрицательные и дробные SC не проходят', () => {
    expect(priceOrder({ total: 1000, coinsRequested: -50, scBalance: 500, ...master }).scDiscount).toBe(0);
    expect(priceOrder({ total: 1000, coinsRequested: 10.7, scBalance: 500, ...master }).scDiscount).toBe(10);
  });
});

describe('paidOrderTotals', () => {
  it('считает только оплаченные, отправленные и выполненные заказы', () => {
    const orders = [
      { status: 'pending', total: 20000 },
      { status: 'paid', total: 3000 },
      { status: 'shipped', total: 2500 },
      { status: 'completed', total: 1000 },
      { status: 'cancelled', total: 9000 },
      { status: null, total: 700 },
    ];
    expect(paidOrderTotals(orders)).toEqual({ amount: 6500, count: 3 });
  });
});
