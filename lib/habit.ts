// Мотивационная привычка — награда уровня 🌿 Собиратель. Правила без обращений к базе,
// чтобы их проверяли юнит-тесты. Дизайн: docs/superpowers/specs/2026-09-25-motivational-habit.md
//
// Привычка длится 4 недели от старта. Отчёт — один за неделю и только за идущую: прошедшую
// неделю без отчёта уже не отметить. «Получилось» — +25 SC, за привычку до 100 SC
// (столько обещает панель SC: SC_MECHANICS.motivational_habit).
import { SC_MECHANICS, type LevelNeeds } from './levelUtils';

export const HABIT_WEEKS = 4;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const HABIT_WEEK_SC = SC_MECHANICS.motivational_habit.amount;
export const HABIT_NAME_MAX = 80;
export const HABIT_NOTE_MAX = 500;

export type HabitReport = { week_number: number; is_completed: boolean; sc_earned?: number | null };

// done — «получилось»; missed — «не получилось»; skipped — неделя прошла без отчёта;
// current — идёт сейчас, отчёта нет; upcoming — ещё впереди
export type WeekState = 'done' | 'missed' | 'skipped' | 'current' | 'upcoming';

export type HabitStatus = {
  week: number; // идущая неделя 1..4 (у законченной — 4)
  finished: boolean; // 4 недели прошли или сдан отчёт за 4-ю
  weeks: WeekState[]; // недели 1..4
  doneWeeks: number;
  scEarned: number;
  canReport: boolean; // за идущую неделю отчёта ещё нет
  nextReportAt: string | null; // с какого момента откроется следующий отчёт, если этот уже сдан
};

// Ответ /api/motivational-habit. Типы живут здесь, а не в lib/habitServer.ts, чтобы компонент
// не тянул в браузер серверный модуль с ключом базы.
export type HabitPreset = { id: string; name: string; description: string | null; icon: string | null };
export type UserHabit = { id: string; habit_name: string; habit_type: string; description: string | null; started_at: string };
export type HabitView = {
  tableReady: boolean; // false — motivational_habits.sql ещё не выполнен в Supabase
  access: boolean;
  levelName: string;
  needs: LevelNeeds | null; // чего не хватает до Собирателя, пока доступа нет
  habit: UserHabit | null; // идущая или только что закончившаяся привычка
  status: HabitStatus | null;
  presets: HabitPreset[];
};

// Номер идущей недели от старта: 1, 2, …; больше 4 — привычка закончилась
export function habitWeek(startedAt: string, now: Date): number {
  const elapsed = now.getTime() - Date.parse(startedAt);
  return Math.max(1, Math.floor(elapsed / WEEK_MS) + 1);
}

export function habitStatus(startedAt: string, reports: HabitReport[], now: Date): HabitStatus {
  const raw = habitWeek(startedAt, now);
  const byWeek = new Map(reports.map((r) => [r.week_number, r]));
  const finished = raw > HABIT_WEEKS || byWeek.has(HABIT_WEEKS);
  const week = Math.min(raw, HABIT_WEEKS);

  const weeks: WeekState[] = Array.from({ length: HABIT_WEEKS }, (_, i) => {
    const n = i + 1;
    const report = byWeek.get(n);
    if (report) return report.is_completed ? 'done' : 'missed';
    if (finished || n < week) return 'skipped';
    return n === week ? 'current' : 'upcoming';
  });

  const reportedThisWeek = byWeek.has(week);
  return {
    week,
    finished,
    weeks,
    doneWeeks: weeks.filter((w) => w === 'done').length,
    scEarned: reports.reduce((sum, r) => sum + (r.sc_earned || 0), 0),
    canReport: !finished && !reportedThisWeek,
    nextReportAt: !finished && reportedThisWeek ? new Date(Date.parse(startedAt) + week * WEEK_MS).toISOString() : null,
  };
}

export function reportReward(isCompleted: boolean): number {
  return isCompleted ? HABIT_WEEK_SC : 0;
}

// Привычка открывается на уровне 🌿 Собиратель (2); уровень считаем по SC и заказам, как панель SC
export function hasHabitAccess(level: number): boolean {
  return level >= 2;
}

// Название своей привычки: без лишних пробелов, от 2 до HABIT_NAME_MAX символов; иначе null
export function cleanHabitName(raw: unknown): string | null {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  return name.length >= 2 && name.length <= HABIT_NAME_MAX ? name : null;
}
