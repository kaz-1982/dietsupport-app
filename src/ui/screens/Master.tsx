// S-008 マスタ管理(F-004/005)。固定メニュー・種目・実施予定の一覧/追加/編集/削除。
import { useState, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '../../app/store';
import type { Go } from '../../app/nav';
import { MEAL_LABEL, type MealType } from '../../app/date';
import { C, SH } from '../../theme';
import { BackHeader, SegTabs, SectionLabel } from '../components/ui';

type Tab = 'menu' | 'ex';

export function Master({ go }: { go: Go }) {
  const { data, saveMaster, deleteMaster } = useApp();
  const [tab, setTab] = useState<Tab>('menu');
  const [editId, setEditId] = useState<string | null>(null);

  const menus = data.fixedMenu ?? [];
  const exercises = data.exercise ?? [];
  const plans = data.workout_plan ?? [];

  return (
    <div style={{ padding: '18px 18px 110px', animation: 'dsRise .3s ease both' }}>
      <BackHeader title="マスタ管理" onBack={() => go('settings')} />

      <div style={{ marginBottom: 18 }}>
        <SegTabs<Tab>
          options={[
            { value: 'menu', label: '食事 固定メニュー' },
            { value: 'ex', label: 'トレーニング種目・予定' },
          ]}
          value={tab}
          onChange={(t) => {
            setTab(t);
            setEditId(null);
          }}
        />
      </div>

      {tab === 'menu' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {menus.map((m) =>
            editId === m.id ? (
              <MenuForm key={m.id} initial={m} onSave={(row) => { saveMaster('fixedMenu', { ...row, id: m.id }); setEditId(null); }} onDelete={() => { deleteMaster('fixedMenu', m.id); setEditId(null); }} onCancel={() => setEditId(null)} />
            ) : (
              <button key={m.id} onClick={() => setEditId(m.id)} style={rowCard}>
                <span style={badge}>{m.kubun ?? MEAL_LABEL[m.mealType as MealType] ?? '—'}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.faint }}>{m.kcal} kcal ・ P{m.p}・F{m.f}・C{m.c}</span>
                </span>
                <Chevron />
              </button>
            ),
          )}
          {editId === 'new' ? (
            <MenuForm onSave={(row) => { saveMaster('fixedMenu', row); setEditId(null); }} onCancel={() => setEditId(null)} />
          ) : (
            <button onClick={() => setEditId('new')} style={addBtn}>＋ 固定メニューを追加</button>
          )}
        </div>
      ) : (
        <div>
          <SectionLabel>種目</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22 }}>
            {exercises.map((e) =>
              editId === e.id ? (
                <ExerciseForm key={e.id} initial={e} onSave={(row) => { saveMaster('exercise', { ...row, id: e.id }); setEditId(null); }} onDelete={() => { deleteMaster('exercise', e.id); setEditId(null); }} onCancel={() => setEditId(null)} />
              ) : (
                <button key={e.id} onClick={() => setEditId(e.id)} style={rowCard}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      {e.name}
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, marginLeft: 8 }}>{e.part}</span>
                    </span>
                    {e.last && <span style={{ fontSize: 11, fontWeight: 600, color: C.dim }}>前回： {e.last}</span>}
                  </span>
                  <Chevron />
                </button>
              ),
            )}
            {editId === 'new' ? (
              <ExerciseForm onSave={(row) => { saveMaster('exercise', row); setEditId(null); }} onCancel={() => setEditId(null)} />
            ) : (
              <button onClick={() => setEditId('new')} style={addBtn}>＋ 種目を追加</button>
            )}
          </div>

          <SectionLabel>実施予定（◎○判定の基準）</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {plans.map((p) =>
              editId === p.id ? (
                <PlanForm key={p.id} initial={p} exercises={exercises} onSave={(row) => { saveMaster('workout_plan', { ...row, id: p.id }); setEditId(null); }} onDelete={() => { deleteMaster('workout_plan', p.id); setEditId(null); }} onCancel={() => setEditId(null)} />
              ) : (
                <button key={p.id} onClick={() => setEditId(p.id)} style={rowCard}>
                  <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, background: '#fff3d9', color: '#c0871f', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.day}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{p.part}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.faint }}>{(p.ex ?? []).map((id: string) => exercises.find((e) => e.id === id)?.name).filter(Boolean).join('・') || '種目なし'}</span>
                  </span>
                  <Chevron />
                </button>
              ),
            )}
            {plans.length === 0 && editId !== 'new-plan' && <div style={{ fontSize: 12, color: C.faint, fontWeight: 600, marginBottom: 6 }}>予定は未登録です。</div>}
            {editId === 'new-plan' ? (
              <PlanForm exercises={exercises} onSave={(row) => { saveMaster('workout_plan', row); setEditId(null); }} onCancel={() => setEditId(null)} />
            ) : (
              <button onClick={() => setEditId('new-plan')} style={addBtn}>＋ 予定を追加</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const rowCard: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 16, padding: '13px 15px', boxShadow: SH.card, width: '100%', textAlign: 'left' };
const badge: CSSProperties = { width: 34, height: 34, flex: 'none', borderRadius: 10, background: C.greenBg, color: C.green, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const addBtn: CSSProperties = { marginTop: 6, border: `2px dashed #c7c1b5`, borderRadius: 16, padding: 15, fontSize: 14, fontWeight: 800, color: C.green, width: '100%', background: 'transparent' };
const field: CSSProperties = { padding: '10px 12px', border: `1.5px solid ${C.line}`, borderRadius: 12, fontSize: 14, width: '100%', background: '#fff' };

function Chevron() {
  return (
    <svg style={{ marginLeft: 'auto', flex: 'none' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cfc9bf" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10,6 16,12 10,18" />
    </svg>
  );
}

function FormShell({ children, onSave, onDelete, onCancel }: { children: ReactNode; onSave: () => void; onDelete?: () => void; onCancel: () => void }) {
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${C.green}`, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
      {children}
      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
        <button onClick={onSave} style={{ flex: 1, background: C.green, color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: 12, padding: 12 }}>保存する</button>
        <button onClick={onCancel} style={{ fontSize: 13, fontWeight: 800, color: C.faint2, padding: '12px 10px' }}>キャンセル</button>
        {onDelete && <button onClick={onDelete} style={{ fontSize: 13, fontWeight: 800, color: C.verm, padding: '12px 6px' }}>削除</button>}
      </div>
    </div>
  );
}

function MenuForm({ initial, onSave, onDelete, onCancel }: { initial?: any; onSave: (row: any) => void; onDelete?: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [mealType, setMealType] = useState<MealType>(initial?.mealType ?? 'morning');
  const [kcal, setKcal] = useState(String(initial?.kcal ?? ''));
  const [p, setP] = useState(String(initial?.p ?? ''));
  const [f, setF] = useState(String(initial?.f ?? ''));
  const [c, setC] = useState(String(initial?.c ?? ''));

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), mealType, kubun: MEAL_LABEL[mealType], kcal: Number(kcal) || 0, p: Number(p) || 0, f: Number(f) || 0, c: Number(c) || 0 });
  };

  return (
    <FormShell onSave={save} onDelete={onDelete} onCancel={onCancel}>
      <input placeholder="メニュー名" value={name} onChange={(e) => setName(e.target.value)} style={field} />
      <SegTabs<MealType>
        options={[
          { value: 'morning', label: '朝' },
          { value: 'noon', label: '昼' },
          { value: 'night', label: '夕' },
          { value: 'snack', label: '間食' },
        ]}
        value={mealType}
        onChange={setMealType}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        <input placeholder="kcal" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} style={field} />
        <input placeholder="P" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} style={field} />
        <input placeholder="F" inputMode="numeric" value={f} onChange={(e) => setF(e.target.value)} style={field} />
        <input placeholder="C" inputMode="numeric" value={c} onChange={(e) => setC(e.target.value)} style={field} />
      </div>
    </FormShell>
  );
}

function ExerciseForm({ initial, onSave, onDelete, onCancel }: { initial?: any; onSave: (row: any) => void; onDelete?: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [part, setPart] = useState(initial?.part ?? '');

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), part: part.trim(), last: initial?.last ?? '' });
  };

  return (
    <FormShell onSave={save} onDelete={onDelete} onCancel={onCancel}>
      <input placeholder="種目名（例：ベンチプレス）" value={name} onChange={(e) => setName(e.target.value)} style={field} />
      <input placeholder="部位（例：胸）" value={part} onChange={(e) => setPart(e.target.value)} style={field} />
    </FormShell>
  );
}

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

// 実施予定フォーム(F-005)。曜日・名称・対象種目(複数選択)を編集。保存値は {day, part, ex[]}。
// day は筋トレ記録(Workout)の曜日マッチ(WD=['日','月',...])と同じ単漢字表記で持つ。
function PlanForm({ initial, exercises, onSave, onDelete, onCancel }: { initial?: any; exercises: any[]; onSave: (row: any) => void; onDelete?: () => void; onCancel: () => void }) {
  const [day, setDay] = useState<string>(initial?.day ?? '月');
  const [part, setPart] = useState(initial?.part ?? '');
  const [ex, setEx] = useState<string[]>(initial?.ex ?? []);

  const toggle = (id: string) => setEx((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const save = () => {
    if (!part.trim()) return;
    onSave({ day, part: part.trim(), ex });
  };

  return (
    <FormShell onSave={save} onDelete={onDelete} onCancel={onCancel}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {WEEKDAYS.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            style={{ width: 36, height: 36, flex: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, border: day === d ? `1.5px solid ${C.green}` : `1.5px solid ${C.line}`, background: day === d ? C.greenBg : '#fff', color: day === d ? C.green : C.soft }}
          >
            {d}
          </button>
        ))}
      </div>
      <input placeholder="名称（例：胸の日）" value={part} onChange={(e) => setPart(e.target.value)} style={field} />
      <div style={{ fontSize: 11, fontWeight: 700, color: C.faint2, marginTop: 2 }}>対象の種目を選ぶ</div>
      {exercises.length === 0 ? (
        <div style={{ fontSize: 12, fontWeight: 600, color: C.faint }}>先に種目を追加してください。</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {exercises.map((e) => {
            const on = ex.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => toggle(e.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, padding: '10px 12px', textAlign: 'left', border: on ? `1.5px solid ${C.green}` : `1.5px solid ${C.line}`, background: on ? C.greenBg : '#fff' }}
              >
                <span style={{ width: 20, height: 20, flex: 'none', borderRadius: 6, border: on ? `none` : `1.5px solid ${C.dim}`, background: on ? C.green : '#fff', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on ? '✓' : ''}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {e.name}
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, marginLeft: 8 }}>{e.part}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </FormShell>
  );
}
