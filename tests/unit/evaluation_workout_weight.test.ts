import { describe, it, expect } from 'vitest';
import { evaluateWorkout, evaluateWeight } from '../_stubs/domain';

// F-007 / D-7 A2 / D-15 §4.3.2 — 運動・体重 ◎○判定
describe('UT evaluateWorkout / evaluateWeight (F-007)', () => {
  it('UT-009 予定日に記録なし→なし', () => {
    expect(evaluateWorkout(null, { plannedToday: true })).toBe('なし');
  });
  it('UT-010 休む→○', () => {
    expect(evaluateWorkout({ type: '休む' }, { plannedToday: true })).toBe('○');
  });
  it('UT-011 予定どおり実行→◎', () => {
    expect(evaluateWorkout({ type: '実施', performedAsPlanned: true }, { plannedToday: true })).toBe('◎');
  });
  it('UT-012 予定外/未達→○', () => {
    expect(evaluateWorkout({ type: '実施', performedAsPlanned: false }, { plannedToday: true })).toBe('○');
  });
  it('UT-013 体重 測定あり→◎', () => {
    expect(evaluateWeight({ weight: 65.5 })).toBe('◎');
  });
  it('UT-014 体重 測定なし→なし', () => {
    expect(evaluateWeight(null)).toBe('なし');
  });
});
