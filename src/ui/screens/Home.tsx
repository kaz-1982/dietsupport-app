// S-001 ホーム(F-013/007/008/012/009)。3本柱の◎○・3つ揃い・ストリーク・カロリー進捗・再開導線・きょうの記録。
import type { ReactNode } from 'react';
import { useApp } from '../../app/store';
import type { Go } from '../../app/nav';
import { dateLabel, greeting, type MealType } from '../../app/date';
import { C, F, SH, R, PILLAR } from '../../theme';
import { MealStamp, WorkoutStamp, WeightStamp, Trophy, WeekRow, type WeekDay } from '../components/Stamp';
import { SyncBadge } from '../components/SyncBadge';

const p2 = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

export function Home({ go }: { go: Go }) {
  const { today, data, goal, todayStatus, streak, bestStreak, gap } = useApp();

  const name = (localStorage.getItem('email') || '').split('@')[0] || 'あなた';
  const order: Record<string, number> = { morning: 0, noon: 1, night: 2, snack: 3 };
  const todayMeals = (data.meal_record ?? []).filter((m) => m.date === today).sort((a, b) => (order[a.mealType] ?? 9) - (order[b.mealType] ?? 9));
  const tw = (data.weight_record ?? []).find((w) => w.date === today);
  const sum = todayMeals.reduce(
    (a, m) => ({ kcal: a.kcal + (m.total?.kcal ?? 0), p: a.p + (m.total?.p ?? 0), f: a.f + (m.total?.f ?? 0), c: a.c + (m.total?.c ?? 0) }),
    { kcal: 0, p: 0, f: 0, c: 0 },
  );

  // 各日の柱別達成(食事・運動・体重それぞれ◎か)を3分割リングに使う。
  const dailyMap = new Map((data.daily_achievement ?? []).map((d) => [d.date, d]));
  const dayPillars = (iso: string) => {
    const r = dailyMap.get(iso) as { mealEval?: string; weightEval?: string; workoutEval?: string } | undefined;
    return { meal: r?.mealEval === '◎', workout: r?.workoutEval === '◎', weight: r?.weightEval === '◎' };
  };
  const base = new Date(today + 'T00:00:00');
  const dow = (base.getDay() + 6) % 7;
  const monday = new Date(base);
  monday.setDate(base.getDate() - dow);
  const labels = ['月', '火', '水', '木', '金', '土', '日'];
  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    const iso = fmt(dd);
    return { label: labels[i], ...dayPillars(iso), isToday: iso === today };
  });

  // 朝昼夕の3枠: 記録済 / 食べない / 未。何食入って何が空かを一目で。
  const SLOTS: { mt: MealType; label: string }[] = [
    { mt: 'morning', label: '朝' },
    { mt: 'noon', label: '昼' },
    { mt: 'night', label: '夕' },
  ];
  const slotState = (mt: MealType): 'done' | 'skip' | 'none' => {
    const r = todayMeals.find((m) => m.mealType === mt);
    return !r ? 'none' : r.skipped ? 'skip' : 'done';
  };
  const snackKcal = todayMeals.filter((m) => m.mealType === 'snack').reduce((a, m) => a + (m.total?.kcal ?? 0), 0);
  const mealSub = todayStatus.meal === '◎' ? `${sum.kcal} kcal` : todayStatus.meal === '○' ? '記録あり' : 'まだ';
  const workoutSub = todayStatus.workout === '◎' ? '完了' : todayStatus.workout === '○' ? 'おやすみ' : 'まだ';
  const weightSub = tw ? `${tw.weight} kg` : 'まだ';
  const kcalPct = Math.min(100, (sum.kcal / goal.kcal) * 100);

  return (
    <div style={{ padding: '22px 18px 110px', animation: 'dsPop .3s ease both' }}>
      <div style={{ marginBottom: 12 }}>
        <SyncBadge />
      </div>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.green, letterSpacing: '.04em' }}>{dateLabel(today)}</div>
          <div style={{ fontSize: 25, fontWeight: 800, marginTop: 2 }}>{greeting()}、{name}さん</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', borderRadius: 16, padding: '6px 14px 7px', boxShadow: SH.card }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.faint2 }}>連続</span>
          <Trophy days={streak} size={36} />
          <span style={{ fontSize: 9, fontWeight: 700, color: C.faint, marginTop: -1 }}>日</span>
        </div>
      </div>

      {/* resume banner (F-009) */}
      {gap.gap && (
        <div style={{ background: 'linear-gradient(120% 100% at 0 0,#fff6e6,#fdeecb)', border: '1px solid #f0d99a', borderRadius: 22, padding: '16px 18px', marginBottom: 16, animation: 'dsRise .35s ease both' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#9a6a12' }}>おかえり。また今日から。</div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: '#a9803a', lineHeight: 1.55, marginTop: 4 }}>あいだが空いても大丈夫。1つ記録すればストリークは復活するよ。</div>
          <button onClick={() => go('meal')} style={{ marginTop: 12, background: '#e0a23a', color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: 999, padding: '11px 22px', boxShadow: '0 4px 0 #c0871f' }}>
            今日からはじめる
          </button>
        </div>
      )}

      {/* 3 pillars */}
      <div style={{ background: '#fff', borderRadius: R.card, padding: '20px 18px 22px', boxShadow: SH.cardLg, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>きょうの達成</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.faint }}>タップで記録</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
          <Pillar testid="pill-meal" label="食事" sub={mealSub} active={todayStatus.meal !== 'なし'} color={PILLAR.meal} onClick={() => go('meal')} stamp={<MealStamp slots={SLOTS.map((s) => slotState(s.mt))} achieved={todayStatus.meal === '◎'} deg={-7} />} />
          <Pillar testid="pill-workout" label="運動" sub={workoutSub} active={todayStatus.workout !== 'なし'} color={PILLAR.workout} onClick={() => go('workout')} stamp={<WorkoutStamp state={todayStatus.workout === '◎' ? 'done' : todayStatus.workout === '○' ? 'rest' : 'none'} deg={5} />} />
          <Pillar testid="pill-weight" label="体重" sub={weightSub} active={todayStatus.weight !== 'なし'} color={PILLAR.weight} onClick={() => go('weight')} stamp={<WeightStamp state={todayStatus.weight === '◎' ? 'done' : 'none'} deg={-5} />} />
        </div>

        {todayStatus.allAchieved && (
          <div style={{ marginTop: 18, borderTop: '1px dashed #ece7dd', paddingTop: 18, display: 'flex', alignItems: 'center', gap: 16, animation: 'dsRise .4s ease both' }}>
            <div style={{ width: 78, height: 78, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #e0a23a', background: '#fff', color: '#c0871f', fontFamily: F.stamp, fontWeight: 800, fontSize: 25, lineHeight: 1.05, textAlign: 'center', transform: 'rotate(-6deg)', boxShadow: 'inset 0 0 0 3px #fff,inset 0 0 0 6px #e0a23a,0 0 0 6px #f8ecd2' }}>
              達成
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#c0871f' }}>3つそろった！</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#a9803a', lineHeight: 1.5, marginTop: 3 }}>食事・運動・体重ぜんぶ◎。<br />今日もよくがんばりました。</div>
            </div>
          </div>
        )}
      </div>

      {/* streak week row */}
      <div style={{ background: '#fff', borderRadius: R.card, padding: 18, boxShadow: SH.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>連続記録（ストリーク）</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.faint }}>最長 {bestStreak}日</span>
        </div>
        <WeekRow days={week} />
      </div>

      {/* today kcal */}
      <button onClick={() => go('meal')} style={{ display: 'block', width: '100%', textAlign: 'left', background: '#fff', borderRadius: R.card, padding: 18, boxShadow: SH.card }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>きょうのカロリー</span>
          <span>
            <span style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{sum.kcal}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.faint }}> / {goal.kcal} kcal</span>
          </span>
        </div>
        <div style={{ height: 12, borderRadius: 999, background: '#eef1ec', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#43b378,#1f9d57)', width: `${kcalPct}%` }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <PfcBar k="P" cur={sum.p} goal={goal.p} col={C.green} />
          <PfcBar k="F" cur={sum.f} goal={goal.f} col={C.gold} />
          <PfcBar k="C" cur={sum.c} goal={goal.c} col={C.verm} />
        </div>
        {snackKcal > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, marginTop: 12 }}>
            うち間食 {snackKcal} kcal（達成判定には含みません）
          </div>
        )}
      </button>

      <p style={{ fontSize: 11, fontWeight: 600, color: C.dim, lineHeight: 1.7, marginTop: 16, textAlign: 'center' }}>
        中央の＋ボタン、または上のスタンプから記録できます。
      </p>
    </div>
  );
}

function Pillar({ label, sub, active, color, onClick, testid, stamp }: { label: string; sub: string; active: boolean; color: string; onClick: () => void; testid: string; stamp: ReactNode }) {
  return (
    <button data-testid={testid} onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, width: '33%' }}>
      <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stamp}</div>
      <span style={{ fontSize: 14, fontWeight: 800, color: active ? color : C.faint2 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.faint }}>{sub}</span>
    </button>
  );
}

function PfcBar({ k, cur, goal, col }: { k: string; cur: number; goal: number; col: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: col }}>{k}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: C.faint }}>
          {cur}/{goal}g
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: '#eef1ec', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, background: col, width: `${Math.min(100, goal ? (cur / goal) * 100 : 0)}%` }} />
      </div>
    </div>
  );
}
