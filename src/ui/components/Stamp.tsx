// ◎○未 のハンコ風スタンプ(モック _stamp / _weekRow を移植)。
import type { ReactNode } from 'react';
import { C, F, PILLAR, type StampState } from '../../theme';

export function Stamp({ state, size = 84, deg = -6, color = C.verm }: { state: StampState; size?: number; deg?: number; color?: string }) {
  const s = size;
  if (state === 'none') {
    // 未入力。柱の色を薄く帯びさせ「どれが足りないか」を色でも伝える。
    return (
      <div
        style={{
          width: s,
          height: s,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2.5px dashed ${color}66`,
          background: `${color}0d`,
          color: `${color}99`,
          fontFamily: F.stamp,
          fontWeight: 700,
          fontSize: s * 0.28,
        }}
      >
        未
      </div>
    );
  }
  const glyph = state === 'done' ? '◎' : '○';
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2.5px solid ${color}`,
        background: '#fff',
        color: color,
        fontFamily: F.stamp,
        fontWeight: state === 'done' ? 800 : 700,
        fontSize: s * (state === 'done' ? 0.55 : 0.6),
        transform: `rotate(${deg}deg)`,
        boxShadow: `inset 0 0 0 3px #fff, inset 0 0 0 5px ${color}`,
      }}
    >
      {glyph}
    </div>
  );
}

// ───────── ホーム「きょうの達成」専用スタンプ群 ─────────
// 未記録は ◎○未 と同じ破線「未」を流用(色だけ柱ごとに変える)。
type SlotState = 'done' | 'skip' | 'none';

function NoneStamp({ size, deg, color }: { size: number; deg: number; color: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2.5px dashed ${color}66`,
        background: `${color}0d`,
        color: `${color}99`,
        fontFamily: F.stamp,
        fontWeight: 700,
        fontSize: size * 0.28,
        transform: `rotate(${deg}deg)`,
      }}
    >
      未
    </div>
  );
}

// 押印アニメ付きの土台。deg(傾き)は外枠で固定し、内側で scale ポップさせる。
function StampFrame({ size, deg, animate, children }: { size: number; deg: number; animate: boolean; children: ReactNode }) {
  return (
    <div style={{ width: size, height: size, transform: `rotate(${deg}deg)` }}>
      <div style={{ width: '100%', height: '100%', animation: animate ? 'dsStamp .42s cubic-bezier(.18,.9,.32,1.4) both' : undefined }}>{children}</div>
    </div>
  );
}

// 食事: 朝昼夕の3アーチが朱で埋まるリング。1→2→3食で進捗が見え、3食そろうと中央に「達」。
// ◎(食べた分すべて目標クリア)のときだけ金の祝福リングを足す。
const MEAL_ARCS = ['M52.65 12.09 A38 38 0 0 1 84.15 66.66', 'M81.5 71.25 A38 38 0 0 1 18.5 71.25', 'M15.85 66.66 A38 38 0 0 1 47.35 12.09'];
export function MealStamp({ slots, achieved, size = 84, deg = -7 }: { slots: SlotState[]; achieved: boolean; size?: number; deg?: number }) {
  const eaten = slots.filter((s) => s === 'done').length; // 実際に食べた回数
  const decided = slots.filter((s) => s !== 'none').length; // 自分で決めた枠(done+skip)
  if (decided === 0) return <NoneStamp size={size} deg={deg} color={C.verm} />;
  // skip も自分で入力した「クリア」。3枠すべて決めたら達成(1日2食でもOK)。
  const complete = decided === 3;
  // done=朱の塗り / skip=クリア済みの灰 / none=空き。3段階で見分ける。
  const arcColor = (s: SlotState) => (s === 'done' ? C.verm : s === 'skip' ? '#c9bdae' : '#eee5da');
  return (
    <StampFrame size={size} deg={deg} animate={complete}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {complete && achieved && <circle cx="50" cy="50" r="47" fill="none" stroke={C.gold} strokeWidth="2.5" />}
        {MEAL_ARCS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={arcColor(slots[i] ?? 'none')} strokeWidth="8" strokeLinecap="round" />
        ))}
        {complete ? (
          <>
            <circle cx="50" cy="50" r="22" fill={C.verm} />
            <text x="50" y="60" textAnchor="middle" fontFamily={F.stamp} fontSize="26" fontWeight="800" fill="#fff">
              達
            </text>
          </>
        ) : (
          <text x="50" y="63" textAnchor="middle" fontFamily={F.stamp} fontSize="42" fontWeight="800" fill={eaten > 0 ? C.verm : '#bcb2a4'}>
            {decided}
          </text>
        )}
      </svg>
    </StampFrame>
  );
}

// 運動: 実施=青の塗り＋白ダンベル / おやすみ=淡い青の月(前向きな休養) / 未。
export function WorkoutStamp({ state, size = 84, deg = 5 }: { state: 'done' | 'rest' | 'none'; size?: number; deg?: number }) {
  const color = C.blue;
  if (state === 'none') return <NoneStamp size={size} deg={deg} color={color} />;
  if (state === 'rest') {
    return (
      <StampFrame size={size} deg={deg} animate={false}>
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#eaf1fb" stroke={color} strokeWidth="3" />
          <path d="M58 30 a20 20 0 1 0 0 40 a15 15 0 1 1 0 -40 Z" fill={color} />
        </svg>
      </StampFrame>
    );
  }
  // ダンベル: 端を小→大の2段プレートにして「H」に見えないようにする。
  return (
    <StampFrame size={size} deg={deg} animate>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="46" fill={color} />
        <circle cx="50" cy="50" r="36" fill="none" stroke="#fff" strokeWidth="3" />
        <rect x="38" y="46" width="24" height="8" rx="2" fill="#fff" />
        <rect x="29" y="37" width="9" height="26" rx="3" fill="#fff" />
        <rect x="62" y="37" width="9" height="26" rx="3" fill="#fff" />
        <rect x="22" y="42" width="6" height="16" rx="2" fill="#fff" />
        <rect x="72" y="42" width="6" height="16" rx="2" fill="#fff" />
      </svg>
    </StampFrame>
  );
}

// 体重: 入力済み=緑の塗り＋白チェック / 未。
export function WeightStamp({ state, size = 84, deg = -5 }: { state: 'done' | 'none'; size?: number; deg?: number }) {
  const color = C.green;
  if (state === 'none') return <NoneStamp size={size} deg={deg} color={color} />;
  return (
    <StampFrame size={size} deg={deg} animate>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="46" fill={color} />
        <circle cx="50" cy="50" r="36" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M34 51 L46 63 L68 37" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </StampFrame>
  );
}

// 連続記録(右上バッジ)のトロフィー。カップの中に連続日数を表示。0日はグレー。
export function Trophy({ days, size = 56 }: { days: number; size?: number }) {
  const lit = days > 0;
  const gold = lit ? '#e0a23a' : '#d8d2c7';
  const dk = lit ? '#c0871f' : '#bcb6ab';
  const h = (size * 80) / 64;
  const fs = days >= 100 ? 15 : days >= 10 ? 19 : 24;
  return (
    <div style={{ width: size, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 64 80" width={size} height={h}>
        <path d="M14 20 C2 20 3 38 16 40" fill="none" stroke={dk} strokeWidth="3.5" />
        <path d="M50 20 C62 20 61 38 48 40" fill="none" stroke={dk} strokeWidth="3.5" />
        <path d="M12 15 L52 15 L52 23 C52 41 44 53 32 53 C20 53 12 41 12 23 Z" fill={gold} stroke={dk} strokeWidth="2" strokeLinejoin="round" />
        <rect x="29" y="53" width="6" height="9" fill={dk} />
        <rect x="21" y="62" width="22" height="5" rx="2" fill={dk} />
        <rect x="17" y="67" width="30" height="6" rx="2" fill={dk} />
        <text x="32" y="39" textAnchor="middle" fontFamily={F.stamp} fontSize={fs} fontWeight="800" fill={lit ? '#fff' : '#8a857c'}>
          {days}
        </text>
      </svg>
    </div>
  );
}

// 週間(月〜日)用の3分割リング。食事=朱/運動=青/体重=緑。その日に◎の柱だけ点灯、未は灰。
// 上=食事 / 右下=運動 / 左下=体重 の3アーチ(中心20,20・半径15)。
const RING_ARCS = [
  'M21.57 5.08 A15 15 0 0 1 33.70 26.10', // 食事(上)
  'M32.14 28.82 A15 15 0 0 1 7.86 28.82', // 運動(下)
  'M6.30 26.10 A15 15 0 0 1 18.43 5.08', // 体重(左)
];
export function DayRing({ meal, workout, weight, size = 30, center = false }: { meal: boolean; workout: boolean; weight: boolean; size?: number; center?: boolean }) {
  const gray = '#ddd5c8';
  const cols = [meal ? PILLAR.meal : gray, workout ? PILLAR.workout : gray, weight ? PILLAR.weight : gray];
  return (
    <svg viewBox="0 0 40 40" width={size} height={size}>
      {RING_ARCS.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={cols[i]} strokeWidth="5.5" strokeLinecap="round" />
      ))}
      {center && meal && workout && weight && (
        <text x="20" y="25.5" textAnchor="middle" fontFamily={F.stamp} fontSize="15" fontWeight="800" fill="#c0871f">
          達
        </text>
      )}
    </svg>
  );
}

export interface WeekDay {
  label: string;
  meal: boolean;
  workout: boolean;
  weight: boolean;
  isToday?: boolean;
}

export function WeekRow({ days }: { days: WeekDay[] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end' }}>
      {days.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <DayRing meal={d.meal} workout={d.workout} weight={d.weight} size={30} />
          <span style={{ fontSize: 10, fontWeight: 700, color: d.isToday ? C.verm : C.faint }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
