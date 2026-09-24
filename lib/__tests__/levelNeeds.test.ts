/**
 * @jest-environment node
 */
import { nextLevelNeeds, levelNeedsText, levelRequirementText, LEVEL_CONFIG } from '../levelUtils';

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

describe('levelRequirementText', () => {
  const byCode = (code: string) => LEVEL_CONFIG.find((l) => l.code === code)!;

  it('первый уровень — с первого входа, дальше SC и заказы', () => {
    expect(levelRequirementText(byCode('novice'))).toBe('с первого входа');
    expect(levelRequirementText(byCode('collector'))).toBe('100 SC · 1 заказ');
    expect(plain(levelRequirementText(byCode('legend')))).toBe('1000 SC · заказы от 20 000 ₽');
  });
});

// Скидку уровня считает app/api/order/route.ts: 5% Мастеру на заказ от 10 000 ₽, 10% Легенде — от 20 000 ₽.
// Описание в окне уровней не должно обещать больше, чем даёт корзина.
describe('описания наград', () => {
  const benefits = (code: string) => plain(LEVEL_CONFIG.find((l) => l.code === code)!.benefits.join(' '));

  it('скидки описаны так, как их считает корзина', () => {
    expect(benefits('master')).toContain('5% скидка на заказ от 10 000 ₽');
    expect(benefits('legend')).toContain('10% скидка на заказ от 20 000 ₽');
  });

  it('у Эксперта — ежемесячные розыгрыши, без чата', () => {
    expect(benefits('expert')).toContain('Ежемесячные закрытые розыгрыши');
    expect(benefits('expert')).not.toMatch(/чат/i);
  });
});
