import { describe, it, expect } from 'vitest';
import { evaluateMeal, type Goal, type MealItem } from '../_stubs/domain';

// F-007 / D-7 A1 / D-15 §4.3.1 — 食事 ◎○判定 デシジョンテーブル
// ◎ = (kcal ≤ goal.kcal) ∧ (p ≥ goal.p) ∧ (f ≤ goal.f) ∧ (c ≤ goal.c)
const goal: Goal = { kcal: 2000, p: 120, f: 60, c: 250 };
const item = (kcal: number, p: number, f: number, c: number): MealItem => ({ kcal, p, f, c, qty: 1 });

describe('UT evaluateMeal (F-007)', () => {
  it('UT-001 全クリア→◎', () => {
    expect(evaluateMeal([item(1800, 130, 50, 200)], goal)).toBe('◎');
  });
  it('UT-002 境界(各目標ちょうど)→◎', () => {
    expect(evaluateMeal([item(2000, 120, 60, 250)], goal)).toBe('◎');
  });
  it('UT-003 カロリーのみ超過→○', () => {
    expect(evaluateMeal([item(2001, 130, 50, 200)], goal)).toBe('○');
  });
  it('UT-004 Pのみ未達→○', () => {
    expect(evaluateMeal([item(1800, 119, 50, 200)], goal)).toBe('○');
  });
  it('UT-005 Fのみ超過→○', () => {
    expect(evaluateMeal([item(1800, 130, 61, 200)], goal)).toBe('○');
  });
  it('UT-006 Cのみ超過→○', () => {
    expect(evaluateMeal([item(1800, 130, 50, 251)], goal)).toBe('○');
  });
  it('UT-007 無入力→なし', () => {
    expect(evaluateMeal([], goal)).toBe('なし');
  });
  it('UT-008 目標未設定→○', () => {
    expect(evaluateMeal([item(1800, 130, 50, 200)], null)).toBe('○');
  });
});
