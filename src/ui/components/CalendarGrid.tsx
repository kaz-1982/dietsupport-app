// カレンダーの月グリッド。各日の3本柱(食事/運動/体重)達成を3分割リングで表示。
import type { ReactNode } from 'react';
import { C } from '../../theme';
import { DayRing } from './Stamp';

export interface DayPillars {
  meal: boolean;
  workout: boolean;
  weight: boolean;
}

function CalCell({ d, pillars, isToday, future, onClick }: { d: number; pillars?: DayPillars; isToday: boolean; future: boolean; onClick?: () => void }) {
  const numCol = future ? '#d8d2c6' : isToday ? '#1f9d57' : '#6f6a62';
  const style = {
    aspectRatio: '1 / 1.18',
    borderRadius: 11,
    border: isToday ? '1.5px solid #1f9d57' : '1.5px solid transparent',
    background: isToday ? '#eef9f1' : 'transparent',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: '100%',
  };
  const inner = (
    <>
      <div style={{ fontSize: 10, fontWeight: isToday ? 900 : 700, color: numCol, lineHeight: 1 }}>{d}</div>
      {future ? (
        <div style={{ height: 26 }} />
      ) : (
        <DayRing meal={!!pillars?.meal} workout={!!pillars?.workout} weight={!!pillars?.weight} size={26} center />
      )}
    </>
  );
  if (future || !onClick) return <div style={style}>{inner}</div>;
  return (
    <button onClick={onClick} style={style}>
      {inner}
    </button>
  );
}

export function CalendarGrid({
  year,
  month,
  today,
  pillarsOf,
  onDayClick,
}: {
  year: number;
  month: number; // 0-11
  today: string; // 'YYYY-MM-DD'
  pillarsOf: (iso: string) => DayPillars | undefined;
  onDayClick?: (iso: string) => void;
}) {
  const first = new Date(year, month, 1);
  const dim = new Date(year, month + 1, 0).getDate();
  const startCol = (first.getDay() + 6) % 7; // 月曜始まり
  const heads = ['月', '火', '水', '木', '金', '土', '日'];
  const p = (n: number) => String(n).padStart(2, '0');
  const cells: ReactNode[] = [];

  heads.forEach((hd, i) =>
    cells.push(
      <div key={'h' + i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: i >= 5 ? '#bcaeb0' : C.faint, padding: '0 0 6px' }}>
        {hd}
      </div>,
    ),
  );
  for (let i = 0; i < startCol; i++) cells.push(<div key={'bl' + i} />);
  for (let d = 1; d <= dim; d++) {
    const iso = `${year}-${p(month + 1)}-${p(d)}`;
    const isToday = iso === today;
    const future = iso > today;
    cells.push(<CalCell key={'d' + d} d={d} pillars={future ? undefined : pillarsOf(iso)} isToday={isToday} future={future} onClick={onDayClick ? () => onDayClick(iso) : undefined} />);
  }

  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '5px 3px' }}>{cells}</div>;
}
