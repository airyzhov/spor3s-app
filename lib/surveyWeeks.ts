// Нумерация недель для записей таблицы surveys.
// Нулевая точка (стартовая самооценка) помечается data.kind = 'baseline' и всегда занимает неделю 0:
// без явной ветки Number(0) считается «не задано», и нулевая точка съедает первый отчёт.

export const BASELINE_KIND = 'baseline';

export type SurveyRow = {
  data?: { week?: number | string | null; kind?: string | null } | null;
  [key: string]: any;
};

export function isBaseline(row: SurveyRow): boolean {
  return row?.data?.kind === BASELINE_KIND;
}

export function surveysWithWeeks(rows: SurveyRow[]): { row: SurveyRow; week: number }[] {
  const used = new Set<number>();
  return (rows || []).map((row) => {
    if (isBaseline(row)) return { row, week: 0 };
    let week = Number(row?.data?.week);
    if (!Number.isFinite(week) || week < 1 || used.has(week)) {
      week = 1;
      while (used.has(week)) week++;
    }
    used.add(week);
    return { row, week };
  });
}

// Первая незаполненная неделя отчётов. Нулевая точка не считается — отчёты всегда начинаются с 1.
export function nextFreeWeek(rows: SurveyRow[]): number {
  const filled = new Set(surveysWithWeeks(rows).map(s => s.week));
  let week = 1;
  while (filled.has(week)) week++;
  return week;
}
