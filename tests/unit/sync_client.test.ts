import { describe, it, expect, vi } from 'vitest';
import { SyncService, NetworkError } from '../_stubs/application';

// F-016 / D-4 / D-15 §4.3.8 — 同期クライアント(正常 / オフライン / 競合 / 再試行)
describe('UT sync クライアント (F-016)', () => {
  it('UT-038 正常: push→pull→apply, lastSyncedAt 更新', async () => {
    const repo = { listChangedSince: vi.fn(async () => [{ id: 'w1', updatedAt: '2026-06-24T10:00:00.000Z' }]), apply: vi.fn() };
    const api = {
      post: vi.fn(async () => ({ applied: ['w1'], conflicts: [], server_time: '2026-06-24T10:01:00.000Z' })),
      get: vi.fn(async () => ({ server_time: '2026-06-24T10:01:00.000Z', tables: {} })),
    };
    const svc = new SyncService(repo, api);
    const res = await svc.sync('2026-06-24T09:00:00.000Z');
    expect(api.post).toHaveBeenCalled();  // push(A-005)
    expect(api.get).toHaveBeenCalled();   // pull(A-004)
    expect(res.lastSyncedAt).toBe('2026-06-24T10:01:00.000Z');
  });

  it('UT-039 異常: オフライン→キュー保持・例外、データ消失なし', async () => {
    const repo = { listChangedSince: vi.fn(async () => [{ id: 'w1', updatedAt: '2026-06-24T10:00:00.000Z' }]), apply: vi.fn() };
    const api = { post: vi.fn(async () => { throw new NetworkError(); }), get: vi.fn() };
    const svc = new SyncService(repo, api);
    await expect(svc.sync('2026-06-24T09:00:00.000Z')).rejects.toBeInstanceOf(NetworkError);
    expect(repo.apply).not.toHaveBeenCalled();
  });

  it('UT-040 異常: 競合→LWW で server(新しい方)を適用', async () => {
    const local = { id: 'w1', updatedAt: '2026-06-24T09:00:00.000Z' };
    const server = { id: 'w1', updatedAt: '2026-06-24T10:00:00.000Z' };
    const repo = { listChangedSince: vi.fn(async () => [local]), apply: vi.fn() };
    const api = {
      post: vi.fn(async () => ({ applied: [], conflicts: [{ id: 'w1', resolution: 'server_wins' }], server_time: 't' })),
      get: vi.fn(async () => ({ server_time: 't', tables: { weight_record: [server] } })),
    };
    const svc = new SyncService(repo, api);
    await svc.sync('2026-06-24T08:00:00.000Z');
    expect(repo.apply).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1', updatedAt: '2026-06-24T10:00:00.000Z' }));
  });

  it('UT-041 異常: 一時失敗→再試行で回復', async () => {
    let calls = 0;
    const repo = { listChangedSince: vi.fn(async () => [{ id: 'w1', updatedAt: '2026-06-24T10:00:00.000Z' }]), apply: vi.fn() };
    const api = {
      post: vi.fn(async () => { calls++; if (calls === 1) throw new NetworkError(); return { applied: ['w1'], conflicts: [], server_time: 't' }; }),
      get: vi.fn(async () => ({ server_time: 't', tables: {} })),
    };
    const svc = new SyncService(repo, api);
    const res = await svc.sync('2026-06-24T09:00:00.000Z');
    expect(res.applied).toContain('w1');
    expect(api.post).toHaveBeenCalledTimes(2);  // 再試行で2回
  });
});
