import { describe, it, expect } from 'vitest';
import { calcStreak, maxStreak, type DayAchievement } from '../_stubs/domain';

// F-008 / D-7 A4 / D-15 §4.3.4 — ストリーク(状態遷移: 継続→中断→当日未記録→復活)
const A = (date: string, achievement: '◎' | '○' | 'なし'): DayAchievement => ({ date, achievement });

describe('UT calcStreak / maxStreak (F-008)', () => {
  it('UT-019 連続5日→5', () => {
    const daily = [A('2026-06-24', '○'), A('2026-06-23', '◎'), A('2026-06-22', '○'), A('2026-06-21', '◎'), A('2026-06-20', '○')];
    expect(calcStreak(daily, '2026-06-24')).toBe(5);
  });
  it('UT-020 中断あり→2', () => {
    const daily = [A('2026-06-24', '◎'), A('2026-06-23', '○'), A('2026-06-22', 'なし')];
    expect(calcStreak(daily, '2026-06-24')).toBe(2);
  });
  it('UT-021 当日未記録は中断扱いにしない→3', () => {
    // 当日(6/24)はまだ未記録だが、前日まで連続3日 → 当日の不在で中断としない
    const daily = [A('2026-06-24', 'なし'), A('2026-06-23', '◎'), A('2026-06-22', '○'), A('2026-06-21', '◎')];
    expect(calcStreak(daily, '2026-06-24')).toBe(3);
  });
  it('UT-022 中断確定→0', () => {
    const daily = [A('2026-06-24', 'なし'), A('2026-06-23', 'なし')];
    expect(calcStreak(daily, '2026-06-24')).toBe(0);
  });
  it('UT-023 履歴なし→0', () => {
    expect(calcStreak([], '2026-06-24')).toBe(0);
  });
  it('UT-024 maxStreak 最長→5', () => {
    // 直近2連続 / 抜け / 5連続 / 抜け / 3連続 → 最長は 5
    const daily = [
      A('2026-06-24', '○'), A('2026-06-23', '○'),
      A('2026-06-21', '◎'), A('2026-06-20', '○'), A('2026-06-19', '◎'), A('2026-06-18', '○'), A('2026-06-17', '◎'),
      A('2026-06-15', '○'), A('2026-06-14', '◎'), A('2026-06-13', '○'),
    ];
    expect(maxStreak(daily)).toBe(5);
  });
});
