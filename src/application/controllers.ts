import { evaluateMeal } from '../domain';
import type { Eval, MealItem, Goal } from '../domain';
import { AuthError, RateLimitError } from './errors';

// 食事記録コントローラ(S-002)。DOM 非依存で単体化(React から委譲)。
export class MealFormController {
  // 入力中の事前評価(◎○なし)を表示する。
  previewEval(items: MealItem[], goal: Goal | null): Eval {
    return evaluateMeal(items, goal);
  }

  // 手入力の検証。VAL-002: カロリー・PFC は 0 以上。
  validateManualEntry(entry: any): { ok: boolean; message?: string } {
    if (entry.kcal < 0 || entry.p < 0 || entry.f < 0 || entry.c < 0) {
      return { ok: false, message: 'カロリー・PFC は 0 以上で入力してください' };
    }
    return { ok: true };
  }
}

// ログインコントローラ(S-009)。バリデーション + やさしいエラー(コード非表示)。
export class LoginFormController {
  constructor(private auth?: any) {}

  // VAL-004: メールアドレスの形式が正しくありません。
  validateEmail(email: string): { ok: boolean; message?: string } {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) return { ok: false, message: 'メールアドレスの形式が正しくありません' };
    return { ok: true };
  }

  async submitLogin(email: string, pw: string): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.auth.login(email, pw);
      return { ok: true };
    } catch (e) {
      // 画面にはコードを出さず、非難しないやさしい文言にする(D-14)。
      if (e instanceof AuthError) {
        return { ok: false, message: 'メールアドレスまたはパスワードが正しくありません' }; // AUT-001
      }
      if (e instanceof RateLimitError) {
        return { ok: false, message: '試行回数が多いため、しばらくしてからお試しください' }; // AUT-002
      }
      return { ok: false, message: '通信エラーが発生しました。時間をおいて再度お試しください' }; // SYN/SYS
    }
  }
}
