import { describe, it, expect, vi } from 'vitest';
import { NotificationScheduler } from '../_stubs/application';

// TS-1 AT-014 — リマインド通知(UC-10 / F-014)
describe('AT リマインド通知 (UC-10)', () => {
  it('AT-014 設定時刻に1回通知し記録導線へ', () => {
    // 実装後: 19:00 到達で onFire が1回呼ばれる(フェイクタイマーで時刻到達を再現)。
    // 現状はスタブが未実装のため schedule() で throw → Red。
    const onFire = vi.fn();
    const scheduler = new NotificationScheduler();
    scheduler.schedule({ time: '19:00', enabled: true }, onFire);
    expect(onFire).toHaveBeenCalledTimes(1);
  });
});
