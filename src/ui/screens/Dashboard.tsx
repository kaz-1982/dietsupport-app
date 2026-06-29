// S-005 統合ダッシュボード(F-010)。体重折れ線に運動日・目標線を重ね、指標を表示。
import { useState } from 'react';
import { useApp } from '../../app/store';
import { nPrev } from '../../app/date';
import { C, R, SH } from '../../theme';
import { PageTitle, SegTabs } from '../components/ui';
import { LineChart } from '../components/Chart';

type Period = '週' | '月' | '3ヶ月';
const DAYS: Record<Period, number> = { 週: 7, 月: 30, '3ヶ月': 90 };

export function Dashboard() {
  const { today, data, weightGoal } = useApp();
  const [period, setPeriod] = useState<Period>('月');

  const start = nPrev(today, DAYS[period] - 1);
  const series = [...(data.weight_record ?? [])]
    .filter((r) => r.date >= start)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const weights = series.map((s) => s.weight as number);
  const workoutDates = new Set(
    (data.workout_record ?? []).filter((w) => w.date >= start && w.achievement && w.achievement !== 'なし').map((w) => w.date),
  );
  const marks = series.map((s, i) => (workoutDates.has(s.date) ? i : -1)).filter((i) => i >= 0);

  const daily = (data.daily_achievement ?? []).filter((d) => d.date >= start);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const avg = weights.length ? round1(weights.reduce((a, b) => a + b, 0) / weights.length) : 0;
  const change = weights.length > 1 ? round1(weights[weights.length - 1] - weights[0]) : 0;
  const mealDoneDays = daily.filter((d) => d.mealEval === '◎').length;
  const recordedDays = daily.filter((d) => d.achievement && d.achievement !== 'なし').length;
  const rate = Math.round((recordedDays / DAYS[period]) * 100);

  const stats = [
    { label: '平均体重', val: avg ? avg.toFixed(1) : '—', unit: 'kg', col: C.green },
    { label: '期間増減', val: weights.length > 1 ? `${change > 0 ? '+' : ''}${change.toFixed(1)}` : '—', unit: 'kg', col: change <= 0 ? C.green : C.verm },
    { label: '食事◎の日', val: String(mealDoneDays), unit: '日', col: C.verm },
    { label: '達成率', val: String(rate), unit: '%', col: C.gold },
  ];

  return (
    <div style={{ padding: '18px 18px 110px', animation: 'dsRise .3s ease both' }}>
      <PageTitle>統合ダッシュボード</PageTitle>

      <div style={{ marginBottom: 16 }}>
        <SegTabs<Period>
          options={[
            { value: '週', label: '週' },
            { value: '月', label: '月' },
            { value: '3ヶ月', label: '3ヶ月' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <div style={{ background: '#fff', borderRadius: R.card2 + 4, padding: 18, boxShadow: SH.card, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>体重の推移</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.faint, marginBottom: 10 }}>
          緑＝体重　・　<span style={{ color: C.verm, fontWeight: 800 }}>●</span> 運動した日　・　<span style={{ color: '#c0871f', fontWeight: 800 }}>- -</span> 目標
        </div>
        <LineChart data={weights} w={360} h={168} goalWeight={weightGoal ?? weights[weights.length - 1] ?? 68} marks={marks} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        {stats.map((st) => (
          <div key={st.label} style={{ background: '#fff', borderRadius: 18, padding: '15px 16px', boxShadow: SH.card }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.faint2 }}>{st.label}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: st.col }}>{st.val}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.faint, marginLeft: 2 }}>{st.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
