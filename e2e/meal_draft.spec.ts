import { test, expect, bootHome } from './helpers';

// 追加(net-new)回帰テスト: S-002 入力中断時の下書き保持(5.G / B-8 §7)。
// AT-* の二重化ではなく、実装側で足した UX 回帰ガード(下書きが離脱→再訪で消えないこと)。
// 退避効果と復元の競合(StrictMode 二重実行で初回レンダーが空になる)で過去に下書きが
// 消えたため、リロードを挟んで明示的に確認する。
test.describe('S-002 食事の下書き保持', () => {
  test('未確定の選択は離脱→再訪で復元される', async ({ page }) => {
    await bootHome(page);

    // 食事(朝)を開いて固定メニューを1つ選ぶ(まだ保存しない)
    await page.getByTestId('pill-meal').click();
    await page.getByTestId('meal-tab-morning').click();
    await page.getByTestId('meal-menu').first().click();
    await expect(page.getByTestId('meal-save')).toBeEnabled(); // 選択あり→保存可(下書きが保存される)

    // 保存せず離脱(リロード)→ もう一度 食事(朝)を開く
    await page.reload();
    await expect(page.getByText('きょうの達成')).toBeVisible();
    await page.getByTestId('pill-meal').click();
    await page.getByTestId('meal-tab-morning').click();

    // 下書きが復元され、保存可能なまま(選択が残っている)
    await expect(page.getByTestId('meal-save')).toBeEnabled();
  });
});
