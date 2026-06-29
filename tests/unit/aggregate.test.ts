import { describe, it, expect } from 'vitest';
import { aggregate, type MealItem } from '../_stubs/domain';

// F-002 / D-7 A3 / D-15 §4.3.3 — PFC・カロリー集計
describe('UT aggregate (F-002)', () => {
  it('UT-015 0件→0', () => {
    expect(aggregate([])).toEqual({ kcal: 0, p: 0, f: 0, c: 0 });
  });
  it('UT-016 複数件合算', () => {
    const items: MealItem[] = [
      { kcal: 300, p: 20, f: 10, c: 30, qty: 1 },
      { kcal: 500, p: 30, f: 15, c: 60, qty: 1 },
    ];
    expect(aggregate(items)).toEqual({ kcal: 800, p: 50, f: 25, c: 90 });
  });
  it('UT-017 qty反映', () => {
    expect(aggregate([{ kcal: 200, p: 10, f: 5, c: 20, qty: 3 }])).toEqual({ kcal: 600, p: 30, f: 15, c: 60 });
  });
  it('UT-018 deleted除外', () => {
    const items: MealItem[] = [
      { kcal: 300, p: 20, f: 10, c: 30, qty: 1, deleted: false },
      { kcal: 999, p: 99, f: 99, c: 99, qty: 1, deleted: true },
    ];
    expect(aggregate(items)).toEqual({ kcal: 300, p: 20, f: 10, c: 30 });
  });
});
