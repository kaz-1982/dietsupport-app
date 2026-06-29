import type { MealItem, PfcTotal } from './types';

// F-002 / D-7 A3: 明細(スナップショット値 × qty)を合算。deleted は除外。
export function aggregate(items: MealItem[]): PfcTotal {
  const total: PfcTotal = { kcal: 0, p: 0, f: 0, c: 0 };
  for (const it of items) {
    if (it.deleted) continue;
    const q = it.qty ?? 1;
    total.kcal += it.kcal * q;
    total.p += it.p * q;
    total.f += it.f * q;
    total.c += it.c * q;
  }
  return total;
}
