/**
 * @jest-environment node
 */
import { isPaidStatus } from '../orderStatus';

// Когда заказ становится оплаченным, админка начисляет SC за покупку и рефералку.
// Заказ часто переводят из «ожидает» сразу в «отправлен» или «выполнен», минуя «оплачен», —
// из-за этого 6 из 7 оплаченных заказов остались без SC. Начислять нужно на любом из трёх.
describe('isPaidStatus', () => {
  it.each(['paid', 'shipped', 'completed'])('«%s» — заказ оплачен, SC начисляем', (status) => {
    expect(isPaidStatus(status)).toBe(true);
  });

  it.each(['pending', 'cancelled', '', undefined, null])('«%s» — не оплачен, SC не начисляем', (status) => {
    expect(isPaidStatus(status)).toBe(false);
  });
});
