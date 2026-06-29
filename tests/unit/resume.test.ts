import { describe, it, expect } from 'vitest';
import { detectGap, type DayAchievement } from '../_stubs/domain';

// F-009 / D-7 A5 / D-15 §4.3.5 — 0の日検知・再開
const A = (date: string, achievement: '◎' | '○' | 'なし'): DayAchievement => ({ date, achievement });

describe('UT detectGap (F-009)', () => {
  it('UT-025 当日が最終→gap無', () => {
    expect(detectGap([A('2026-06-24', '○')], '2026-06-24')).toEqual({ gap: false });
  });
  it('UT-026 前日が最終→gap無', () => {
    expect(detectGap([A('2026-06-23', '○')], '2026-06-24')).toEqual({ gap: false });
  });
  it('UT-027 抜けあり→gap有(from)', () => {
    expect(detectGap([A('2026-06-21', '◎')], '2026-06-24')).toEqual({ gap: true, from: '2026-06-22' });
  });
  it('UT-028 履歴なし→gap無', () => {
    expect(detectGap([], '2026-06-24')).toEqual({ gap: false });
  });
});
