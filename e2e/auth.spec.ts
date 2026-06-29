import { test, expect } from './helpers';

// TS-1 AT-015 / AT-016 — ユーザー認証(F-017)。実バックエンド(uvicorn)へログイン。
// post-login の自動同期は決定性のため抑止(e2e-nosync)。
test.describe('認証 (F-017)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('e2e-nosync', '1'));
  });

  test('AT-015 ログイン成功 → ホーム', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('食事・運動・体重を、ラクに続ける。')).toBeVisible();
    // 既定でシード資格情報が入力済み(me@example.com / correct-horse)
    await page.getByTestId('login-submit').click();
    await expect(page.getByText('きょうの達成')).toBeVisible();
  });

  test('AT-016 ログイン失敗 → やさしいエラー(コード非表示)', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type=password]').fill('wrong-password');
    await page.getByTestId('login-submit').click();
    await expect(page.getByText('メールアドレスまたはパスワードが正しくありません')).toBeVisible();
    await expect(page.getByText('きょうの達成')).toHaveCount(0); // ホームへは進まない
  });
});
