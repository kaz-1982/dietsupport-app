// UI 用の日付ヘルパ。ドメインの prevDate(UTC基準の 'YYYY-MM-DD' 演算)を再利用。
import { prevDate } from '../domain';

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// date の n 日前。
export function nPrev(date: string, n: number): string {
  let d = date;
  for (let i = 0; i < n; i++) d = prevDate(d);
  return d;
}

const WEEK_JP = ['日', '月', '火', '水', '木', '金', '土'];

// '6月23日（火）'
export function dateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEK_JP[d.getDay()]}）`;
}

// 時間帯あいさつ
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'おはよう';
  if (h < 17) return 'こんにちは';
  return 'こんばんは';
}

// 食事区分(D-9: morning/noon/night) + 間食(snack) ⇄ 日本語ラベル。
// 間食は「カロリー/PFC には加算するが達成基準には含めない」任意の種別(入れても入れなくてもよい)。
export type MealType = 'morning' | 'noon' | 'night' | 'snack';
export const MEAL_LABEL: Record<MealType, string> = {
  morning: '朝',
  noon: '昼',
  night: '夕',
  snack: '間食',
};
// 「〜食」を含む正式名(コピー導線・合計表示など)。間食は「間食」のまま。
export const MEAL_NOUN: Record<MealType, string> = {
  morning: '朝食',
  noon: '昼食',
  night: '夕食',
  snack: '間食',
};
// 達成判定(◎○)の対象となる食事区分。間食はここに含めない(達成基準外)。
export const MAIN_MEAL_TYPES: MealType[] = ['morning', 'noon', 'night'];
export const isSnack = (mt: string): boolean => mt === 'snack';

// 現在時刻から初期の食事区分を選ぶ(間食は明示選択のみ)
export function defaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'morning';
  if (h < 16) return 'noon';
  return 'night';
}
