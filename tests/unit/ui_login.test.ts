import { describe, it, expect, vi } from 'vitest';
import { LoginFormController, AuthError } from '../_stubs/application';

// F-017 / B-8 S-009 / D-15 §4.3.10 — ログインコントローラ(バリデーション・やさしいエラー)
describe('UT S-009 ログイン コントローラ', () => {
  it('UT-049 メール形式不正→VAL-004 文言・API 未送信', () => {
    const auth = { login: vi.fn() };
    const c = new LoginFormController(auth);
    const r = c.validateEmail('abc'); // @ なし
    expect(r.ok).toBe(false);
    expect(r.message).toContain('メールアドレスの形式'); // VAL-004
    expect(auth.login).not.toHaveBeenCalled();
  });
  it('UT-050 認証失敗→AUT-001 やさしい文言(コード非表示)', async () => {
    const auth = { login: vi.fn(async () => { throw new AuthError(); }) };
    const c = new LoginFormController(auth);
    const r = await c.submitLogin('me@example.com', 'bad');
    expect(r.ok).toBe(false);
    expect(r.message).toBe('メールアドレスまたはパスワードが正しくありません'); // AUT-001
    expect(r.message).not.toMatch(/AUT-\d/); // コードは表示しない
  });
});
