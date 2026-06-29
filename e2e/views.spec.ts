import { test, expect, bootHome } from './helpers';

// TS-1 AT-021 / AT-022 — 統合ダッシュボード・カレンダーの表示(F-010/011)。
test.describe('閲覧画面', () => {
  test('AT-022 カレンダー表示', async ({ page }) => {
    await bootHome(page);
    await page.getByRole('button', { name: 'カレンダー' }).click();
    await expect(page.getByText(/\d+年\s*\d+月/)).toBeVisible(); // 月見出し(カレンダー固有)
    await expect(page.getByText('最長記録')).toBeVisible();
  });

  test('AT-021 統合ダッシュボード表示', async ({ page }) => {
    await bootHome(page);
    await page.getByRole('button', { name: '推移' }).click();
    await expect(page.getByText('統合ダッシュボード')).toBeVisible();
    await expect(page.getByText('平均体重')).toBeVisible();
    await expect(page.getByText('体重の推移')).toBeVisible();
  });
});
