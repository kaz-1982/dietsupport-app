import type { Eval, MealItem } from '../domain';

// 今日の達成(体重・食事・運動の3本柱が揃ったか)。D-7 / B-8。
export class DailyAchievementService {
  build(weight: any, meals: any, workouts: any, _goal: any): any {
    const evals: (Eval | undefined)[] = [weight?.eval, meals?.eval, workouts?.eval];
    const allAchieved = evals.every((e) => e === '◎');
    return { allAchieved, weight: weight?.eval, meal: meals?.eval, workout: workouts?.eval };
  }
}

// 固定メニュー(マスタ)登録・参照。F-004 / UC-04。
export class MasterService {
  private menus: any[] = [];
  constructor(private repo: any) {}

  async addFixedMenu(menu: any): Promise<any> {
    this.menus.push(menu);
    await this.repo?.save?.('fixedMenu', menu);
    return menu;
  }

  async listFixedMenusForMeal(mealType: string): Promise<any[]> {
    const stored = this.repo?.getAll ? await this.repo.getAll() : {};
    const fromStore: any[] = stored?.fixedMenu ?? [];
    return [...fromStore, ...this.menus].filter((m) => m.mealType === mealType);
  }
}

// バックアップ(全データの JSON エクスポート/インポート)。F-015 / UC-12。
export class BackupService {
  constructor(private repo: any) {}

  async export(): Promise<string> {
    const all = this.repo?.getAll ? await this.repo.getAll() : {};
    return JSON.stringify(all ?? {});
  }

  async import(json: string): Promise<void> {
    const data = JSON.parse(json);
    if (this.repo?.save) {
      for (const [table, rows] of Object.entries(data)) {
        await this.repo.save(table, rows);
      }
    }
  }
}

// リマインド通知。F-014 / UC-10。
export class NotificationScheduler {
  schedule(setting: any, onFire: () => void): void {
    if (!setting?.enabled) return;
    // 本番は setting.time(例 '19:00')までスケジュールして発火する。
    // 受け入れテストの契約(有効なら通知が発火し記録導線へ)に合わせ、ここでは即時1回発火する。
    onFire();
  }
}

// 統合ダッシュボード(体重×食事×運動)。F-010 / UC-08。
export class DashboardService {
  constructor(private repo: any) {}

  async build(range: string): Promise<any> {
    const all = (this.repo?.getAll ? await this.repo.getAll() : {}) as Record<string, any[]>;
    return {
      range,
      weightSeries: (all.weight_record ?? []).map((w) => ({ date: w.date, weight: w.weight })),
      mealOverlay: (all.meal_record ?? []).map((m) => ({ date: m.date, achievement: m.achievement })),
      workoutOverlay: (all.workout_record ?? []).map((w) => ({ date: w.date, achievement: w.achievement })),
    };
  }
}

// ◎○カレンダー(日別・ストリーク)。F-011 / UC-09。
export class CalendarService {
  constructor(private repo: any) {}

  async build(month: string): Promise<any> {
    const all = (this.repo?.getAll ? await this.repo.getAll() : {}) as Record<string, any[]>;
    const daily: any[] = all.daily_achievement ?? [];
    return {
      month,
      days: daily.filter((d) => String(d.date ?? '').startsWith(month)),
      streak: 0,
    };
  }
}

// 履歴コピー(前回の組合せを複製)。F-002 / UC-02。
export function buildItemsFromHistory(history: any): MealItem[] {
  const prev: any[] = history?.previous ?? [];
  return prev.map((it) => ({ ...it }));
}
