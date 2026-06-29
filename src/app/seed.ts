// 初回起動時のサンプルデータ投入。内容はモック(support.js)の sample data を「正」として踏襲。
// 体重履歴と過去の達成は、グラフ/カレンダー/ストリークが最初から「生きて」見えるように入れる。
// (現在ストリーク=23 / 最長=31 になるよう、24・25日前に意図的な抜けを作る)
import { repository } from '../infrastructure/repository';
import { todayISO, nPrev } from './date';

export const FIXED_MENUS = [
  { id: 'm1', name: '納豆ごはん＋味噌汁', mealType: 'morning', kubun: '朝', kcal: 450, p: 20, f: 12, c: 65, recipe: 'ごはん150g / 納豆1P' },
  { id: 'm2', name: 'プロテインオートミール', mealType: 'morning', kubun: '朝', kcal: 320, p: 28, f: 8, c: 38, recipe: 'オーツ40g / プロテイン1杯' },
  { id: 'm3', name: '卵かけごはん', mealType: 'morning', kubun: '朝', kcal: 380, p: 14, f: 9, c: 60, recipe: '卵1個' },
  { id: 'm4', name: '鶏むね弁当', mealType: 'noon', kubun: '昼', kcal: 520, p: 42, f: 12, c: 58, recipe: 'むね150g / 玄米' },
  { id: 'm5', name: '鮭おにぎり2個＋サラダ', mealType: 'noon', kubun: '昼', kcal: 480, p: 18, f: 10, c: 72, recipe: '' },
  { id: 'm6', name: '蕎麦＋ゆで卵', mealType: 'noon', kubun: '昼', kcal: 450, p: 22, f: 11, c: 62, recipe: '' },
  { id: 'm7', name: '鶏むねと野菜炒め', mealType: 'night', kubun: '夕', kcal: 480, p: 40, f: 14, c: 40, recipe: 'ノンオイル' },
  { id: 'm8', name: '豆腐ハンバーグ定食', mealType: 'night', kubun: '夕', kcal: 560, p: 38, f: 18, c: 52, recipe: '' },
  { id: 'm9', name: '刺身定食', mealType: 'night', kubun: '夕', kcal: 520, p: 40, f: 12, c: 55, recipe: '' },
  { id: 'm10', name: 'プロテインバー', mealType: 'snack', kubun: '間食', kcal: 200, p: 15, f: 7, c: 22, recipe: '' },
  { id: 'm11', name: 'ギリシャヨーグルト', mealType: 'snack', kubun: '間食', kcal: 100, p: 10, f: 0, c: 12, recipe: '' },
  { id: 'm12', name: '素焼きミックスナッツ', mealType: 'snack', kubun: '間食', kcal: 180, p: 6, f: 16, c: 6, recipe: '一握り(30g)' },
];

export const EATING_OUT = [
  { id: 'e1', name: 'サラダチキン', kcal: 114, p: 25, f: 2, c: 1, category: 'コンビニ' },
  { id: 'e2', name: 'おにぎり(鮭)', kcal: 180, p: 5, f: 2, c: 36, category: 'コンビニ' },
  { id: 'e3', name: 'ファミチキ', kcal: 242, p: 13, f: 15, c: 13, category: 'コンビニ' },
  { id: 'e4', name: '牛丼(並)', kcal: 635, p: 20, f: 20, c: 90, category: '外食' },
];

export const EXERCISES = [
  { id: 'x1', name: 'ベンチプレス', part: '胸', last: '60kg × 8 × 3', w: '60', wu: 'kg', r: '8', s: '3' },
  { id: 'x2', name: 'ショルダープレス', part: '肩', last: '18kg × 10 × 3', w: '18', wu: 'kg', r: '10', s: '3' },
  { id: 'x3', name: 'スクワット', part: '脚', last: '80kg × 8 × 3', w: '80', wu: 'kg', r: '8', s: '3' },
  { id: 'x4', name: 'デッドリフト', part: '背中', last: '90kg × 5 × 3', w: '90', wu: 'kg', r: '5', s: '3' },
  { id: 'x5', name: '懸垂', part: '背中', last: '自重 × 8 × 3', w: '自重', wu: '', r: '8', s: '3' },
  { id: 'x6', name: 'プランク', part: '体幹', last: '60秒 × 3', w: '60', wu: '秒', r: '—', s: '3' },
];

export const PLANS = [
  { id: 'p-mon', day: '月', part: '胸の日', ex: ['x1', 'x2'] },
  { id: 'p-wed', day: '水', part: '脚の日', ex: ['x3'] },
  { id: 'p-fri', day: '金', part: '背中の日', ex: ['x4', 'x5'] },
];

export const GOAL = { id: 'goal', kcal: 1800, p: 120, f: 50, c: 200, weight: 68.0 };

export const NOTIFS = [
  { id: 'weight', type: 'weight', label: '体重をはかる', time: '07:00', enabled: true },
  { id: 'breakfast', type: 'breakfast', label: '朝食を記録', time: '08:00', enabled: true },
  { id: 'lunch', type: 'lunch', label: '昼食を記録', time: '12:30', enabled: false },
  { id: 'dinner', type: 'dinner', label: '夕食を記録', time: '19:30', enabled: true },
];

const WEIGHT_HIST = [
  70.6, 70.4, 70.5, 70.1, 70.2, 69.9, 70.0, 69.7, 69.8, 69.5, 69.6, 69.3, 69.4, 69.2, 69.3, 69.0,
  69.1, 68.9, 69.0, 69.2,
];

const DEMO_DEVICE = 'seed';
// デモ履歴の対象(日付ベース)テーブル。実記録の有無判定に使う。
const DATE_TABLES = ['weight_record', 'meal_record', 'workout_record', 'daily_achievement'] as const;

// 本運用向けスイッチ: VITE_DEMO_DATA=off で「見栄え用のデモ履歴(過去の体重/達成)」を
// 投入しない。固定メニュー・種目・目標・通知などの初期マスタは入る(アプリ動作に必要)。
const DEMO_DISABLED = (import.meta as any).env?.VITE_DEMO_DATA === 'off';

let seedPromise: Promise<void> | null = null;

// StrictMode の二重実行でも seed が重複しないよう、セッション内で1回に束ねる。
export function seedIfNeeded(): Promise<void> {
  if (!seedPromise) seedPromise = runSeed();
  return seedPromise;
}

// デモの体重履歴(直近20日)+日次達成(直近56日)を today 基準で書き込む。
// 初回 seed と、日付が進んだ時の再生成(refreshDemoIfStale)で共用する。
async function writeDemoHistory(today: string, ts: string): Promise<void> {
  // 体重履歴(直近20日、昨日まで)
  for (let i = 1; i <= 20; i++) {
    const date = nPrev(today, i);
    await repository.save('weight_record', {
      id: `w:${date}`,
      kind: 'weight',
      date,
      weight: WEIGHT_HIST[20 - i],
      achievement: '◎',
      updatedAt: ts,
      deviceId: DEMO_DEVICE,
      deleted: false,
    });
  }

  // 日次達成(直近56日。24・25日前を抜けにして 現在23 / 最長31 を再現)
  const daily: any[] = [];
  for (let i = 1; i <= 56; i++) {
    if (i === 24 || i === 25) continue;
    const date = nPrev(today, i);
    const ach = i % 7 === 0 ? '○' : '◎';
    daily.push({
      id: `d:${date}`,
      date,
      mealEval: ach,
      workoutEval: i % 3 === 0 ? '◎' : '○',
      weightEval: '◎',
      allAchieved: i % 5 === 0 && ach === '◎',
      achievement: ach,
      updatedAt: ts,
      deviceId: DEMO_DEVICE,
      deleted: false,
    });
  }
  await repository.save('daily_achievement', daily);
}

async function runSeed(): Promise<void> {
  if (await repository.getMeta('seeded')) return;

  const today = todayISO();

  // 本運用(VITE_DEMO_DATA=off): サンプルは一切投入せず「完全に空」で開始する。
  // 固定メニュー・種目・予定・目標・通知リマインダー・履歴のすべてを入れない。
  if (!DEMO_DISABLED) {
    await repository.save('fixedMenu', FIXED_MENUS);
    await repository.save('eating_out_item', EATING_OUT);
    await repository.save('exercise', EXERCISES);
    await repository.save('workout_plan', PLANS);
    await repository.save('goal', GOAL);
    await repository.save('notification_setting', NOTIFS);
    await writeDemoHistory(today, new Date().toISOString());
  }

  await repository.setMeta('seeded', true);
  await repository.setMeta('seedAnchor', today); // 再アンカー判定の基準日
}

// デモの日付が古くなったら today 基準へ作り直す(デモが常に「生きて」見えるように)。
// 認証ゲートによりストリークはログイン後に表示されるため、同期安全に行う:
// ・実記録(seed 以外)が1件でもあればデモには触れない(実記録が正)。
// ・旧デモ行は論理削除して削除を同期で伝播 → today 基準で再生成(端末間で復活させない)。
export async function refreshDemoIfStale(): Promise<void> {
  if (DEMO_DISABLED) return; // 本運用: デモ履歴は投入しないので再生成も不要
  if (!(await repository.getMeta('seeded'))) return; // 未 seed は対象外
  if (await repository.getMeta('demoCleared')) return; // ユーザーが全削除済みなら復活させない
  const anchor = await repository.getMeta('seedAnchor');
  const today = todayISO();
  if (anchor === today) return; // 同日は早期 return(毎起動の常時パス)

  const all = await repository.getAll();
  const hasReal = DATE_TABLES.some((t) => (all[t] ?? []).some((r: any) => r.deviceId !== DEMO_DEVICE));
  if (hasReal) {
    await repository.setMeta('seedAnchor', today); // 実記録があるので判定基準だけ進める
    return;
  }

  // 純デモ: 旧デモ履歴(日付ベース)を論理削除 → today 基準で再生成。
  for (const t of ['weight_record', 'daily_achievement'] as const) {
    for (const row of all[t] ?? []) {
      if (row.deviceId === DEMO_DEVICE && row.id) await repository.remove(t, row.id);
    }
  }
  await writeDemoHistory(today, new Date().toISOString());
  await repository.setMeta('seedAnchor', today);
}
