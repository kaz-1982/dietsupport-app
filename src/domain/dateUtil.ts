// 'YYYY-MM-DD'(UTC基準)の前日/翌日/隣接判定。ストリーク・ギャップ計算で使用。
// 文字列は辞書順 = 日付順なので、比較は文字列のまま行える。
export function prevDate(date: string): string {
  const d = new Date(date + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function nextDate(date: string): string {
  const d = new Date(date + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function isNextDay(prev: string, next: string): boolean {
  return nextDate(prev) === next;
}
