// S-006 ◎○カレンダー(F-011/012/008)。月別◎○・ストリーク。日タップで当日詳細＆遡及入力。
import { useMemo, useState, type CSSProperties } from 'react';
import { useApp, type TodayStatus } from '../../app/store';
import type { Go } from '../../app/nav';
import { dateLabel } from '../../app/date';
import { C, F, R, SH, PILLAR } from '../../theme';
import { PageTitle } from '../components/ui';
import { CalendarGrid } from '../components/CalendarGrid';

export function Calendar({ go }: { go: Go }) {
  const { today, data, streak, bestStreak, dayStatus } = useApp();
  const [offset, setOffset] = useState(0);
  const [sel, setSel] = useState<string | null>(null);

  const dailyMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const d of data.daily_achievement ?? []) m.set(d.date, d);
    return m;
  }, [data]);

  const baseY = Number(today.slice(0, 4));
  const baseM = Number(today.slice(5, 7)) - 1;
  const view = new Date(baseY, baseM + offset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();

  // 各日の柱別達成(食事・運動・体重それぞれ◎か)。3分割リングに渡す。
  const pillarsOf = (iso: string) => {
    const rec = dailyMap.get(iso);
    if (!rec) return undefined;
    return { meal: rec.mealEval === '◎', workout: rec.workoutEval === '◎', weight: rec.weightEval === '◎' };
  };

  // 日詳細の◎○: 当日の実レコードがあればそれ、無ければ日次サマリ(seed等)から。
  const statusOf = (iso: string): TodayStatus => {
    const rec = dailyMap.get(iso);
    if (rec && (rec.mealEval || rec.weightEval || rec.workoutEval)) {
      return { meal: rec.mealEval ?? 'なし', workout: rec.workoutEval ?? 'なし', weight: rec.weightEval ?? 'なし', allAchieved: !!rec.allAchieved };
    }
    return dayStatus(iso);
  };

  return (
    <div style={{ padding: '18px 18px 110px', animation: 'dsRise .3s ease both' }}>
      <PageTitle>カレンダー</PageTitle>

      <div style={{ display: 'flex', gap: 11, marginBottom: 16 }}>
        <div style={{ flex: 1, background: 'linear-gradient(150deg,#43b378,#1f9d57)', borderRadius: 18, padding: '15px 16px', color: '#fff' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.85 }}>連続記録（ストリーク）</div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 30, fontWeight: 900 }}>{streak}</span>
            <span style={{ fontSize: 13, fontWeight: 800, opacity: 0.85 }}> 日</span>
          </div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 18, padding: '15px 16px', boxShadow: SH.card }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.faint2 }}>最長記録</div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#c0871f' }}>{bestStreak}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.faint }}> 日</span>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: R.card2 + 4, padding: '16px 16px 18px', boxShadow: SH.card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={() => setOffset((o) => o - 1)} style={navBtn} aria-label="前の月">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6f6a62" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="14,6 8,12 14,18" />
            </svg>
          </button>
          <span style={{ fontSize: 15, fontWeight: 800 }}>
            {year}年 {month + 1}月
          </span>
          <button onClick={() => setOffset((o) => Math.min(0, o + 1))} style={navBtn} aria-label="次の月">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6f6a62" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="10,6 16,12 10,18" />
            </svg>
          </button>
        </div>

        <CalendarGrid year={year} month={month} today={today} pillarsOf={pillarsOf} onDayClick={setSel} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginTop: 16, paddingTop: 14, borderTop: '1px dashed #ece7dd', fontSize: 11, fontWeight: 700, color: C.faint2 }}>
          <LegendDot color={PILLAR.meal} label="食事" />
          <LegendDot color={PILLAR.workout} label="運動" />
          <LegendDot color={PILLAR.weight} label="体重" />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: F.stamp, color: '#c0871f', fontWeight: 800, fontSize: 13 }}>達</span> 3つ達成
          </span>
        </div>
      </div>

      <p style={{ fontSize: 11, fontWeight: 600, color: C.dim, textAlign: 'center', marginTop: 14 }}>日付をタップすると、その日の記録を確認・追加できます。</p>

      {sel && <DaySheet date={sel} status={statusOf(sel)} onClose={() => setSel(null)} go={go} />}
    </div>
  );
}

function DaySheet({ date, status, onClose, go }: { date: string; status: TodayStatus; onClose: () => void; go: Go }) {
  const rows: { label: string; ev: string; screen: 'meal' | 'workout' | 'weight' }[] = [
    { label: '食事', ev: status.meal, screen: 'meal' },
    { label: '運動', ev: status.workout, screen: 'workout' },
    { label: '体重', ev: status.weight, screen: 'weight' },
  ];
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(34,31,28,.4)', zIndex: 30, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: C.bg, borderRadius: '28px 28px 0 0', padding: '20px 18px 26px', animation: 'dsSheet .28s ease both' }}>
        <div style={{ width: 38, height: 5, borderRadius: 999, background: '#d8d2c6', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', marginBottom: 16 }}>{dateLabel(date)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => (
            <button
              key={r.screen}
              onClick={() => go(r.screen, { date })}
              style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 18, padding: 16, boxShadow: SH.card, textAlign: 'left', width: '100%' }}
            >
              <span style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.stamp, fontWeight: 800, fontSize: 22, border: r.ev === 'なし' ? '2px dashed #d3cdc2' : `2px solid ${C.verm}`, color: r.ev === 'なし' ? C.dim : C.verm, background: '#fff' }}>
                {r.ev === 'なし' ? '未' : r.ev}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 800 }}>{r.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: C.faint }}>{r.ev === 'なし' ? 'タップして記録' : `${r.ev}・タップで編集`}</span>
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cfc9bf" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="10,6 16,12 10,18" />
              </svg>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: 12, padding: 14, fontSize: 14, fontWeight: 800, color: C.faint2 }}>
          とじる
        </button>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

const navBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: '#f3f0ea',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
