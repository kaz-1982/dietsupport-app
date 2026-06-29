import { describe, it, expect } from 'vitest';
import { resolveConflict, type SyncRecord } from '../_stubs/domain';

// F-016 / D-7 A6 / D-15 §4.3.6 — 競合解決(LWW・削除伝播・同値境界)
const R = (id: string, updatedAt: string, deleted = false): SyncRecord => ({ id, updatedAt, deleted });

describe('UT resolveConflict (F-016 LWW)', () => {
  it('UT-029 server無→local', () => {
    const local = R('x', '2026-06-24T10:00:00.000Z');
    expect(resolveConflict(local, null)).toBe(local);
  });
  it('UT-030 local新→local', () => {
    const local = R('x', '2026-06-24T11:00:00.000Z');
    const server = R('x', '2026-06-24T10:00:00.000Z');
    expect(resolveConflict(local, server)).toBe(local);
  });
  it('UT-031 server新→server', () => {
    const local = R('x', '2026-06-24T10:00:00.000Z');
    const server = R('x', '2026-06-24T11:00:00.000Z');
    expect(resolveConflict(local, server)).toBe(server);
  });
  it('UT-032 同値→local(>= 規定)', () => {
    const local = R('x', '2026-06-24T10:00:00.000Z');
    const server = R('x', '2026-06-24T10:00:00.000Z');
    expect(resolveConflict(local, server)).toBe(local);
  });
  it('UT-033 local削除が新→local(削除伝播)', () => {
    const local = R('x', '2026-06-24T11:00:00.000Z', true);
    const server = R('x', '2026-06-24T10:00:00.000Z', false);
    expect(resolveConflict(local, server)).toBe(local);
  });
  it('UT-034 server削除が新→server(削除伝播)', () => {
    const local = R('x', '2026-06-24T10:00:00.000Z', false);
    const server = R('x', '2026-06-24T11:00:00.000Z', true);
    expect(resolveConflict(local, server)).toBe(server);
  });
});
