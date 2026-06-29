// デザイントークン。モック(DietSupport.dc.html)の配色・フォント・影を抽出した「UIの正」。
// 画面は原則ここを参照する。

export const C = {
  green: '#1f9d57',
  greenLt: '#43b378',
  greenDk: '#178a4b',
  greenBg: '#e4f4ea',
  greenBg2: '#eef9f1',
  verm: '#d6452f', // ◎○スタンプの朱(=食事の色)
  blue: '#2f72c4', // 運動の色
  gold: '#e0a23a',
  goldDk: '#c0871f',
  goldBg: '#f8ecd2',
  ink: '#221f1c',
  soft: '#6f6a62',
  faint: '#a9a39a',
  faint2: '#8a857c',
  dim: '#bcb6ab',
  line: '#ece7dd',
  line2: '#f1ede4',
  bg: '#f6f3ec',
  chip: '#f1ede4',
  chip2: '#f3f0ea',
  white: '#fff',
} as const;

// 背景グラデ(アプリ全体)
export const APP_BG =
  'radial-gradient(120% 80% at 50% 0%, #eaf6ee 0%, #f3efe6 55%, #efe9dd 100%)';

export const F = {
  ui: "'M PLUS Rounded 1c', system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', sans-serif",
  stamp: "'Shippori Mincho B1', serif", // ◎○達 のハンコ表現
} as const;

export const SH = {
  card: '0 2px 0 #ece7dd',
  cardLg: '0 2px 0 #ece7dd,0 12px 30px -18px rgba(60,50,30,.3)',
  btn: '0 5px 0 #178a4b', // 主ボタンの立体影
  chip: '0 2px 0 #ece7dd',
} as const;

export const R = {
  card: 26,
  card2: 20,
  btn: 18,
  chip: 16,
  pill: 999,
} as const;

// 3本柱の識別色(食事=朱 / 運動=青 / 体重=緑)。スタンプ・記録行で使い、
// 「何が入っていて何が足りないか」を一目で見分けられるようにする。
export const PILLAR = {
  meal: C.verm,
  workout: C.blue,
  weight: C.green,
} as const;

// ◎○なし の内部状態表現
export type StampState = 'done' | 'partial' | 'none'; // ◎ / ○ / 未

// ドメインの Eval('◎'|'○'|'なし') → StampState
export function evalToStamp(e: '◎' | '○' | 'なし' | undefined | null): StampState {
  if (e === '◎') return 'done';
  if (e === '○') return 'partial';
  return 'none';
}
