import type { DayAchievement, GapInfo } from './types';
import { prevDate, nextDate } from './dateUtil';

// F-009 / D-7 A5: 直近記録日 last が today-1 より前なら gap(from=last+1)。
// 履歴なし(記録ゼロ)では gap を出さない(新規利用者を責めない UX / UT-028)。
export function detectGap(daily: DayAchievement[], today: string): GapInfo {
  const recorded = daily
    .filter((d) => d.achievement !== 'なし')
    .map((d) => d.date)
    .sort();
  if (recorded.length === 0) return { gap: false };

  const last = recorded[recorded.length - 1];
  if (last < prevDate(today)) return { gap: true, from: nextDate(last) };
  return { gap: false };
}
