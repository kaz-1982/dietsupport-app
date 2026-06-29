import { aggregate, evaluateMeal, evaluateWeight, evaluateWorkout } from '../domain';
import type { MealItem } from '../domain';
import { ValidationError } from './errors';

// VAL-002: カロリー・PFC は 0 以上で入力してください。
function validateItems(items: MealItem[]): void {
  for (const it of items) {
    if (it.kcal < 0 || it.p < 0 || it.f < 0 || it.c < 0) {
      throw new ValidationError('カロリー・PFC は 0 以上で入力してください');
    }
  }
}

// D-7 A7: 検証 → 原子Tx{ upsert(meal+items) → evaluate → update(dailyAchievement) } → 同期キュー登録。
// 失敗時はロールバック(同期キューに積まない)・入力は保持。
export class RecordMealUseCase {
  constructor(
    private repo: any,
    private syncQueue: any,
  ) {}

  async execute(input: any): Promise<any> {
    const items: MealItem[] = [...(input.items ?? []), ...(input.manualEntries ?? [])];
    validateItems(items); // ① 検証(失敗時は保存前に中断)

    const result = await this.repo.runInTx(async () => {
      // ② 原子Tx: 保存 → 評価 → 日次達成更新
      const total = aggregate(items);
      const ev = evaluateMeal(items, input.goal ?? null);
      await this.repo.upsert({ kind: 'meal', mealType: input.mealType, date: input.date, items, total, achievement: ev });
      await this.repo.upsert({ kind: 'dailyAchievement', date: input.date, mealEval: ev });
      return { ev, total };
    });

    // ③ 同期キュー登録(Tx 成功後のみ)
    this.syncQueue?.enqueue({ kind: 'meal', mealType: input.mealType, date: input.date });
    return { eval: result.ev, kcalTotal: result.total.kcal, total: result.total };
  }
}

export class RecordWeightUseCase {
  constructor(
    private repo: any,
    private syncQueue?: any,
  ) {}

  async execute(input: any): Promise<any> {
    if (input.weight != null && input.weight < 0) {
      throw new ValidationError('体重は 0 以上で入力してください');
    }
    const ev = evaluateWeight({ weight: input.weight });
    const doUpsert = async () =>
      this.repo.upsert({ kind: input.kind ?? 'weight', date: input.date, weight: input.weight, achievement: ev });
    if (this.repo.runInTx) await this.repo.runInTx(doUpsert);
    else await doUpsert();
    this.syncQueue?.enqueue?.({ kind: 'weight', date: input.date });
    return { eval: ev };
  }
}

export class RecordWorkoutUseCase {
  constructor(
    private repo: any,
    private syncQueue?: any,
  ) {}

  async execute(input: any): Promise<any> {
    const ev = evaluateWorkout(
      { type: input.type, performedAsPlanned: input.performedAsPlanned },
      { plannedToday: input.planned },
    );
    const doUpsert = async () =>
      this.repo.upsert({
        kind: input.kind ?? 'workout',
        date: input.date,
        exercise: input.exercise,
        type: input.type,
        performedAsPlanned: input.performedAsPlanned,
        achievement: ev,
      });
    if (this.repo.runInTx) await this.repo.runInTx(doUpsert);
    else await doUpsert();
    this.syncQueue?.enqueue?.({ kind: 'workout', date: input.date });
    return { eval: ev }; // 消費カロリーは扱わない(burnedKcal を返さない)
  }
}
