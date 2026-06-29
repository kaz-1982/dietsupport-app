// S-009 ログイン/サインアップ(F-017)。モックなしのため最小デザイン(アプリ世界観に合わせる)。
import { useState, type FormEvent, type CSSProperties } from 'react';
import { useApp } from '../../app/store';
import { LoginFormController, RateLimitError, ConflictError } from '../../application';
import { C, F, SH, R } from '../../theme';

const controller = new LoginFormController();

export function Login() {
  const { login, signup } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('me@example.com');
  const [pw, setPw] = useState('correct-horse');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(undefined);
    const v = controller.validateEmail(email); // VAL-004
    if (!v.ok) return setMsg(v.message);
    if (mode === 'signup') {
      if (pw.length < 8) return setMsg('パスワードは8文字以上で入力してください');
      if (pw !== pw2) return setMsg('パスワード(確認)が一致しません');
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(email, pw);
      else await signup(email, pw);
    } catch (err) {
      // 画面にコードを出さず、非難しないやさしい文言(D-14)
      if (err instanceof RateLimitError) setMsg('試行回数が多いため、しばらくしてからお試しください'); // AUT-002
      else if (err instanceof ConflictError) setMsg('このメールアドレスは既に登録されています'); // AUT-004
      else if (mode === 'login') setMsg('メールアドレスまたはパスワードが正しくありません'); // AUT-001
      else setMsg('登録できませんでした。入力内容をご確認ください');
    } finally {
      setBusy(false);
    }
  };

  const field: CSSProperties = {
    padding: '13px 14px',
    border: `1.5px solid ${C.line}`,
    borderRadius: 14,
    fontSize: 15,
    background: '#fff',
    width: '100%',
    color: C.ink,
  };
  const label: CSSProperties = { fontSize: 12.5, fontWeight: 800, color: C.faint2, marginBottom: 7, display: 'block' };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 22px', maxWidth: 460, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: C.green, letterSpacing: '.01em' }}>DietSupport</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.faint2, marginTop: 6 }}>食事・運動・体重を、ラクに続ける。</div>
      </div>

      <div style={{ display: 'flex', background: C.line, borderRadius: R.pill, padding: 4, gap: 3, marginBottom: 22 }}>
        {(['login', 'signup'] as const).map((m) => {
          const on = mode === m;
          return (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setMsg(undefined);
              }}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 0',
                borderRadius: R.pill,
                fontWeight: 800,
                fontSize: 13.5,
                background: on ? '#fff' : 'transparent',
                color: on ? C.green : C.faint,
                boxShadow: on ? '0 1px 4px -1px rgba(0,0,0,.18)' : 'none',
              }}
            >
              {m === 'login' ? 'ログイン' : '新規登録'}
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={label}>メールアドレス</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={field} autoComplete="email" />
        </div>
        <div>
          <label style={label}>パスワード</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={field} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </div>
        {mode === 'signup' && (
          <div>
            <label style={label}>パスワード(確認)</label>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} style={field} autoComplete="new-password" />
          </div>
        )}

        {msg && <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 700, margin: 0 }}>{msg}</p>}

        <button
          type="submit"
          data-testid="login-submit"
          disabled={busy}
          style={{
            marginTop: 4,
            background: busy ? '#9ccdb1' : C.green,
            color: '#fff',
            fontWeight: 800,
            fontSize: 16,
            borderRadius: R.btn,
            padding: 16,
            boxShadow: busy ? 'none' : SH.btn,
          }}
        >
          {busy ? '…' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
        </button>
      </form>

      <p style={{ fontSize: 11.5, fontWeight: 600, color: C.dim, lineHeight: 1.7, marginTop: 22, textAlign: 'center' }}>
        ※ バックエンド(uvicorn)起動時のシードアカウント<br />
        <span style={{ fontFamily: F.ui, color: C.faint2 }}>me@example.com / correct-horse</span> でログインできます。
      </p>
    </div>
  );
}
