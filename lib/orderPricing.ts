import { getLevelInfo, LEVEL_CONFIG } from './levelUtils';

// Цена заказа: скидка уровня и списание SC. Одна функция для корзины (app/api/order) и формы
// заказа, чтобы покупатель заранее видел ту же сумму, что потом придёт в заказе.
//
// Скидка уровня — на любой заказ (решение владельца 25.09): Мастеру 5%, Легенде 10%
// (LEVEL_CONFIG.discountPercent). Уровень — по SC за всё время и оплаченным заказам ДО этого заказа.
// SC — поверх скидки: не больше баланса и не больше 30% суммы заказа.

export const SC_MAX_SHARE = 0.3;

export function levelDiscountPercent(levelCode: string): number {
  return LEVEL_CONFIG.find((l) => l.code === levelCode)?.discountPercent ?? 0;
}

export type OrderPriceInput = {
  total: number; // сумма товаров без скидок
  coinsRequested: number; // сколько SC человек хочет списать
  scBalance: number;
  totalScEarned: number;
  ordersAmount: number; // сумма оплаченных заказов до этого
  ordersCount: number;
};

export type OrderPrice = {
  levelCode: string;
  levelName: string;
  levelDiscountPercent: number;
  levelDiscount: number;
  scDiscount: number;
  finalTotal: number;
};

export function priceOrder(input: OrderPriceInput): OrderPrice {
  const total = Math.max(0, input.total || 0);
  const level = getLevelInfo(input.totalScEarned || 0, input.ordersAmount || 0, input.ordersCount || 0);
  const percent = levelDiscountPercent(level.levelCode);
  const levelDiscount = Math.floor((total * percent) / 100);
  const scDiscount = Math.max(0, Math.min(
    Math.floor(input.coinsRequested || 0),
    Math.floor(input.scBalance || 0),
    Math.floor(total * SC_MAX_SHARE),
  ));
  return {
    levelCode: level.levelCode,
    levelName: level.levelName,
    levelDiscountPercent: percent,
    levelDiscount,
    scDiscount,
    finalTotal: Math.max(0, total - levelDiscount - scDiscount),
  };
}
