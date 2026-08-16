/** @jest-environment node */
import { surveysWithWeeks, nextFreeWeek, isBaseline, BASELINE_KIND } from '../surveyWeeks';

const baseline = { id: 'b', data: { week: 0, kind: BASELINE_KIND } };
const w1 = { id: 'w1', data: { week: 1 } };
const w2 = { id: 'w2', data: { week: 2 } };

describe('surveysWithWeeks', () => {
  it('берёт номер недели из data.week', () => {
    expect(surveysWithWeeks([w1, w2]).map(s => s.week)).toEqual([1, 2]);
  });

  it('нулевую точку отдаёт неделей 0 и не занимает ею первую неделю', () => {
    expect(surveysWithWeeks([baseline, w1]).map(s => s.week)).toEqual([0, 1]);
  });

  it('старым записям без week выдаёт первые свободные номера', () => {
    const rows = [{ id: 'a', data: null }, { id: 'b', data: null }];
    expect(surveysWithWeeks(rows).map(s => s.week)).toEqual([1, 2]);
  });

  it('разводит дублирующиеся номера недель', () => {
    const rows = [w1, { id: 'dup', data: { week: 1 } }];
    expect(surveysWithWeeks(rows).map(s => s.week)).toEqual([1, 2]);
  });

  it('пустой список не ломает', () => {
    expect(surveysWithWeeks([])).toEqual([]);
  });
});

describe('nextFreeWeek', () => {
  it('без записей — первая неделя', () => {
    expect(nextFreeWeek([])).toBe(1);
  });

  it('после одной нулевой точки всё ещё первая неделя', () => {
    expect(nextFreeWeek([baseline])).toBe(1);
  });

  it('после недель 1 и 2 — третья', () => {
    expect(nextFreeWeek([baseline, w1, w2])).toBe(3);
  });
});

describe('isBaseline', () => {
  it('отличает нулевую точку от обычного отчёта', () => {
    expect(isBaseline(baseline)).toBe(true);
    expect(isBaseline(w1)).toBe(false);
    expect(isBaseline({ id: 'x' })).toBe(false);
  });
});
