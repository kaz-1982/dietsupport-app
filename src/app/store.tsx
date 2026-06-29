// アプリの中核Store。Domain/Application を実配線し、画面へ状態と操作を供給する。
// ・永続化 = IndexedDbRepository(ローカルファースト)
// ・認証/同期 = ApiClient 経由(FastAPI)。起動時・保存時にバックグラウンド同期(F-016)
// ・派生 = ストリーク/ギャップ/今日の達成 はドメイン純粋関数で算出
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiClient } from '../infrastructure/apiClient';
import { repository } from '../infrastructure/repository';
import {
  AuthService,
  type Session,
  RecordMealUseCase,
  RecordWeightUseCase,
  RecordWorkoutUseCase,
  MasterService,
  DashboardService,
  CalendarService,
  BackupService,
  SyncService,
} from '../application';
import { calcStreak, maxStreak, detectGap } from '../domain';
import type { Eval, Goal, MealItem } from '../domain';
import { todayISO } from './date';
import { uuid } from './uuid';
import { seedIfNeeded, refreshDemoIfStale } from './seed';
import {
  scheduleAll as scheduleNotifs,
  notifPermission as getNotifPermission,
  requestNotifPermission,
  fireTest as fireTestNotification,
} from '../infrastructure/notifications';

// --- シングルトン(アプリ全体で共有) ---
const api = new ApiClient();
const auth = new AuthService(api);
const recordMeal = new RecordMealUseCase(repository, undefined);
const recordWeight = new RecordWeightUseCase(repository);
const recordWorkout = new RecordWorkoutUseCase(repository);
const master = new MasterService(repository);
const dashboard = new DashboardService(repository);
const calendar = new CalendarService(repository);
const backup = new BackupService(repository);
const sync = new SyncService(repository, api);

export type AppData = Record<string, any[]>;
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface TodayStatus {
  meal: Eval;
  workout: Eval;
  weight: Eval;
  allAchieved: boolean;
}

export interface MealRefs {
  ids: string[];
  manual: any[];
  qty: Record<string, number>;
}
export interface WorkoutEntry {
  exerciseId: string;
  w: string;
  r: string;
  s: string;
}
// 筋トレ記録の結果種別。予定どおり=◎ / 予定外でも実行=○ / 休む=○(D-7 A2 / §5.2)。
export type WorkoutResult = 'asPlanned' | 'performed' | 'rest';

export interface AppCtx {
  ready: boolean;
  session: Session | null;
  today: string;
  data: AppData;
  goal: Goal;
  weightGoal?: number;
  todayStatus: TodayStatus;
  streak: number;
  bestStreak: number;
  gap: { gap: boolean; from?: string };
  toast: string | null;
  syncStatus: SyncStatus;
  online: boolean;
  notifPermission: NotificationPermission;
  requestNotif: () => Promise<void>;
  fireTestNotif: () => void;
  // 認証
  login: (email: string, pw: string) => Promise<void>;
  signup: (email: string, pw: string) => Promise<void>;
  logout: () => Promise<void>;
  // 記録(date 省略時は今日 / 遡及入力は date 指定)
  saveMeal: (mealType: string, items: MealItem[], date?: string, refs?: MealRefs) => Promise<Eval>;
  // 「食べない」= その区分を0kcalの意図的記録にし継続に数える(F-007 補足 / UX)
  skipMeal: (mealType: string, date?: string) => Promise<void>;
  saveWeight: (weight: number, date?: string) => Promise<void>;
  // 'asPlanned'=予定どおり実行→◎ / 'performed'=予定外でも実行→○ / 'rest'=休む→○(D-7 A2)
  saveWorkout: (result: WorkoutResult, date?: string, entries?: WorkoutEntry[]) => Promise<void>;
  deleteMeal: (mealType: string, date: string) => Promise<void>;
  deleteWeight: (date: string) => Promise<void>;
  deleteWorkout: (date: string) => Promise<void>;
  // 編集プリフィル用ヘルパ
  getMealRefs: (mealType: string, date: string) => MealRefs | undefined;
  lastWorkout: (exerciseId: string) => WorkoutEntry | undefined;
  dayStatus: (date: string) => TodayStatus;
  // マスタ/設定
  addFixedMenu: (menu: any) => Promise<void>;
  addExercise: (ex: any) => Promise<void>;
  saveMaster: (table: string, row: any) => Promise<void>;
  deleteMaster: (table: string, id: string) => Promise<void>;
  setGoal: (goal: { kcal: number; p: number; f: number; c: number; weight?: number }) => Promise<void>;
  toggleNotif: (type: string) => Promise<void>;
  // データ
  exportBackup: () => Promise<string>;
  importBackup: (json: string) => Promise<void>;
  // 日々の記録(食事・運動・体重・達成スタンプ)を一括削除。マスタ・目標・通知は残す。
  clearRecords: () => Promise<number>;
  // すべての業務データ(記録＋マスタ＋目標＋通知)を一括削除し、空の状態へ初期化する。
  resetAll: () => Promise<number>;
  // 同期
  syncNow: () => Promise<void>;
  showToast: (msg: string) => void;
  services: { dashboard: DashboardService; calendar: CalendarService };
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

const FALLBACK_GOAL: Goal = { kcal: 2000, p: 120, f: 60, c: 250 };

function rollup(meals: any[], weight: any, workout: any): TodayStatus {
  // 間食(snack)はカロリー/PFC には加算するが、達成基準には含めない任意の種別。
  // ◎○判定からは除外し、朝昼夕(main)のみで食事の達成を決める。
  const main = meals.filter((m) => m.mealType !== 'snack');
  // 「食べない」(skipped)は0kcalの意図的な記録。継続(記録あり)には数えるが、
  // 実際に食べた食事の◎判定は妨げない(中立)。全枠スキップの日は記録あり=○。
  const eaten = main.filter((m) => !m.skipped);
  const meal: Eval = main.length === 0 ? 'なし' : eaten.length === 0 ? '○' : eaten.every((m) => m.achievement === '◎') ? '◎' : '○';
  const weightEval: Eval = weight ? '◎' : 'なし';
  const workoutEval: Eval = workout?.achievement ?? 'なし';
  return { meal, workout: workoutEval, weight: weightEval, allAchieved: meal === '◎' && weightEval === '◎' && workoutEval === '◎' };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<AppData>({});
  const [toast, setToast] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [online, setOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => getNotifPermission());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = useMemo(() => todayISO(), []);

  const refresh = useCallback(async () => {
    setData(await repository.getAll());
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  // 指定日の達成を集計し daily_achievement(E-011)を更新
  const recompute = useCallback(async (date: string) => {
    const { weight, meals, workouts } = await repository.findByDate(date);
    const s = rollup(meals, weight, workouts[0]);
    const recorded = s.meal !== 'なし' || s.weight !== 'なし' || s.workout !== 'なし';
    const pillars = [s.meal, s.weight, s.workout].filter((e) => e !== 'なし');
    const achievement: Eval = !recorded ? 'なし' : pillars.every((e) => e === '◎') ? '◎' : '○';
    await repository.upsert({
      kind: 'dailyAchievement',
      date,
      mealEval: s.meal,
      weightEval: s.weight,
      workoutEval: s.workout,
      achievement,
      allAchieved: s.allAchieved,
    });
  }, []);

  // --- 同期(F-016 / D-13 A-004/005) ---
  const syncNow = useCallback(async () => {
    if (localStorage.getItem('e2e-nosync')) return; // E2E: 決定的にするため自動同期を抑止
    if (!localStorage.getItem('token')) return; // 未ログインは何もしない
    setSyncStatus('syncing');
    try {
      const last = (await repository.getMeta('lastSyncedAt')) ?? '';
      const res = await sync.sync(last);
      if (res?.lastSyncedAt) await repository.setMeta('lastSyncedAt', res.lastSyncedAt);
      await recompute(today); // pull で取り込んだ当日レコードを集計へ反映(ストリーク等)
      await refresh();
      setSyncStatus('synced');
    } catch {
      // オフライン/失敗: ローカルは保持され、オンライン復帰時に再送(R-NF-018)
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
    }
  }, [refresh, recompute, today]);

  // 保存のたびにデバウンスしてバックグラウンド同期(UIはブロックしない / R-NF-015)
  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void syncNow(), 1200);
  }, [syncNow]);

  // 起動: seed → データ読込 → セッション復元
  useEffect(() => {
    (async () => {
      await seedIfNeeded();
      await refreshDemoIfStale(); // デモ日付が古ければ today 基準へ再生成(純デモのみ)
      await refresh();
      const token = localStorage.getItem('token');
      if (token) {
        api.setToken(token);
        setSession({ token, accountId: localStorage.getItem('accountId') ?? undefined });
      }
      setReady(true);
    })();
  }, [refresh]);

  // オフライン検知 + オンライン復帰で自動再送
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const goOffline = () => {
      setOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [syncNow]);

  // 通知の権限要求・テスト発火(F-014)
  const requestNotif = useCallback(async () => {
    const p = await requestNotifPermission();
    setNotifPerm(p);
  }, []);
  const fireTestNotif = useCallback(() => {
    fireTestNotification('dinner');
  }, []);

  // 権限あり時、通知設定の変更に追従して実時刻スケジュールを張り直す
  useEffect(() => {
    if (notifPerm === 'granted') scheduleNotifs(data.notification_setting ?? []);
  }, [notifPerm, data.notification_setting]);

  // --- 認証 ---
  const login = useCallback(
    async (email: string, pw: string) => {
      const s = await auth.login(email, pw);
      localStorage.setItem('token', s.token);
      localStorage.setItem('email', email);
      if (s.accountId) localStorage.setItem('accountId', s.accountId);
      setSession(s);
      void syncNow();
    },
    [syncNow],
  );

  const signup = useCallback(
    async (email: string, pw: string) => {
      const s = await auth.signup(email, pw);
      localStorage.setItem('token', s.token);
      localStorage.setItem('email', email);
      if (s.accountId) localStorage.setItem('accountId', s.accountId);
      setSession(s);
      void syncNow();
    },
    [syncNow],
  );

  const logout = useCallback(async () => {
    await auth.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('accountId');
    setSession(null);
    setSyncStatus('idle');
  }, []);

  // --- 目標(派生) ---
  const goalRec = data.goal?.[0];
  const goal: Goal = goalRec ? { kcal: goalRec.kcal, p: goalRec.p, f: goalRec.f, c: goalRec.c } : FALLBACK_GOAL;
  const weightGoal: number | undefined = goalRec?.weight;

  // --- 記録(原子Tx は UseCase 内 / date 省略時は今日) ---
  const saveMeal = useCallback(
    async (mealType: string, items: MealItem[], date: string = today, refs?: MealRefs) => {
      const res = await recordMeal.execute({ date, mealType, items, goal });
      if (refs) await repository.patch('meal_record', `m:${date}:${mealType}`, { refs });
      await recompute(date);
      await refresh();
      // 間食は達成判定外。◎○は出さず、加算した旨だけ通知する。
      showToast(mealType === 'snack' ? '間食を記録しました' : res.eval === '◎' ? '記録しました ◎ 目標クリア！' : '記録しました ○');
      scheduleSync();
      return res.eval as Eval;
    },
    [today, goal, recompute, refresh, showToast, scheduleSync],
  );

  // 「食べない」: 0kcalの意図的記録として upsert(skipped)。継続に数える(rollup が中立扱い)。
  const skipMeal = useCallback(
    async (mealType: string, date: string = today) => {
      await repository.upsert({ kind: 'meal', mealType, date, items: [], total: { kcal: 0, p: 0, f: 0, c: 0 }, achievement: '○', skipped: true });
      await recompute(date);
      await refresh();
      showToast('「食べない」を記録しました');
      scheduleSync();
    },
    [today, recompute, refresh, showToast, scheduleSync],
  );

  const saveWeight = useCallback(
    async (weight: number, date: string = today) => {
      await recordWeight.execute({ date, weight });
      await recompute(date);
      await refresh();
      showToast('体重を記録しました ◎');
      scheduleSync();
    },
    [today, recompute, refresh, showToast, scheduleSync],
  );

  const saveWorkout = useCallback(
    async (result: WorkoutResult, date: string = today, entries?: WorkoutEntry[]) => {
      const performedAsPlanned = result === 'asPlanned';
      const type = result === 'rest' ? '休む' : '実施';
      // evaluateWorkout: 休む→○ / performedAsPlanned===true→◎ / それ以外実行→○。
      await recordWorkout.execute({ date, performedAsPlanned, type, planned: result === 'asPlanned' });
      if (entries) await repository.patch('workout_record', `x:${date}:-`, { entries });
      await recompute(date);
      await refresh();
      showToast(
        result === 'asPlanned'
          ? '記録しました ◎ おつかれさま！'
          : result === 'performed'
            ? '記録しました ○ おつかれさま！'
            : '休みを記録しました ○',
      );
      scheduleSync();
    },
    [today, recompute, refresh, showToast, scheduleSync],
  );

  // --- 削除(論理削除 → 当日再集計) ---
  const deleteMeal = useCallback(
    async (mealType: string, date: string) => {
      await repository.removeByKind('meal', { date, mealType });
      await recompute(date);
      await refresh();
      showToast('削除しました');
      scheduleSync();
    },
    [recompute, refresh, showToast, scheduleSync],
  );
  const deleteWeight = useCallback(
    async (date: string) => {
      await repository.removeByKind('weight', { date });
      await recompute(date);
      await refresh();
      showToast('削除しました');
      scheduleSync();
    },
    [recompute, refresh, showToast, scheduleSync],
  );
  const deleteWorkout = useCallback(
    async (date: string) => {
      await repository.removeByKind('workout', { date });
      await recompute(date);
      await refresh();
      showToast('削除しました');
      scheduleSync();
    },
    [recompute, refresh, showToast, scheduleSync],
  );

  // --- 編集プリフィル用 ---
  const getMealRefs = useCallback(
    (mealType: string, date: string): MealRefs | undefined => {
      const rec = (data.meal_record ?? []).find((m) => m.date === date && m.mealType === mealType);
      return rec?.refs;
    },
    [data],
  );

  const lastWorkout = useCallback(
    (exerciseId: string): WorkoutEntry | undefined => {
      const recs = [...(data.workout_record ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));
      for (const r of recs) {
        const e = (r.entries ?? []).find((x: WorkoutEntry) => x.exerciseId === exerciseId);
        if (e) return e;
      }
      return undefined;
    },
    [data],
  );

  const dayStatus = useCallback(
    (date: string): TodayStatus => {
      const meals = (data.meal_record ?? []).filter((m) => m.date === date);
      const weight = (data.weight_record ?? []).find((w) => w.date === date);
      const workout = (data.workout_record ?? []).find((w) => w.date === date);
      return rollup(meals, weight, workout);
    },
    [data],
  );

  // --- マスタ/設定 ---
  const addFixedMenu = useCallback(
    async (menu: any) => {
      await master.addFixedMenu({ id: uuid(), ...menu });
      await refresh();
      showToast('追加しました');
      scheduleSync();
    },
    [refresh, showToast, scheduleSync],
  );
  const addExercise = useCallback(
    async (ex: any) => {
      await repository.save('exercise', { id: uuid(), ...ex });
      await refresh();
      showToast('追加しました');
      scheduleSync();
    },
    [refresh, showToast, scheduleSync],
  );
  const saveMaster = useCallback(
    async (table: string, row: any) => {
      await repository.save(table, { id: uuid(), ...row });
      await refresh();
      showToast('保存しました');
      scheduleSync();
    },
    [refresh, showToast, scheduleSync],
  );
  const deleteMaster = useCallback(
    async (table: string, id: string) => {
      await repository.remove(table as any, id);
      await refresh();
      showToast('削除しました');
      scheduleSync();
    },
    [refresh, showToast, scheduleSync],
  );

  const setGoal = useCallback(
    async (g: { kcal: number; p: number; f: number; c: number; weight?: number }) => {
      await repository.save('goal', { id: 'goal', ...g });
      await refresh();
      showToast('目標を保存しました');
      scheduleSync();
    },
    [refresh, showToast, scheduleSync],
  );

  const toggleNotif = useCallback(
    async (type: string) => {
      const cur = (data.notification_setting ?? []).find((n) => n.id === type);
      if (!cur) return;
      // updatedAt/deviceId を未指定にして save に再付与させる(シードの古い updatedAt を
      // 引き継ぐと同期差分に乗らず、別端末へ伝播しないため)。
      await repository.save('notification_setting', {
        ...cur,
        enabled: !cur.enabled,
        updatedAt: undefined,
        deviceId: undefined,
      });
      await refresh();
      showToast(!cur.enabled ? '通知をオンにしました' : '通知をオフにしました');
      scheduleSync();
    },
    [data, refresh, showToast, scheduleSync],
  );

  // --- データ ---
  const exportBackup = useCallback(() => backup.export(), []);

  // 日々の記録だけを一括 tombstone → 同期で削除を伝播(復活防止)。マスタ/目標/通知は保持。
  const clearRecords = useCallback(async () => {
    const stores = ['weight_record', 'meal_record', 'workout_record', 'daily_achievement'] as const;
    let total = 0;
    for (const s of stores) total += await repository.clearStore(s);
    // 明示的に全削除したら以後はデモ履歴を再生成しない(翌日起動でストリークが復活する不具合を防ぐ)。
    await repository.setMeta('demoCleared', true);
    await repository.setMeta('seedAnchor', today);
    await refresh();
    showToast(total > 0 ? `記録を${total}件削除しました` : '削除する記録はありませんでした');
    await syncNow(); // tombstone を即サーバーへ送り、次回 pull での復活を防ぐ
    return total;
  }, [refresh, showToast, syncNow, today]);

  // すべての業務ストア(記録＋マスタ＋目標＋通知)を一括 tombstone → 空の状態へ初期化。
  // デモを丸ごと消したい時/本運用へ切り替える時に使う。同期で削除を伝播し復活を防ぐ。
  const resetAll = useCallback(async () => {
    const stores = [
      'weight_record',
      'meal_record',
      'workout_record',
      'daily_achievement',
      'fixedMenu',
      'eating_out_item',
      'exercise',
      'workout_plan',
      'goal',
      'notification_setting',
    ] as const;
    let total = 0;
    for (const s of stores) total += await repository.clearStore(s);
    await repository.setMeta('demoCleared', true);
    await repository.setMeta('seedAnchor', today);
    await refresh();
    showToast(total > 0 ? 'すべてのデータを初期化しました' : '削除するデータはありませんでした');
    await syncNow();
    return total;
  }, [refresh, showToast, syncNow, today]);

  const importBackup = useCallback(
    async (json: string) => {
      await backup.import(json);
      await refresh();
      showToast('復元しました');
      scheduleSync();
    },
    [refresh, showToast, scheduleSync],
  );

  // --- 派生 ---
  const todayStatus = useMemo(() => dayStatus(today), [dayStatus, today]);
  const dailyList = useMemo(
    () => (data.daily_achievement ?? []).map((d) => ({ date: d.date, achievement: (d.achievement ?? '○') as Eval })),
    [data],
  );
  const streak = useMemo(() => calcStreak(dailyList, today), [dailyList, today]);
  const bestStreak = useMemo(() => maxStreak(dailyList), [dailyList]);
  const gap = useMemo(() => detectGap(dailyList, today), [dailyList, today]);

  const value: AppCtx = {
    ready,
    session,
    today,
    data,
    goal,
    weightGoal,
    todayStatus,
    streak,
    bestStreak,
    gap,
    toast,
    syncStatus,
    online,
    notifPermission: notifPerm,
    requestNotif,
    fireTestNotif,
    login,
    signup,
    logout,
    saveMeal,
    skipMeal,
    saveWeight,
    saveWorkout,
    deleteMeal,
    deleteWeight,
    deleteWorkout,
    getMealRefs,
    lastWorkout,
    dayStatus,
    addFixedMenu,
    addExercise,
    saveMaster,
    deleteMaster,
    setGoal,
    toggleNotif,
    exportBackup,
    importBackup,
    clearRecords,
    resetAll,
    syncNow,
    showToast,
    services: { dashboard, calendar },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
