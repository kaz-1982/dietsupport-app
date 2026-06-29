// Domain の値・型定義(D-2 / D-12)。framework 非依存。
export type Eval = '◎' | '○' | 'なし';

export interface Goal {
  kcal: number;
  p: number;
  f: number;
  c: number;
}

export interface MealItem {
  kcal: number;
  p: number;
  f: number;
  c: number;
  qty: number;
  deleted?: boolean;
}

export interface PfcTotal {
  kcal: number;
  p: number;
  f: number;
  c: number;
}

export interface DayAchievement {
  date: string; // 'YYYY-MM-DD'
  achievement: Eval;
}

export interface SyncRecord {
  id: string;
  updatedAt: string; // ISO 8601
  deleted?: boolean;
  deviceId?: string;
  [k: string]: unknown;
}

export interface GapInfo {
  gap: boolean;
  from?: string; // 'YYYY-MM-DD'(gap=true のときのみ)
}

export interface WorkoutRecord {
  type?: string; // '実施' | '休む' など
  performedAsPlanned?: boolean;
  [k: string]: unknown;
}

export interface WorkoutPlan {
  plannedToday?: boolean;
  [k: string]: unknown;
}

export interface WeightRecord {
  weight?: number;
  [k: string]: unknown;
}
