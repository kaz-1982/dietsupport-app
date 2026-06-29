// S-004 筋トレ記録(F-003/005/007)。予定種目を実入力(重量/回数/セット)・前回値コピー・予定どおり◎/休む○。
import { useState, type CSSProperties } from 'react';
import { useApp, type WorkoutEntry, type WorkoutResult } from '../../app/store';
import type { Go } from '../../app/nav';
import { dateLabel } from '../../app/date';
import { C, F, R, SH } from '../../theme';
import { BackHeader } from '../components/ui';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

export function Workout({ go, date }: { go: Go; date?: string }) {
  const { today, data, saveWorkout, deleteWorkout, lastWorkout } = useApp();
  const recordDate = date ?? today;

  const plans = data.workout_plan ?? [];
  const exercises = data.exercise ?? [];
  const label = WD[new Date(recordDate + 'T00:00:00').getDay()];
  // 予定はその曜日に一致するものだけ。別曜日のプランへフォールバックしない(誤表示防止)。
  const plan = plans.find((p) => p.day === label);
  const todayEx = (plan?.ex ?? []).map((id: string) => exercises.find((e) => e.id === id)).filter(Boolean) as any[];
  const hasPlan = todayEx.length > 0;

  const existing = (data.workout_record ?? []).find((w) => w.date === recordDate);

  // 各種目の入力値: 既存記録 → 前回値 → 種目マスタ既定 の順で初期化。
  const initEntry = (ex: any): { w: string; r: string; s: string } => {
    const fromExisting = (existing?.entries ?? []).find((e: WorkoutEntry) => e.exerciseId === ex.id);
    if (fromExisting) return { w: fromExisting.w, r: fromExisting.r, s: fromExisting.s };
    const prev = lastWorkout(ex.id);
    if (prev) return { w: prev.w, r: prev.r, s: prev.s };
    return { w: ex.w ?? '', r: ex.r ?? '', s: ex.s ?? '' };
  };
  const [entries, setEntries] = useState<Record<string, { w: string; r: string; s: string }>>(() =>
    Object.fromEntries(todayEx.map((ex) => [ex.id, initEntry(ex)])),
  );
  const [busy, setBusy] = useState<'done' | 'rest' | null>(null);

  const setField = (id: string, k: 'w' | 'r' | 's', v: string) => setEntries((e) => ({ ...e, [id]: { ...e[id], [k]: v } }));
  const copyPrev = (ex: any) => {
    const prev = lastWorkout(ex.id) ?? { w: ex.w ?? '', r: ex.r ?? '', s: ex.s ?? '' };
    setEntries((e) => ({ ...e, [ex.id]: { w: prev.w, r: prev.r, s: prev.s } }));
  };

  const record = async (result: WorkoutResult) => {
    setBusy(result === 'rest' ? 'rest' : 'done');
    try {
      const arr: WorkoutEntry[] = todayEx.map((ex) => ({ exerciseId: ex.id, ...entries[ex.id] }));
      await saveWorkout(result, recordDate, result === 'asPlanned' && arr.length ? arr : undefined);
      go('home');
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    await deleteWorkout(recordDate);
    go('home');
  };

  return (
    <div style={{ padding: '18px 18px 110px', animation: 'dsRise .3s ease both' }}>
      <BackHeader title={existing ? '筋トレを編集' : '筋トレを記録'} onBack={() => go('home')} />

      {recordDate !== today && (
        <div style={{ background: '#fff3d9', color: '#9a6a12', fontWeight: 800, fontSize: 12.5, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
          {dateLabel(recordDate)} の記録（遡及入力）
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', background: C.green, borderRadius: 999, padding: '5px 13px' }}>{recordDate === today ? '今日の予定' : 'この日の予定'}</span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{plan?.part ?? '予定なし'}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        {todayEx.map((ex) => (
          <div key={ex.id} style={{ background: '#fff', borderRadius: 18, padding: '15px 16px', boxShadow: SH.card }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>
                {ex.name}
                <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, marginLeft: 8 }}>{ex.part}</span>
              </span>
              <button onClick={() => copyPrev(ex)} style={{ fontSize: 11.5, fontWeight: 800, color: C.green, background: C.greenBg, borderRadius: 999, padding: '6px 12px' }}>
                前回値をコピー
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="重量" value={entries[ex.id]?.w ?? ''} unit={ex.wu} onChange={(v) => setField(ex.id, 'w', v)} />
              <Field label="回数" value={entries[ex.id]?.r ?? ''} unit="回" onChange={(v) => setField(ex.id, 'r', v)} />
              <Field label="セット" value={entries[ex.id]?.s ?? ''} unit="" onChange={(v) => setField(ex.id, 's', v)} />
            </div>
            {ex.last && <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginTop: 8 }}>前回： {ex.last}</div>}
          </div>
        ))}
        {todayEx.length === 0 && (
          <div style={{ background: '#fff', border: `1.5px dashed ${C.line}`, borderRadius: 16, padding: 16, fontSize: 12.5, fontWeight: 600, color: C.faint, textAlign: 'center' }}>
            この日の予定はありません。記録すれば○が残せます。
          </div>
        )}
      </div>

      <button onClick={() => record(hasPlan ? 'asPlanned' : 'performed')} disabled={busy !== null} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: C.green, color: '#fff', fontWeight: 800, fontSize: 17, borderRadius: R.btn, padding: 16, boxShadow: SH.btn, marginBottom: 11 }}>
        <span style={{ fontFamily: F.stamp }}>{hasPlan ? '◎' : '○'}</span> {busy === 'done' ? '記録中…' : existing ? '記録を更新する' : hasPlan ? '予定どおり記録する' : 'トレーニングを記録する'}
      </button>
      <button onClick={() => record('rest')} disabled={busy !== null} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#fff', color: C.soft, fontWeight: 800, fontSize: 15, borderRadius: R.btn, padding: 14, boxShadow: SH.card }}>
        <span style={{ fontFamily: F.stamp, color: C.verm }}>○</span> {busy === 'rest' ? '記録中…' : '今日は休む（記録は残す）'}
      </button>
      <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: C.dim, marginTop: 12, lineHeight: 1.6 }}>
        休んでも「0の日」にはなりません。<br />
        ○を残せば、ストリークは続きます。
      </div>

      {existing && (
        <button onClick={remove} style={{ width: '100%', marginTop: 10, padding: 14, fontSize: 13.5, fontWeight: 800, color: C.verm }}>
          この日の筋トレ記録を削除
        </button>
      )}
    </div>
  );
}

function Field({ label, value, unit, onChange }: { label: string; value: string; unit: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1, background: C.bg, borderRadius: 12, padding: '9px 9px 7px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
        <input value={value} onChange={(e) => onChange(e.target.value)} style={fieldInput} />
        {unit && <span style={{ fontSize: 10, color: C.faint }}>{unit}</span>}
      </div>
    </div>
  );
}

const fieldInput: CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  textAlign: 'center',
  fontSize: 16,
  fontWeight: 800,
  color: C.ink,
  padding: 0,
  outline: 'none',
};
