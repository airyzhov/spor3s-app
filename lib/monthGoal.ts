// Цель месяца: 4 еженедельных отчёта за календарный месяц → разовый бонус.
// Только правила, без обращений к БД — серверная часть в lib/monthGoalServer.ts.

export const MONTH_GOAL = {
  reportsTarget: 4,
  bonus: 50,
} as const;

export type MonthGoal = {
  reportsDone: number;
  reportsTarget: number;
  bonus: number;
  bonusPaid: boolean;
  completed: boolean;
};

// Ключ месяца для идемпотентности начисления: source_id транзакции.
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function computeMonthGoal(reportsDone: number, bonusPaid: boolean): MonthGoal {
  return {
    reportsDone,
    reportsTarget: MONTH_GOAL.reportsTarget,
    bonus: MONTH_GOAL.bonus,
    bonusPaid,
    completed: reportsDone >= MONTH_GOAL.reportsTarget,
  };
}
