import { test, expect, bootHome } from './helpers';

// TS-1 AT-001 / AT-005 / AT-007 — 記録(F-001/002/003)を UI で二重化。
// token注入 + e2e-nosync で、ローカル(IndexedDB)挙動を決定的に検証。
test.describe('記録 → ホーム反映', () => {
  test('AT-001 食事を1タップ記録 → ◎○ がホームに反映', async ({ page }) => {
    await bootHome(page);
    await page.getByTestId('pill-meal').click();
    await page.getByTestId('meal-tab-morning').click();
    await page.getByTestId('meal-menu').first().click(); // 先頭の固定メニューを選択
    await page.getByTestId('meal-save').click();
    // ホームへ戻り、食事スタンプが記録済みに変わる(達成サマリに集約)
    await expect(page.getByText('きょうの達成')).toBeVisible();
    await expect(page.getByTestId('pill-meal')).toContainText(/kcal|記録あり/);
  });

  test('AT-005 体重を記録 → ◎、同日は上書き', async ({ page }) => {
    await bootHome(page);
    await page.getByTestId('pill-weight').click();
    await page.getByTestId('weight-save').click(); // 既定値(直近69.2)で記録
    await expect(page.getByTestId('pill-weight')).toContainText('kg');
    // もう一度開いて +0.1 して更新(同一IDで上書き)
    await page.getByTestId('pill-weight').click();
    await page.getByRole('button', { name: '＋' }).click();
    await page.getByTestId('weight-save').click();
    await expect(page.getByTestId('pill-weight')).toContainText('69.3 kg'); // 上書き後の値
  });

  test('AT-007 筋トレ「休む」→ ○(0の日にしない)', async ({ page }) => {
    await bootHome(page);
    await page.getByTestId('pill-workout').click();
    await page.getByRole('button', { name: /今日は休む/ }).click();
    await expect(page.getByText('きょうの達成')).toBeVisible();
    // 運動スタンプが「おやすみ」(○)に変わる
    await expect(page.getByTestId('pill-workout')).toContainText('おやすみ');
  });
});
