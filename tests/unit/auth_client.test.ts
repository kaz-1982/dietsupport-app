import { describe, it, expect } from 'vitest';
import { AuthService, AuthError, RateLimitError, ConflictError } from '../_stubs/application';

// F-017 / D-12 / D-15 §4.3.9 — 認証クライアント(HTTP ステータス→ドメイン例外)
function apiWith(status: number, body: any = {}) {
  return {
    token: undefined as string | undefined,
    setToken(t: string) { this.token = t; },
    async post(_path: string, _body: any) {
      if (status >= 400) { const e: any = new Error('http'); e.status = status; throw e; }
      return body;
    },
  };
}

describe('UT login / signup クライアント (F-017)', () => {
  it('UT-042 login 成功→Session・トークン設定', async () => {
    const api = apiWith(200, { token: 'tk', account_id: 'a1' });
    const svc = new AuthService(api);
    const session = await svc.login('me@example.com', 'pw');
    expect(session.token).toBe('tk');
    expect(api.token).toBe('tk');
  });
  it('UT-043 login 401→AuthError', async () => {
    const svc = new AuthService(apiWith(401));
    await expect(svc.login('me@example.com', 'bad')).rejects.toBeInstanceOf(AuthError);
  });
  it('UT-044 login 429→RateLimitError', async () => {
    const svc = new AuthService(apiWith(429));
    await expect(svc.login('me@example.com', 'bad')).rejects.toBeInstanceOf(RateLimitError);
  });
  it('UT-045 signup 409→ConflictError', async () => {
    const svc = new AuthService(apiWith(409));
    await expect(svc.signup('me@example.com', 'pw')).rejects.toBeInstanceOf(ConflictError);
  });
  it('UT-046 signup 成功→Session', async () => {
    const api = apiWith(201, { token: 'tk2', account_id: 'a1' });
    const svc = new AuthService(api);
    const session = await svc.signup('new@example.com', 'pw');
    expect(session.token).toBe('tk2');
  });
});
