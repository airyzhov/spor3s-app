/**
 * @jest-environment node
 */
import { nextLevelNeeds, levelNeedsText } from '../levelUtils';

// Уровень требует и SC, и заказов (LEVEL_CONFIG). Строка «До уровня …» должна говорить,
// чего именно не хватает, — а не «−900 SC», когда SC с запасом, но заказов нет.
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('nextLevelNeeds', () => {
  it('новичку без SC и заказов до Собирателя нужно 100 SC и 1 заказ', () => {
    expect(nextLevelNeeds(0, 0, 0)).toEqual({ name: '🌿 Собиратель', sc: 100, ordersAmount: 0, ordersCount: 1 });
  });

  it('с 1000 SC, но без заказов, не хватает только заказа', () => {
    expect(nextLevelNeeds(1000, 0, 0)).toEqual({ name: '🌿 Собиратель', sc: 0, ordersAmount: 0, ordersCount: 1 });
  });

  it('Собирателю до Эксперта не хватает SC и суммы заказов', () => {
    expect(nextLevelNeeds(150, 1200, 1)).toEqual({ name: '🌳 Эксперт', sc: 150, ordersAmount: 3800, ordersCount: 0 });
  });

  it('на максимальном уровне — null', () => {
    expect(nextLevelNeeds(1000, 20000, 3)).toBeNull();
  });
});

describe('levelNeedsText', () => {
  it('перечисляет только то, чего не хватает', () => {
    expect(levelNeedsText({ name: '', sc: 0, ordersAmount: 0, ordersCount: 1 })).toBe('1 заказ');
    expect(levelNeedsText({ name: '', sc: 60, ordersAmount: 0, ordersCount: 0 })).toBe('60 SC');
    expect(plain(levelNeedsText({ name: '', sc: 150, ordersAmount: 3800, ordersCount: 0 }))).toBe('150 SC и заказы на 3 800 ₽');
  });
});
