/**
 * @jest-environment node
 */
import { habitWeek, habitStatus, reportReward, hasHabitAccess, cleanHabitName, WEEK_MS, HABIT_WEEK_SC } from '../habit';

// Привычка: 4 недели от старта, один отчёт за идущую неделю, +25 SC за «получилось».
const START = '2026-09-25T10:00:00.000Z';
const at = (days: number) => new Date(Date.parse(START) + days * 24 * 60 * 60 * 1000);

describe('habitWeek', () => {
  it('считает недели от старта, граница — ровно 7 суток', () => {
    expect(habitWeek(START, at(0))).toBe(1);
    expect(habitWeek(START, new Date(Date.parse(START) + WEEK_MS - 1))).toBe(1);
    expect(habitWeek(START, new Date(Date.parse(START) + WEEK_MS))).toBe(2);
    expect(habitWeek(START, at(27.9))).toBe(4);
    expect(habitWeek(START, at(28))).toBe(5);
  });
});

describe('habitStatus', () => {
  it('новая привычка: идёт 1-я неделя, отчёт можно сдать', () => {
    const s = habitStatus(START, [], at(0));
    expect(s).toMatchObject({ week: 1, finished: false, canReport: true, nextReportAt: null, doneWeeks: 0 });
    expect(s.weeks).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('отчёт за неделю сдан — следующий откроется с началом следующей недели', () => {
    const s = habitStatus(START, [{ week_number: 1, is_completed: true, sc_earned: 25 }], at(2));
    expect(s.canReport).toBe(false);
    expect(s.nextReportAt).toBe(new Date(Date.parse(START) + WEEK_MS).toISOString());
    expect(s.weeks[0]).toBe('done');
    expect(s.scEarned).toBe(25);
  });

  it('пропущенную неделю уже не отметить', () => {
    const s = habitStatus(START, [{ week_number: 1, is_completed: true }], at(15));
    expect(s.week).toBe(3);
    expect(s.weeks).toEqual(['done', 'skipped', 'current', 'upcoming']);
    expect(s.canReport).toBe(true);
  });

  it('сданный отчёт за 4-ю неделю заканчивает привычку', () => {
    const reports = [1, 2, 3, 4].map((n) => ({ week_number: n, is_completed: n !== 3, sc_earned: n !== 3 ? 25 : 0 }));
    const s = habitStatus(START, reports, at(22));
    expect(s).toMatchObject({ finished: true, canReport: false, doneWeeks: 3, scEarned: 75 });
    expect(s.weeks).toEqual(['done', 'done', 'missed', 'done']);
  });

  it('через 4 недели привычка закончена, недели без отчёта — пропущены', () => {
    const s = habitStatus(START, [{ week_number: 2, is_completed: true }], at(30));
    expect(s).toMatchObject({ week: 4, finished: true, canReport: false, nextReportAt: null });
    expect(s.weeks).toEqual(['skipped', 'done', 'skipped', 'skipped']);
  });
});

it('«получилось» — 25 SC, «не получилось» — 0', () => {
  expect(reportReward(true)).toBe(HABIT_WEEK_SC);
  expect(HABIT_WEEK_SC).toBe(25);
  expect(reportReward(false)).toBe(0);
});

it('доступ — с уровня Собиратель', () => {
  expect(hasHabitAccess(1)).toBe(false);
  expect(hasHabitAccess(2)).toBe(true);
  expect(hasHabitAccess(5)).toBe(true);
});

it('название своей привычки чистится и проверяется по длине', () => {
  expect(cleanHabitName('  Медитация   10 минут ')).toBe('Медитация 10 минут');
  expect(cleanHabitName('я')).toBeNull();
  expect(cleanHabitName('x'.repeat(81))).toBeNull();
  expect(cleanHabitName(undefined)).toBeNull();
});
