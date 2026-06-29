import { describe, it, expect } from 'vitest';
import { calcStreak, detectGap, evaluateMeal, type Goal, type DayAchievement } from '../_stubs/domain';
import { DailyAchievementService } from '../_stubs/application';

// TS-1 AT-008〜011 — ストリーク・再開・今日の達成・目標反映(UC-07/11/06)
const goal: Goal = { kcal: 2000, p: 120, f: 60, c: 250 };
const A = (date: string, achievement: '◎' | '○' | 'なし'): DayAchievement => ({ date, achievement });

describe('AT ストリーク・再開・達成 (UC-07/11/06)', () => {
  it('AT-008 連続記録でストリーク増加(3→4)', () => {
    // 前日まで3日連続(6/23,6/22,6/21)+ 当日(6/24)記録 → 4
    const daily = [A('2026-06-24', '○'), A('2026-06-23', '◎'), A('2026-06-22', '○'), A('2026-06-21', '◎')];
    expect(calcStreak(daily, '2026-06-24')).toBe(4);
  });
  it('AT-009 抜け検知→当日記録で復活', () => {
    const before = [A('2026-06-22', '◎'), A('2026-06-21', '○')]; // 昨日(6/23)が0の日
    expect(detectGap(before, '2026-06-24')).toEqual({ gap: true, from: '2026-06-23' });
    const after = [A('2026-06-24', '○'), ...before];
    expect(calcStreak(after, '2026-06-24')).toBeGreaterThanOrEqual(1); // 復活
  });
  it('AT-010 3つ揃いで達成(allAchieved)', () => {
    const svc = new DailyAchievementService();
    const daily = svc.build({ eval: '◎' }, { eval: '◎' }, { eval: '◎' }, goal);
    expect(daily.allAchieved).toBe(true);
  });
  it('AT-011 目標設定→判定に反映(目標内→◎)', () => {
    expect(evaluateMeal([{ kcal: 1800, p: 130, f: 50, c: 200, qty: 1 }], goal)).toBe('◎');
  });
});
