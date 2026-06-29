import { describe, it, expect, vi } from 'vitest';
import { RecordWeightUseCase, RecordWorkoutUseCase } from '../_stubs/application';

// TS-1 AT-005〜007 — 体重(UC-01)・筋トレ(UC-03)記録
function dateKeyedRepo() {
  const store: any[] = [];
  return {
    store,
    upsert: vi.fn(async (e: any) => {
      const i = store.findIndex((x: any) => x.date === e.date && x.kind === e.kind);
      if (i >= 0) store[i] = e; else store.push(e); // 同日同種は上書き
      return e;
    }),
    runInTx: vi.fn(async (fn: any) => fn()),
  };
}

describe('AT 体重・筋トレ記録 (UC-01 / UC-03)', () => {
  it('AT-005 体重記録→◎、同日再入力で上書き', async () => {
    const repo = dateKeyedRepo();
    const uc = new RecordWeightUseCase(repo);
    const r1 = await uc.execute({ kind: 'weight', date: '2026-06-24', weight: 65.5 });
    expect(r1.eval).toBe('◎');
    await uc.execute({ kind: 'weight', date: '2026-06-24', weight: 65.2 });
    const sameDay = repo.store.filter((x: any) => x.date === '2026-06-24' && x.kind === 'weight');
    expect(sameDay).toHaveLength(1);       // 上書き(1件のみ)
    expect(sameDay[0].weight).toBe(65.2);  // 最新値
  });
  it('AT-006 予定どおり実行→◎', async () => {
    const uc = new RecordWorkoutUseCase(dateKeyedRepo());
    const r = await uc.execute({ kind: 'workout', date: '2026-06-24', exercise: 'ベンチ', planned: true, performedAsPlanned: true });
    expect(r.eval).toBe('◎');
  });
  it('AT-007 休む→○(0の日回避・消費カロリーは扱わない)', async () => {
    const uc = new RecordWorkoutUseCase(dateKeyedRepo());
    const r = await uc.execute({ kind: 'workout', date: '2026-06-24', type: '休む' });
    expect(r.eval).toBe('○');
    expect(r).not.toHaveProperty('burnedKcal');
  });
});
