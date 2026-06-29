import { describe, it, expect } from 'vitest';
import { MealFormController } from '../_stubs/application';

// F-002/F-007 / B-8 S-002 / D-15 §4.3.10 — 食事記録コントローラ(主要分岐)
describe('UT S-002 食事記録 コントローラ', () => {
  it('UT-047 目標未設定→事前判定 ○ 表示', () => {
    const c = new MealFormController();
    const ev = c.previewEval([{ kcal: 1800, p: 130, f: 50, c: 200, qty: 1 }], null);
    expect(ev).toBe('○');
  });
  it('UT-048 カロリー負値→VAL-002 文言・記録不可', () => {
    const c = new MealFormController();
    const r = c.validateManualEntry({ name: '唐揚げ', kcal: -1, p: 0, f: 0, c: 0 });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('0 以上'); // VAL-002「カロリー・PFC は 0 以上で入力してください」
  });
});
