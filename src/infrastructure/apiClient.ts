// ApiClient: AuthService / SyncService が依存する HTTP 境界(D-13)。
// dev は vite proxy 経由で /api/* を FastAPI(:8000)へ送る。
// HTTP エラーは { status } 付き Error として投げ、上位(AuthService.mapHttpError)が
// ドメイン例外へ写像する。
import { uuid } from '../app/uuid';

export class ApiClient {
  private token?: string;

  constructor(private baseUrl: string = '') {}

  setToken(token?: string): void {
    this.token = token;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    h['X-Device-Id'] = getDeviceId();
    return h;
  }

  async post(path: string, body: unknown): Promise<any> {
    const res = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw httpError(res.status);
    return res.status === 204 ? null : res.json();
  }

  async get(path: string, params?: Record<string, unknown>): Promise<any> {
    let url = this.baseUrl + path;
    if (params) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) sp.set(k, String(v));
      }
      const qs = sp.toString();
      if (qs) url += '?' + qs;
    }
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw httpError(res.status);
    return res.json();
  }
}

function httpError(status: number): Error {
  const err = new Error(`HTTP ${status}`) as Error & { status: number };
  err.status = status;
  return err;
}

// 端末識別子(同期の device_id)。ブラウザの localStorage に永続化。
function getDeviceId(): string {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = uuid();
    localStorage.setItem('deviceId', id);
  }
  return id;
}
