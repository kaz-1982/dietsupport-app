// 画面ルーティングの識別子(B-7 の S-001〜S-008)。
export type Screen =
  | 'home' // S-001
  | 'meal' // S-002
  | 'weight' // S-003
  | 'workout' // S-004
  | 'dash' // S-005
  | 'cal' // S-006
  | 'settings' // S-007
  | 'master'; // S-008

// 画面遷移。opts.date = 記録対象日(遡及入力)、opts.mealType = 食事画面の初期区分。
export interface GoOpts {
  date?: string;
  mealType?: 'morning' | 'noon' | 'night' | 'snack';
}
export type Go = (s: Screen, opts?: GoOpts) => void;
