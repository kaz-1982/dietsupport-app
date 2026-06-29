// S-002 食事記録(F-002/004/007)。固定メニュー1タップ・数量・履歴コピー・外食手入力・◎○事前判定。
// 編集: 既存の記録があれば選択状態を復元。遡及: date 指定でその日に記録。
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useApp, type MealRefs } from '../../app/store';
import type { Go } from '../../app/nav';
import { uuid } from '../../app/uuid';
import { MEAL_LABEL, MEAL_NOUN, isSnack, defaultMealType, dateLabel, type MealType } from '../../app/date';
import { MealFormController } from '../../application';
import { aggregate } from '../../domain';
import type { MealItem } from '../../domain';
import { C, R, SH } from '../../theme';
import { BackHeader, SectionLabel } from '../components/ui';

const controller = new MealFormController();

interface Manual {
  id: string;
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
}

// 入力中断時の下書き保持(B-8 §7)。未確定の選択を localStorage に退避し、戻ったら復元する。
// 確定済み記録(refs)とは別物。確定/削除でクリア。ローカルのみ(同期しない)。
const draftKey = (date: string, mealType: string) => `meal-draft:${date}:${mealType}`;
function loadDraft(date: string, mealType: string): MealRefs | undefined {
  try {
    const raw = localStorage.getItem(draftKey(date, mealType));
    return raw ? (JSON.parse(raw) as MealRefs) : undefined;
  } catch {
    return undefined;
  }
}
function saveDraft(date: string, mealType: string, refs: MealRefs): void {
  try {
    localStorage.setItem(draftKey(date, mealType), JSON.stringify(refs));
  } catch {
    /* ストレージ不可でも入力自体は継続できる */
  }
}
function clearDraft(date: string, mealType: string): void {
  try {
    localStorage.removeItem(draftKey(date, mealType));
  } catch {
    /* no-op */
  }
}

export function Meal({ go, date, initialMealType }: { go: Go; date?: string; initialMealType?: MealType }) {
  const { today, data, goal, saveMeal, skipMeal, deleteMeal, getMealRefs } = useApp();
  const recordDate = date ?? today;
  const [mealType, setMealType] = useState<MealType>(initialMealType ?? defaultMealType());
  // 初期下書きを同期的に復元(最初のレンダーから反映)。確定済み記録があれば下の復元効果が上書きする。
  // これにより「初回レンダーは空 → 退避効果が下書きを消す」競合(StrictMode の二重実行含む)を避ける。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialDraft = useMemo(() => loadDraft(recordDate, initialMealType ?? defaultMealType()), []);
  const [sel, setSel] = useState<Record<string, boolean>>(() => Object.fromEntries((initialDraft?.ids ?? []).map((id) => [id, true])));
  const [qty, setQty] = useState<Record<string, number>>(() => initialDraft?.qty ?? {});
  const [manual, setManual] = useState<Manual[]>(() => (initialDraft?.manual as Manual[]) ?? []);
  const [showManual, setShowManual] = useState(false);
  const [busy, setBusy] = useState(false);

  // 区分/対象日が変わるたびに状態を復元: 確定済み記録 > 未確定の下書き > 空。
  useEffect(() => {
    const source = getMealRefs(mealType, recordDate) ?? loadDraft(recordDate, mealType);
    setSel(Object.fromEntries((source?.ids ?? []).map((id) => [id, true])));
    setManual(source?.manual ?? []);
    setQty(source?.qty ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealType, recordDate]);

  const menus = (data.fixedMenu ?? []).filter((m) => m.mealType === mealType);
  const eat = data.eating_out_item ?? [];
  const all = [...(data.fixedMenu ?? []), ...eat];
  const existing = (data.meal_record ?? []).find((m) => m.date === recordDate && m.mealType === mealType);
  const existingSkipped = existing?.skipped === true;

  // 未確定の入力を下書きとして保持(確定済み記録があるスロットは記録が正なので退避しない)。
  useEffect(() => {
    if (existing) return;
    const hasContent = Object.values(sel).some(Boolean) || manual.length > 0;
    if (hasContent) {
      saveDraft(recordDate, mealType, { ids: all.filter((m) => sel[m.id]).map((m) => m.id), manual, qty });
    } else {
      clearDraft(recordDate, mealType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, qty, manual, existing, mealType, recordDate]);

  const items: MealItem[] = useMemo(() => {
    const picked = all.filter((m) => sel[m.id]).map((m) => ({ kcal: m.kcal, p: m.p, f: m.f, c: m.c, qty: qty[m.id] ?? 1 }));
    const man = manual.map((m) => ({ kcal: m.kcal, p: m.p, f: m.f, c: m.c, qty: 1 }));
    return [...picked, ...man];
  }, [sel, qty, manual, data]);

  const total = aggregate(items);
  const count = items.length;
  const preview = controller.previewEval(items, goal);
  const snack = isSnack(mealType);
  const evLabel = count === 0
    ? 'メニューを選ぶと自動集計'
    : snack
      ? 'カロリー・PFC に加算します（達成判定には含みません）'
      : preview === '◎'
        ? 'この内容なら ◎（目標クリア）'
        : 'この内容なら ○（記録）';

  const toggle = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const setItemQty = (id: string, n: number) => setQty((q) => ({ ...q, [id]: Math.max(1, n) }));

  // 履歴コピー: 同区分の直近記録(refs)を復元。無ければ定番メニューで代用。
  const lastRefs = useMemo<MealRefs | undefined>(() => {
    const prev = (data.meal_record ?? [])
      .filter((m) => m.mealType === mealType && m.date !== recordDate && m.refs)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return prev?.refs;
  }, [data, mealType, recordDate]);

  const applyRefs = (refs: MealRefs) => {
    setSel(Object.fromEntries((refs.ids ?? []).map((id) => [id, true])));
    setManual(refs.manual ?? []);
    setQty(refs.qty ?? {});
  };
  const histChips = [
    lastRefs
      ? { key: 'prev', title: `前回の${MEAL_NOUN[mealType]}をコピー`, sub: '直近の記録から', apply: () => applyRefs(lastRefs) }
      : menus[0]
        ? { key: 'std', title: `${MEAL_NOUN[mealType]}の定番`, sub: menus[0].name, apply: () => setSel((s) => ({ ...s, [menus[0].id]: true })) }
        : null,
    menus[1] ? { key: 'std2', title: 'よく食べる組合せ', sub: menus[1].name, apply: () => setSel((s) => ({ ...s, [menus[1].id]: true })) } : null,
  ].filter(Boolean) as { key: string; title: string; sub: string; apply: () => void }[];

  const confirm = async () => {
    if (count === 0) return;
    setBusy(true);
    try {
      const refs: MealRefs = { ids: all.filter((m) => sel[m.id]).map((m) => m.id), manual, qty };
      await saveMeal(mealType, items, recordDate, refs);
      clearDraft(recordDate, mealType); // 確定したら下書きは破棄
      go('home');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await deleteMeal(mealType, recordDate);
    clearDraft(recordDate, mealType);
    go('home');
  };

  // 「食べない」: この区分を0kcalの意図的記録にする(2食の日などをクリアに)。
  const skip = async () => {
    setBusy(true);
    try {
      await skipMeal(mealType, recordDate);
      clearDraft(recordDate, mealType);
      go('home');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'dsRise .3s ease both' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 18px' }}>
        <BackHeader title={existing ? '食事を編集' : '食事を記録'} onBack={() => go('home')} />

        {recordDate !== today && (
          <div style={{ background: '#fff3d9', color: '#9a6a12', fontWeight: 800, fontSize: 12.5, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
            {dateLabel(recordDate)} の記録（遡及入力）
          </div>
        )}

        {existingSkipped && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f1ede4', color: C.faint2, fontWeight: 800, fontSize: 12.5, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
            <span style={{ fontSize: 15 }}>🍽️</span>
            <span style={{ flex: 1 }}>この区分は「食べない」にしています（継続はキープ）</span>
            <button onClick={remove} style={{ fontWeight: 800, fontSize: 12, color: C.green }}>取り消す</button>
          </div>
        )}

        {/* 区分タブ */}
        <div style={{ display: 'flex', background: C.line, borderRadius: 999, padding: 4, gap: 3, marginBottom: 18 }}>
          {(['morning', 'noon', 'night', 'snack'] as MealType[]).map((mt) => {
            const on = mt === mealType;
            const rec = (data.meal_record ?? []).find((m) => m.date === recordDate && m.mealType === mt);
            const has = !!rec;
            const skipped = rec?.skipped === true;
            return (
              <button
                key={mt}
                data-testid={`meal-tab-${mt}`}
                onClick={() => setMealType(mt)}
                style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 999, fontWeight: 800, fontSize: 13.5, background: on ? '#fff' : 'transparent', color: on ? C.green : C.faint, boxShadow: on ? '0 1px 4px -1px rgba(0,0,0,.18)' : 'none', position: 'relative' }}
              >
                {MEAL_LABEL[mt]}
                {has && <span style={{ position: 'absolute', top: 6, right: 10, width: 6, height: 6, borderRadius: '50%', background: skipped ? C.dim : C.verm }} />}
              </button>
            );
          })}
        </div>

        {histChips.length > 0 && (
          <>
            <SectionLabel>ワンタップで複製（履歴コピー）</SectionLabel>
            <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
              {histChips.map((h) => (
                <button key={h.key} onClick={h.apply} style={{ flex: 1, textAlign: 'left', background: 'linear-gradient(140% 120% at 0 0,#eef9f1,#e0f2e6)', border: '1.5px solid #c7e8d3', borderRadius: 18, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#178a4b', lineHeight: 1.3 }}>{h.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#5a8a6c', marginTop: 5 }}>{h.sub}</div>
                </button>
              ))}
            </div>
          </>
        )}

        <SectionLabel>固定メニュー（1タップで追加）</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22 }}>
          {menus.map((m) => (
            <ItemRow key={m.id} testid="meal-menu" on={!!sel[m.id]} name={m.name} meta={`${m.kcal} kcal ・ P${m.p} F${m.f} C${m.c}`} qty={qty[m.id] ?? 1} onToggle={() => toggle(m.id)} onQty={(n) => setItemQty(m.id, n)} />
          ))}
          {menus.length === 0 && <Empty>この区分の固定メニューは未登録です（設定→マスタ管理で追加）</Empty>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: C.faint2 }}>外食・コンビニ</span>
          <button onClick={() => setShowManual((v) => !v)} style={{ fontSize: 12, fontWeight: 800, color: C.green }}>
            ＋ 手入力
          </button>
        </div>

        {showManual && <ManualForm onAdd={(m) => { setManual((list) => [...list, m]); setShowManual(false); }} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {eat.map((m) => (
            <ItemRow key={m.id} on={!!sel[m.id]} name={m.name} meta={`${m.category ?? ''} ・ ${m.kcal} kcal`} qty={qty[m.id] ?? 1} onToggle={() => toggle(m.id)} onQty={(n) => setItemQty(m.id, n)} />
          ))}
          {manual.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eef9f1', border: `1.5px solid ${C.green}`, borderRadius: 16, padding: '13px 14px' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700 }}>{m.name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.faint }}>手入力 ・ {m.kcal} kcal</span>
              </span>
              <button onClick={() => setManual((list) => list.filter((x) => x.id !== m.id))} style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', background: '#f1ede4', color: C.faint, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {existing && (
          <button onClick={remove} style={{ width: '100%', marginTop: 22, padding: 14, fontSize: 13.5, fontWeight: 800, color: C.verm }}>
            この食事の記録を削除
          </button>
        )}
      </div>

      {/* bottom action bar */}
      <div style={{ background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(6px)', borderTop: `1px solid ${C.line}`, padding: '14px 18px', boxShadow: '0 -8px 24px -16px rgba(60,50,30,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.faint2 }}>
            {snack ? '間食' : `${MEAL_LABEL[mealType]}ごはん`} ・ {count}品
          </span>
          <span>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.green }}>{total.kcal}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.faint }}>
              {' '}
              / {goal.kcal} kcal　P{total.p} F{total.f} C{total.c}
            </span>
          </span>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#c0871f', marginBottom: 10 }}>{evLabel}</div>
        <button
          onClick={confirm}
          data-testid="meal-save"
          disabled={count === 0 || busy}
          style={{ width: '100%', background: count === 0 ? '#e3dfd5' : C.green, color: count === 0 ? '#aaa49a' : '#fff', fontWeight: 800, fontSize: 16, borderRadius: R.btn, padding: 16, boxShadow: count === 0 ? 'none' : SH.btn }}
        >
          {busy ? '記録中…' : existing ? '記録を更新する' : '記録する'}
        </button>
        {count === 0 && !existingSkipped && !snack && (
          <button
            onClick={skip}
            data-testid="meal-skip"
            disabled={busy}
            style={{ width: '100%', marginTop: 8, background: 'transparent', color: C.faint2, fontWeight: 800, fontSize: 13.5, padding: '12px 0' }}
          >
            この{MEAL_LABEL[mealType]}は食べない（記録なしでクリア）
          </button>
        )}
        {snack && count === 0 && (
          <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: C.faint, textAlign: 'center', lineHeight: 1.6 }}>
            間食は任意の記録です。入れても入れなくても達成には影響しません。
          </div>
        )}
      </div>
    </div>
  );
}

function ItemRow({ on, name, meta, qty, onToggle, onQty, testid }: { on: boolean; name: string; meta: string; qty: number; onToggle: () => void; onQty: (n: number) => void; testid?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: on ? '#eef9f1' : '#fff', border: on ? `1.5px solid ${C.green}` : `1.5px solid ${C.line}`, borderRadius: 16, padding: '13px 14px' }}>
      <button data-testid={testid} onClick={onToggle} style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, background: 'transparent' }}>
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{name}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.faint }}>{meta}</span>
      </button>
      {on ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <button onClick={() => onQty(qty - 1)} style={qtyBtn}>−</button>
          <span style={{ fontSize: 14, fontWeight: 800, minWidth: 28, textAlign: 'center' }}>×{qty}</span>
          <button onClick={() => onQty(qty + 1)} style={qtyBtn}>＋</button>
        </div>
      ) : (
        <button onClick={onToggle} style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', background: '#f1ede4', color: C.dim, fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ＋
        </button>
      )}
    </div>
  );
}

const qtyBtn: CSSProperties = { width: 30, height: 30, borderRadius: '50%', background: '#fff', color: C.green, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px -1px rgba(0,0,0,.3)' };

function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: '#fff', border: `1.5px dashed ${C.line}`, borderRadius: 16, padding: 16, fontSize: 12, fontWeight: 600, color: C.faint, textAlign: 'center' }}>
      {children}
    </div>
  );
}

function ManualForm({ onAdd }: { onAdd: (m: Manual) => void }) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [f, setF] = useState('');
  const [c, setC] = useState('');
  const [err, setErr] = useState<string>();
  const field: CSSProperties = { padding: '10px 12px', border: `1.5px solid ${C.line}`, borderRadius: 12, fontSize: 14, width: '100%', background: '#fff' };

  const add = () => {
    const entry = { name: name.trim() || '手入力', kcal: Number(kcal) || 0, p: Number(p) || 0, f: Number(f) || 0, c: Number(c) || 0 };
    const v = controller.validateManualEntry(entry); // VAL-002
    if (!v.ok) return setErr(v.message);
    onAdd({ id: uuid(), ...entry });
  };

  return (
    <div style={{ background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 16, padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <input placeholder="品名" value={name} onChange={(e) => setName(e.target.value)} style={field} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        <input placeholder="kcal" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} style={field} />
        <input placeholder="P" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} style={field} />
        <input placeholder="F" inputMode="numeric" value={f} onChange={(e) => setF(e.target.value)} style={field} />
        <input placeholder="C" inputMode="numeric" value={c} onChange={(e) => setC(e.target.value)} style={field} />
      </div>
      {err && <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 700 }}>{err}</span>}
      <button onClick={add} style={{ background: C.green, color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: 12, padding: 12 }}>
        追加する
      </button>
    </div>
  );
}
