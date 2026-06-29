import type { DayAchievement, Eval } from './types';
import { prevDate, isNextDay } from './dateUtil';

// F-008 / D-7 A4: today から遡り achievement≠なし の連続日数。
// 当日(today)が未記録(なし/不在)でも中断扱いにせず、前日から数える(UT-021)。
export function calcStreak(daily: DayAchievement[], today: string): number {
  const map = new Map<string, Eval>();
  for (const d of daily) map.set(d.date, d.achievement);

  let cursor = today;
  const cur = map.get(today);
  if (cur === undefined || cur === 'なし') cursor = prevDate(today);

  let count = 0;
  for (;;) {
    const a = map.get(cursor);
    if (a === undefined || a === 'なし') break;
    count++;
    cursor = prevDate(cursor);
  }
  return count;
}

// F-008: 履歴中の最長連続記録(achievement≠なし が日付連続するラン)。
export function maxStreak(daily: DayAchievement[]): number {
  const days = daily
    .filter((d) => d.achievement !== 'なし')
    .map((d) => d.date)
    .sort();

  let max = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of days) {
    run = prev !== null && isNextDay(prev, date) ? run + 1 : 1;
    if (run > max) max = run;
    prev = date;
  }
  return max;
}
