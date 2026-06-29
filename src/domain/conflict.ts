import type { SyncRecord } from './types';

// F-016 / D-7 A6: server なし→local / local.updatedAt ≥ server.updatedAt→local / else→server。
// 同値は local 優先(>= 規定 / UT-032)。削除(deleted)も updatedAt の新しい方を採用(削除伝播)。
export function resolveConflict(local: SyncRecord, server: SyncRecord | null): SyncRecord {
  if (!server) return local;
  return local.updatedAt >= server.updatedAt ? local : server;
}
