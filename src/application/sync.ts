import { NetworkError } from './errors';

// F-016 / D-4: 同期クライアント。push(A-005)→pull(A-004)→apply。
// オフライン/一時失敗は例外 + 再試行(キューは保持しデータ消失なし)。
// 競合はサーバーが LWW で解決し、pull で配られた最新を適用する。
export class SyncService {
  constructor(
    private repo: any,
    private api: any,
  ) {}

  private async retry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
    let lastErr: unknown = new NetworkError();
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }

  async sync(lastSyncedAt: string): Promise<any> {
    const changes = await this.repo.listChangedSince(lastSyncedAt);

    // push(一時失敗は再試行。恒久失敗=オフラインは例外を投げ、pull/apply に進まない)
    const pushRes: any = await this.retry(() => this.api.post('/api/v1/sync/push', { changes }));

    // pull(since 以降の差分)
    const pullRes: any = await this.api.get('/api/v1/sync/pull', { since: lastSyncedAt });

    // apply: サーバーが配った最新(LWW 解決済み)をローカルへ反映
    const tables = (pullRes?.tables ?? {}) as Record<string, any[]>;
    for (const rows of Object.values(tables)) {
      for (const row of rows) await this.repo.apply(row);
    }

    return {
      lastSyncedAt: pullRes?.server_time ?? lastSyncedAt,
      applied: pushRes?.applied ?? [],
      conflicts: pushRes?.conflicts ?? [],
    };
  }
}
