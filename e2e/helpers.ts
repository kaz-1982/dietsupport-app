import { test, expect, type Page } from '@playwright/test';

export { test, expect };

// 認証済み(token注入)+ 自動同期OFF(決定的)で ホーム から開始する共通セットアップ。
// バックエンド不要(セッション復元はトークンの有無のみで判定)。
export async function bootHome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('accountId', 'acct_me');
    localStorage.setItem('email', 'me@example.com');
    localStorage.setItem('e2e-nosync', '1');
  });
  await page.goto('/');
  await expect(page.getByText('きょうの達成')).toBeVisible();
}
