/** @jest-environment node */
import { MONTH_GOAL, monthKey, monthStart, computeMonthGoal } from '../monthGoal';

describe('monthKey', () => {
  it('форматирует месяц с ведущим нулём', () => {
    expect(monthKey(new Date(2026, 7, 16))).toBe('2026-08');
    expect(monthKey(new Date(2026, 11, 31))).toBe('2026-12');
  });
});

describe('monthStart', () => {
  it('возвращает первое число месяца в полночь', () => {
    const start = monthStart(new Date(2026, 7, 16, 13, 45));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });
});

describe('computeMonthGoal', () => {
  it('три отчёта — цель не выполнена', () => {
    expect(computeMonthGoal(3, false)).toEqual({
      reportsDone: 3, reportsTarget: 4, bonus: 50, bonusPaid: false, completed: false,
    });
  });

  it('четыре отчёта — цель выполнена', () => {
    expect(computeMonthGoal(4, false).completed).toBe(true);
  });

  it('пять отчётов — по-прежнему выполнена, цель не растёт', () => {
    const goal = computeMonthGoal(5, true);
    expect(goal.completed).toBe(true);
    expect(goal.reportsTarget).toBe(MONTH_GOAL.reportsTarget);
  });

  it('уже оплаченный бонус помечен', () => {
    expect(computeMonthGoal(4, true).bonusPaid).toBe(true);
  });
});
