import { describe, it, expect, vi } from 'vitest';
import { RecordMealUseCase, ValidationError, PersistenceError } from '../_stubs/application';
import { type Goal } from '../_stubs/domain';

// F-002/007 / D-7 A7 / D-15 §4.3.7 — 記録確定(原子Tx + 同期キュー)
const goal: Goal = { kcal: 2000, p: 120, f: 60, c: 250 };

describe('UT execute 記録確定 (F-002/007)', () => {
  it('UT-035 正常: 原子Txで保存・評価・日次達成、同期キュー登録、eval を返す', async () => {
    const repo = { upsert: vi.fn(async (e: any) => e), runInTx: vi.fn(async (fn: any) => fn()) };
    const syncQueue = { enqueue: vi.fn() };
    const uc = new RecordMealUseCase(repo, syncQueue);
    const result = await uc.execute({ mealType: '昼', items: [{ kcal: 1800, p: 130, f: 50, c: 200, qty: 1 }], goal });
    expect(result.eval).toBe('◎');
    expect(repo.upsert).toHaveBeenCalled();          // meal+items / dailyAchievement の upsert
    expect(syncQueue.enqueue).toHaveBeenCalled();     // 同期キュー登録
  });

  it('UT-036 異常: 永続化失敗→ロールバック・入力保持・PersistenceError', async () => {
    const repo = { upsert: vi.fn(async () => { throw new PersistenceError(); }), runInTx: vi.fn(async (fn: any) => fn()) };
    const syncQueue = { enqueue: vi.fn() };
    const uc = new RecordMealUseCase(repo, syncQueue);
    const input = { mealType: '昼', items: [{ kcal: 1800, p: 130, f: 50, c: 200, qty: 1 }], goal };
    await expect(uc.execute(input)).rejects.toBeInstanceOf(PersistenceError);
    expect(syncQueue.enqueue).not.toHaveBeenCalled(); // ロールバック: 同期キューに積まれない
    expect(input.items).toHaveLength(1);              // 入力は保持(消えない)
  });

  it('UT-037 異常: 入力不正→ValidationError, 保存しない', async () => {
    const repo = { upsert: vi.fn(), runInTx: vi.fn(async (fn: any) => fn()) };
    const uc = new RecordMealUseCase(repo, { enqueue: vi.fn() });
    await expect(uc.execute({ mealType: '昼', items: [{ kcal: -1, p: 0, f: 0, c: 0, qty: 1 }], goal }))
      .rejects.toBeInstanceOf(ValidationError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});
