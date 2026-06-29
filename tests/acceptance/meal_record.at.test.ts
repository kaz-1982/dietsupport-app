import { describe, it, expect, vi } from 'vitest';
import { RecordMealUseCase, buildItemsFromHistory } from '../_stubs/application';
import { type Goal, type MealItem } from '../_stubs/domain';

// TS-1 AT-001〜004 — 食事記録(UC-02 / F-002・F-007)。
// 受け入れ基準を、記録ユースケース/ドメイン契約を通して利用者視点の結果で検証する。
// (Phase 4 では同 AT-* に対応する Playwright E2E を UI 上に重ねてよい)
const goal: Goal = { kcal: 2000, p: 120, f: 60, c: 250 };

function fakeRepo() {
  const store: any[] = [];
  return { store, upsert: vi.fn(async (e: any) => { store.push(e); return e; }), runInTx: vi.fn(async (fn: any) => fn()) };
}

describe('AT 食事記録 (UC-02)', () => {
  it('AT-001 固定メニュー1タップ→◎', async () => {
    const uc = new RecordMealUseCase(fakeRepo(), { enqueue: vi.fn() });
    const result = await uc.execute({ mealType: '昼', items: [{ kcal: 1800, p: 130, f: 50, c: 200, qty: 1 }], goal });
    expect(result.eval).toBe('◎');
  });
  it('AT-002 目標未設定→○(0の日にしない)', async () => {
    const uc = new RecordMealUseCase(fakeRepo(), { enqueue: vi.fn() });
    const result = await uc.execute({ mealType: '昼', items: [{ kcal: 1800, p: 130, f: 50, c: 200, qty: 1 }], goal: null });
    expect(result.eval).toBe('○');
  });
  it('AT-003 外食手入力→当日合計に加算(外部API不使用)', async () => {
    const uc = new RecordMealUseCase(fakeRepo(), { enqueue: vi.fn() });
    const result = await uc.execute({
      mealType: '夕', items: [],
      manualEntries: [{ name: '唐揚げ', kcal: 500, p: 25, f: 30, c: 20, qty: 1 }],
      goal,
    });
    expect(result.kcalTotal).toBe(500);
  });
  it('AT-004 履歴コピー→前回の組合せを複製', () => {
    const items: MealItem[] = buildItemsFromHistory({ previous: [{ kcal: 300, p: 20, f: 10, c: 30, qty: 1 }] });
    expect(items).toHaveLength(1);
    expect(items[0].kcal).toBe(300);
  });
});
