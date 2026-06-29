import { test, expect } from './helpers';

// TS-1 AT-018 — 端末間同期(F-016)。2つのブラウザコンテキスト=2端末で、
// 端末Aの記録が同期を介して端末Bに反映されることを検証(実バックエンド)。
test('AT-018 端末Aの記録が端末Bに反映される', async ({ browser }) => {
  const vp = { width: 390, height: 844 };

  // --- 端末A: ログイン → 体重 69.5kg を記録 → 同期(push) ---
  const ctxA = await browser.newContext({ viewport: vp });
  const a = await ctxA.newPage();
  await a.goto('/');
  await a.getByTestId('login-submit').click(); // シード資格情報(prefilled)
  await expect(a.getByText('きょうの達成')).toBeVisible();

  await a.getByTestId('pill-weight').click();
  for (let i = 0; i < 3; i++) await a.getByRole('button', { name: '＋' }).click(); // 69.2 → 69.5
  await a.getByTestId('weight-save').click();
  await expect(a.getByTestId('pill-weight')).toContainText('kg');

  await a.getByTestId('sync-badge').click(); // 明示 push
  await expect(a.getByTestId('sync-badge')).toContainText('同期済', { timeout: 15_000 });
  // Aの今日の体重表示値を取得(環境のシード差に依存しない収束検証のため)
  const aKg = (await a.getByTestId('pill-weight').innerText()).match(/([\d.]+)\s*kg/)?.[1];
  expect(aKg).toBeTruthy();

  // --- 端末B: 別コンテキストでログイン → 同期(pull) → Aの記録が出る ---
  const ctxB = await browser.newContext({ viewport: vp });
  const b = await ctxB.newPage();
  await b.goto('/');
  await b.getByTestId('login-submit').click();
  await expect(b.getByText('きょうの達成')).toBeVisible();

  await b.getByTestId('sync-badge').click(); // 明示 pull
  await expect(b.getByTestId('sync-badge')).toContainText('同期済', { timeout: 15_000 });

  // 端末B(自身は今日未記録のシードのみ)に、Aで記録した体重が同期で反映され一致(収束)する
  await expect(b.getByTestId('pill-weight')).toContainText(`${aKg} kg`, { timeout: 15_000 });

  await ctxA.close();
  await ctxB.close();
});
