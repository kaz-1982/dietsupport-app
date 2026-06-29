import { mapHttpError } from './errors';

export interface Session {
  token: string;
  accountId?: string;
}

// F-017 / D-12 / D-13: 認証クライアント。HTTP ステータスをドメイン例外へ写像。
// 成功時は ApiClient にトークンを設定(以降の同期 API は Bearer 認証)。
export class AuthService {
  constructor(private api: any) {}

  async login(email: string, pw: string): Promise<Session> {
    try {
      const res = await this.api.post('/api/v1/auth/login', { email, password: pw });
      this.api.setToken?.(res.token);
      return { token: res.token, accountId: res.account_id };
    } catch (e) {
      throw mapHttpError(e);
    }
  }

  async signup(email: string, pw: string): Promise<Session> {
    try {
      const res = await this.api.post('/api/v1/auth/signup', { email, password: pw });
      this.api.setToken?.(res.token);
      return { token: res.token, accountId: res.account_id };
    } catch (e) {
      throw mapHttpError(e);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post?.('/api/v1/auth/logout', {});
    } catch {
      // ログアウトの通信失敗はローカルのトークン破棄を妨げない
    }
    this.api.setToken?.(undefined);
  }
}
