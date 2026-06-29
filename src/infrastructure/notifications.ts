// クライアント・ローカル通知(F-014 / B-1)。アプリ起動中、設定時刻に実発火するスケジューラ。
// ※ アプリ層の NotificationScheduler(契約=即時発火/AT-014)とは別物。こちらが「本物のタイマー」。
// クリックで記録画面へ遷移(navHandler 経由)。しつこくしない = 1スロット1日1回。
// 端末を閉じている間の配信は Web Push/Notification Triggers が必要(B-1: ベストエフォート)。
// 本実装はフォアグラウンド/インストール済みPWAが開いている間に発火し、未達はアプリ内導線で補完(R-NF-009)。

export interface NotifSetting {
  id: string;
  type?: string;
  time?: string; // 'HH:MM'
  enabled?: boolean;
  label?: string;
}

let navHandler: ((type: string) => void) | null = null;
export function setNotifNavHandler(fn: (type: string) => void): void {
  navHandler = fn;
}

let timers: ReturnType<typeof setTimeout>[] = [];
const firedToday = new Set<string>(); // `${type}@${日付}` 発火済み

const LABEL: Record<string, { title: string; body: string }> = {
  weight: { title: '体重をはかろう ⚖️', body: '起きたら、はかるだけ。' },
  breakfast: { title: '朝食を記録 🍚', body: '1タップで記録できます。' },
  lunch: { title: '昼食を記録 🍱', body: '1タップで記録できます。' },
  dinner: { title: '夕食を記録 🍽️', body: '今日の夕ごはんを記録しましょう。' },
};

export function notifSupported(): boolean {
  return typeof Notification !== 'undefined';
}
export function notifPermission(): NotificationPermission {
  return notifSupported() ? Notification.permission : 'denied';
}
export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!notifSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// 次に time(HH:MM)が来るまでのミリ秒(過ぎていれば翌日)。
function msUntil(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const t = new Date(now);
  t.setHours(h || 0, m || 0, 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t.getTime() - now.getTime();
}

function show(type: string, ignoreDedup = false): boolean {
  if (notifPermission() !== 'granted') return false;
  const key = `${type}@${new Date().toDateString()}`;
  if (!ignoreDedup && firedToday.has(key)) return false; // しつこくしない
  const info = LABEL[type] ?? { title: 'DietSupport', body: '記録しましょう。' };
  try {
    const n = new Notification(info.title, { body: info.body, tag: `ds-${type}`, icon: '/icon.svg', data: { type } });
    n.onclick = () => {
      window.focus();
      navHandler?.(type);
      n.close();
    };
    if (!ignoreDedup) firedToday.add(key);
    return true;
  } catch {
    return false; // モバイル等で new Notification 不可 → アプリ内導線で補完
  }
}

// 有効な全スロットを設定時刻にアーム(発火後は翌日へ再アーム)。
export function scheduleAll(settings: NotifSetting[]): void {
  cancelAll();
  if (notifPermission() !== 'granted') return;
  for (const s of settings) {
    if (!s.enabled || !s.time || !s.type) continue;
    const type = s.type;
    const arm = () => {
      show(type);
      timers.push(setTimeout(arm, 24 * 60 * 60 * 1000)); // 翌日
    };
    timers.push(setTimeout(arm, msUntil(s.time)));
  }
}

export function cancelAll(): void {
  timers.forEach(clearTimeout);
  timers = [];
}

// 動作確認用: 即時に1件発火(重複排除を無視)。
export function fireTest(type = 'dinner'): boolean {
  return show(type, true);
}
