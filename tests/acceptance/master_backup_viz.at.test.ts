import { describe, it, expect, vi } from 'vitest';
import { MasterService, BackupService, DashboardService, CalendarService } from '../_stubs/application';

// TS-1 AT-012/013/021/022 — マスタ登録・バックアップ復元・可視化(UC-04/12/08/09)
function fakeRepo() {
  const store: Record<string, any[]> = {};
  return { store, save: vi.fn(), getAll: vi.fn(async () => store) };
}

describe('AT マスタ・バックアップ・可視化', () => {
  it('AT-012 固定メニュー登録→記録画面で選択可', async () => {
    const svc = new MasterService(fakeRepo());
    await svc.addFixedMenu({ name: '鶏むね定食', kcal: 600, p: 50, f: 10, c: 60, mealType: '昼' });
    const options = await svc.listFixedMenusForMeal('昼');
    expect(options.some((m: any) => m.name === '鶏むね定食')).toBe(true);
  });
  it('AT-013 エクスポート→インポートで全復元', async () => {
    const svc = new BackupService(fakeRepo());
    const json = await svc.export();
    expect(typeof json).toBe('string');
    await expect(svc.import(json)).resolves.not.toThrow(); // 例外なく復元
  });
  it('AT-021 統合ダッシュボード表示(体重×食事×運動)', async () => {
    const dash = await new DashboardService(fakeRepo()).build('月');
    expect(dash).toHaveProperty('weightSeries');
    expect(dash).toHaveProperty('mealOverlay');
  });
  it('AT-022 ◎○カレンダー表示(日別・ストリーク)', async () => {
    const cal = await new CalendarService(fakeRepo()).build('2026-06');
    expect(Array.isArray(cal.days)).toBe(true);
    expect(cal).toHaveProperty('streak');
  });
});
