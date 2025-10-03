import { getLevelInfo, LEVEL_THRESHOLDS } from './levelUtils';

describe('getLevelInfo', () => {
  it('возвращает уровень 0 и корректный прогресс для SC=0', () => {
    const res = getLevelInfo(0);
    expect(res.level).toBe(0);
    expect(res.progress).toBe(0);
    expect(res.scToNext).toBe(20);
    expect(res.nextLevel).toBe(20);
  });

  it('возвращает уровень 1 для SC=20', () => {
    const res = getLevelInfo(20);
    expect(res.level).toBe(1);
    expect(res.progress).toBe(0);
    expect(res.scToNext).toBe(30);
    expect(res.nextLevel).toBe(50);
  });

  it('корректно считает прогресс между уровнями', () => {
    const res = getLevelInfo(35); // между 20 и 50
    expect(res.level).toBe(1);
    expect(res.progress).toBeCloseTo((35-20)/(50-20));
    expect(res.scToNext).toBe(15);
    expect(res.nextLevel).toBe(50);
  });

  it('возвращает максимальный уровень для SC выше последнего порога', () => {
    const res = getLevelInfo(7000);
    expect(res.level).toBe(LEVEL_THRESHOLDS.length - 1);
    expect(res.progress).toBe(1);
    expect(res.scToNext).toBe(0);
    expect(res.nextLevel).toBeNull;
  });
}); 