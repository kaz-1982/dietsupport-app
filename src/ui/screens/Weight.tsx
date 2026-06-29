// S-003 体重記録(F-001/007)。スライダー(大きく)＋±0.1ボタン(小さく)・目標差分・推移グラフ・測定=◎。編集/削除/遡及対応。
import { useState, type CSSProperties } from 'react';
import { useApp } from '../../app/store';
import type { Go } from '../../app/nav';
import { dateLabel } from '../../app/date';
import { C, F, R, SH } from '../../theme';
import { BackHeader } from '../components/ui';
import { LineChart } from '../components/Chart';

export function Weight({ go, date }: { go: Go; date?: string }) {
  const { today, data, weightGoal, saveWeight, deleteWeight } = useApp();
  const recordDate = date ?? today;

  const records = [...(data.weight_record ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = records[records.length - 1];
  const existing = records.find((r) => r.date === recordDate);
  const [w, setW] = useState<number>(existing?.weight ?? latest?.weight ?? weightGoal ?? 65.0);
  const [busy, setBusy] = useState(false);

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const inc = () => setW((v) => round1(v + 0.1));
  const dec = () => setW((v) => round1(v - 0.1));

  // スライダーの範囲。現体重・目標が常に収まるよう自動で広げる。
  const lo = Math.floor(Math.min(40, weightGoal ?? w, w) - 2);
  const hi = Math.ceil(Math.max(120, weightGoal ?? w, w) + 2);
  const goalPct = weightGoal != null && weightGoal >= lo && weightGoal <= hi ? ((weightGoal - lo) / (hi - lo)) * 100 : null;

  const diff = weightGoal != null ? round1(w - weightGoal) : null;
  const diffLabel =
    diff == null ? '体重目標は設定で登録できます' : diff > 0 ? `目標まで あと ${Math.abs(diff).toFixed(1)}kg` : diff < 0 ? `目標を ${Math.abs(diff).toFixed(1)}kg クリア` : '目標ぴったり';

  const series = records.map((r) => r.weight as number).slice(-14);

  const record = async () => {
    setBusy(true);
    try {
      await saveWeight(w, recordDate);
      go('home');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    await deleteWeight(recordDate);
    go('home');
  };

  return (
    <div style={{ padding: '18px 18px 110px', animation: 'dsRise .3s ease both' }}>
      <BackHeader title={existing ? '体重を編集' : '体重を記録'} onBack={() => go('home')} />

      {recordDate !== today && (
        <div style={{ background: '#fff3d9', color: '#9a6a12', fontWeight: 800, fontSize: 12.5, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
          {dateLabel(recordDate)} の記録（遡及入力）
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: R.card, padding: '26px 20px', boxShadow: SH.cardLg, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.faint2, marginBottom: 6 }}>{recordDate === today ? 'きょうの体重' : 'この日の体重'}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, margin: '10px 0 12px' }}>
          <span style={{ fontSize: 62, fontWeight: 900, lineHeight: 1, letterSpacing: '-.02em' }}>{w.toFixed(1)}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.faint }}>kg</span>
        </div>

        {/* スライダー(大きく動かす) */}
        <div style={{ position: 'relative', padding: '0 4px', marginBottom: 4 }}>
          {goalPct != null && (
            <span
              aria-hidden
              style={{ position: 'absolute', top: -6, left: `calc(${goalPct}% )`, transform: 'translateX(-50%)', zIndex: 1, pointerEvents: 'none', fontSize: 11, fontWeight: 800, color: '#c0871f' }}
            >
              ▾<span style={{ display: 'block', width: 2, height: 26, background: '#e8c879', margin: '-2px auto 0' }} />
            </span>
          )}
          <input
            type="range"
            min={lo}
            max={hi}
            step={0.1}
            value={w}
            onChange={(e) => setW(round1(Number(e.target.value)))}
            aria-label="体重スライダー"
            style={{ width: '100%', accentColor: C.green, height: 28, cursor: 'pointer', position: 'relative', zIndex: 2 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: C.faint, marginTop: 2 }}>
            <span>{lo} kg</span>
            <span>{hi} kg</span>
          </div>
        </div>

        {/* ±0.1(小さく動かす) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '12px 0 14px' }}>
          <button onClick={dec} aria-label="0.1kg減らす" style={fineBtn}>−0.1</button>
          <button onClick={inc} aria-label="0.1kg増やす" style={fineBtn}>＋0.1</button>
        </div>

        <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, color: '#c0871f', background: '#f8ecd2', borderRadius: 999, padding: '6px 14px', marginBottom: 20 }}>
          {diffLabel}
        </div>
        <button onClick={record} disabled={busy} data-testid="weight-save" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: C.green, color: '#fff', fontWeight: 800, fontSize: 17, borderRadius: R.btn, padding: 16, boxShadow: SH.btn }}>
          <span style={{ fontFamily: F.stamp }}>◎</span> {busy ? '記録中…' : existing ? '記録を更新する' : '記録する'}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: R.card, padding: 18, boxShadow: SH.card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>最近の推移</span>
          {weightGoal != null && <span style={{ fontSize: 11, fontWeight: 700, color: '#c0871f' }}>目標 {weightGoal.toFixed(1)} kg</span>}
        </div>
        <LineChart data={series} w={340} h={120} goalWeight={weightGoal ?? series[series.length - 1] ?? w} />
      </div>

      {existing && (
        <button onClick={remove} style={{ width: '100%', marginTop: 18, padding: 14, fontSize: 13.5, fontWeight: 800, color: C.verm }}>
          この日の体重記録を削除
        </button>
      )}
    </div>
  );
}

const fineBtn: CSSProperties = {
  minWidth: 88,
  height: 48,
  borderRadius: 14,
  background: '#f3f0ea',
  color: C.green,
  fontSize: 18,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 0 #e0dacd',
};
