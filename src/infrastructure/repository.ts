// IndexedDB リポジトリ。UseCase/Service が注入で受ける「repo 契約」を実装する。
// 契約(コードから判明): runInTx / upsert({kind,...}) / save(table,rows) / getAll() /
//                        findByDate / listChangedSince / apply。
import { STORES, idbGet, idbGetAll, idbPut, type StoreName } from './idb';
import { uuid } from '../app/uuid';

// upsert の kind → ストア対応(D-8 物理名のクライアント表現)。
const KIND_TO_STORE: Record<string, StoreName> = {
  weight: 'weight_record',
  meal: 'meal_record',
  workout: 'workout_record',
  dailyAchievement: 'daily_achievement',
};

// デモseedデータの端末マーカー(app/seed.ts が付与)。この deviceId が付いた行は
// 「見栄え用のローカル専用デモ」なので、同期 push でサーバー/他端末へ出さない。
// 本物のアカウントにデモが混入しないことを構造的に保証する。
export const DEMO_DEVICE_ID = 'seed';

// 端末識別子(同期メタ device_id)。ApiClient と同じ localStorage キーを共有。
function deviceId(): string {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = uuid();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

function nowIso(): string {
  return new Date().toISOString();
}

function accountId(): string | null {
  return localStorage.getItem('accountId');
}

// クライアント表現(updatedAt / deleted:boolean) ⇄ サーバー表現(updated_at / deleted:0|1) の変換。
// __table を載せ、pull→apply のルーティングを確実にする(D-13)。
function toServerRow(rec: any, table: string, acct: string): any {
  return {
    ...rec,
    __table: table,
    account_id: acct,
    // updated_at は必須(サーバーが LWW/pull で参照)。欠落時は最古扱いの既定値で必ず埋める。
    updated_at: rec.updatedAt ?? '1970-01-01T00:00:00.000Z',
    device_id: rec.deviceId ?? deviceId(),
    deleted: rec.deleted ? 1 : 0,
  };
}
function toClientRow(row: any): any {
  const out: any = {
    ...row,
    updatedAt: row.updated_at ?? row.updatedAt,
    deviceId: row.device_id ?? row.deviceId,
    deleted: row.deleted === 1 || row.deleted === true,
  };
  delete out.updated_at;
  delete out.device_id;
  delete out.__table;
  return out;
}

// レコードの一意キー(id)を業務キーから決める。
function idFor(rec: any): string {
  switch (rec.kind) {
    case 'weight':
      return `w:${rec.date}`;
    case 'meal':
      return `m:${rec.date}:${rec.mealType ?? '-'}`;
    case 'workout':
      return `x:${rec.date}:${rec.exercise ?? '-'}`;
    case 'dailyAchievement':
      return `d:${rec.date}`;
    default:
      return rec.id ?? uuid();
  }
}

function withMeta(rec: any, id: string): any {
  return {
    ...rec,
    id,
    updatedAt: nowIso(),
    deviceId: deviceId(),
    deleted: rec.deleted ?? false,
  };
}

export class IndexedDbRepository {
  // 原子トランザクション境界(D-7 A7)。各 upsert が自己完結で永続化するため、
  // ここではコールバックをそのまま実行し結果を返す(単一利用者・ローカルでは十分)。
  async runInTx<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  // kind 付きレコードの upsert。daily_achievement は date 単位で「マージ」する
  // (食事/運動/体重の各 eval が別呼び出しで積み上がるため)。
  async upsert(rec: any): Promise<void> {
    const store = KIND_TO_STORE[rec.kind];
    if (!store) throw new Error(`unknown kind: ${rec.kind}`);
    const id = idFor(rec);

    if (rec.kind === 'dailyAchievement') {
      const existing = ((await idbGet(store, id)) as any) ?? {};
      const merged: any = { ...existing };
      for (const [k, v] of Object.entries(rec)) {
        if (v !== undefined) merged[k] = v;
      }
      await idbPut(store, withMeta(merged, id));
      return;
    }
    await idbPut(store, withMeta(rec, id));
  }

  // 任意テーブルへの保存(MasterService / BackupService 用)。単体・配列の両対応。
  // 同期メタ(updatedAt/deviceId/deleted)が無ければ付与する(全業務テーブルが同期対象 / D-8)。
  async save(table: string, rows: any): Promise<void> {
    const store = table as StoreName;
    if (!STORES.includes(store)) return; // 未知テーブルは無視(バックアップ互換)
    const list = Array.isArray(rows) ? rows : [rows];
    for (const row of list) {
      const id = row?.id ?? uuid();
      await idbPut(store, {
        ...row,
        id,
        updatedAt: row?.updatedAt ?? nowIso(),
        deviceId: row?.deviceId ?? deviceId(),
        deleted: row?.deleted ?? false,
      });
    }
  }

  // 全テーブルの全行(meta/sync_queue を除く)。Dashboard/Calendar/Backup が参照。
  async getAll(): Promise<Record<string, any[]>> {
    const out: Record<string, any[]> = {};
    for (const s of STORES) {
      if (s === 'meta' || s === 'sync_queue') continue;
      out[s] = (await idbGetAll(s)).filter((r: any) => !r.deleted);
    }
    return out;
  }

  // 指定日の3本柱レコード(D-2 findByDate)。
  async findByDate(date: string): Promise<{ weight?: any; meals: any[]; workouts: any[] }> {
    const weight = await idbGet('weight_record', `w:${date}`);
    const meals = (await idbGetAll('meal_record')).filter((m: any) => m.date === date && !m.deleted);
    const workouts = (await idbGetAll('workout_record')).filter(
      (w: any) => w.date === date && !w.deleted,
    );
    return { weight, meals, workouts };
  }

  // since 以降に更新された行を、サーバー表現でテーブル別に返す(同期 push 用 / A-005)。
  // deleted も含めて送る(削除の伝播)。未ログイン時は空。
  async listChangedSince(since?: string): Promise<Record<string, any[]>> {
    const acct = accountId();
    if (!acct) return {};
    const all = await this.getAllIncludingDeleted();
    const changes: Record<string, any[]> = {};
    for (const [table, rows] of Object.entries(all)) {
      const ch = rows
        .filter((r: any) => r.deviceId !== DEMO_DEVICE_ID) // デモseedはローカル専用: サーバーへ出さない
        .filter((r: any) => !since || (r.updatedAt && r.updatedAt > since))
        .map((r) => toServerRow(r, table, acct));
      if (ch.length) changes[table] = ch;
    }
    return changes;
  }

  // 同期 pull の行を LWW でローカルへ反映(A-004)。__table でルーティング(無ければ形状推定)、
  // サーバー表現 → クライアント表現へ変換して保存。局所が新しければ保持。
  async apply(row: any): Promise<void> {
    if (!row?.id) return;
    const store = (STORES.includes(row.__table) ? row.__table : this.inferStore(row)) as StoreName | null;
    if (!store) return;
    const mapped = toClientRow(row);
    const existing = (await idbGet(store, row.id)) as any;
    if (existing?.updatedAt && mapped.updatedAt && existing.updatedAt > mapped.updatedAt) return; // LWW(局所優先)
    await idbPut(store, mapped);
  }

  // --- 内部ヘルパ ---
  private async getAllIncludingDeleted(): Promise<Record<string, any[]>> {
    const out: Record<string, any[]> = {};
    for (const s of STORES) {
      if (s === 'meta' || s === 'sync_queue') continue;
      out[s] = await idbGetAll(s);
    }
    return out;
  }

  private inferStore(row: any): StoreName | null {
    if (row?.__store && STORES.includes(row.__store)) return row.__store;
    if (row?.mealType || row?.kcalTotal != null) return 'meal_record';
    if (row?.exercise !== undefined || row?.performedAsPlanned !== undefined) return 'workout_record';
    if (row?.weight != null) return 'weight_record';
    if (row?.mealEval !== undefined || row?.allAchieved !== undefined) return 'daily_achievement';
    return null;
  }

  // meta(seed フラグ・lastSyncedAt など)
  async getMeta(key: string): Promise<any> {
    const m = (await idbGet('meta', key)) as any;
    return m?.value;
  }
  async setMeta(key: string, value: any): Promise<void> {
    await idbPut('meta', { id: key, value });
  }

  // 既存レコードへの部分マージ(編集用 refs の付与など)。なければ作成。
  async patch(store: StoreName, id: string, patch: Record<string, any>): Promise<void> {
    const existing = ((await idbGet(store, id)) as any) ?? { id };
    await idbPut(store, { ...existing, ...patch, id, updatedAt: nowIso(), deviceId: deviceId() });
  }

  // 論理削除(deleted=true)。同期で削除を伝播し、getAll からは除外される。
  async remove(store: StoreName, id: string): Promise<void> {
    const existing = (await idbGet(store, id)) as any;
    if (!existing) return;
    await idbPut(store, { ...existing, deleted: true, updatedAt: nowIso(), deviceId: deviceId() });
  }

  // kind + 業務キーから id を解決して論理削除。
  async removeByKind(kind: string, key: { date?: string; mealType?: string; exercise?: string }): Promise<void> {
    const store = KIND_TO_STORE[kind];
    if (!store) return;
    await this.remove(store, idFor({ kind, ...key }));
  }

  // 指定ストアの未削除行を一括で論理削除(tombstone)。削除件数を返す。
  // 個別削除(remove)と同じ tombstone 方式のため、同期 push で削除がサーバーへ伝播し復活しない。
  async clearStore(store: StoreName): Promise<number> {
    const rows = (await idbGetAll(store)) as any[];
    let n = 0;
    for (const r of rows) {
      if (r.deleted) continue;
      await idbPut(store, { ...r, deleted: true, updatedAt: nowIso(), deviceId: deviceId() });
      n++;
    }
    return n;
  }
}

export const repository = new IndexedDbRepository();
