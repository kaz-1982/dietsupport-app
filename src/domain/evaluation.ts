import type { Eval, Goal, MealItem, WorkoutRecord, WorkoutPlan, WeightRecord } from './types';
import { aggregate } from './aggregate';

// F-007 / D-7 A1: 空→なし / goal 未設定→○ / (kcal≤ ∧ P≥ ∧ F≤ ∧ C≤)→◎ / それ以外→○。
// ○ は「入力済み未達」。継続性は○で担保する(無入力のみ「なし」)。
export function evaluateMeal(items: MealItem[], goal: Goal | null): Eval {
  if (!items || items.length === 0) return 'なし';
  if (!goal) return '○';
  const t = aggregate(items);
  const within = t.kcal <= goal.kcal && t.p >= goal.p && t.f <= goal.f && t.c <= goal.c;
  return within ? '◎' : '○';
}

// F-007 / D-7 A2: 予定日に記録なし→なし / 休む→○ / 予定どおり実行→◎ / それ以外→○。
export function evaluateWorkout(record: WorkoutRecord | null, _plan?: WorkoutPlan): Eval {
  if (!record) return 'なし';
  if (record.type === '休む') return '○';
  if (record.performedAsPlanned === true) return '◎';
  return '○';
}

// F-007 / D-7 A2: 測定あり→◎ / なし→なし。
export function evaluateWeight(record: WeightRecord | null): Eval {
  return record && record.weight != null ? '◎' : 'なし';
}
