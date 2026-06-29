// S-007 設定(F-006/014/015)。目標・通知トグル・バックアップ(エクスポート/インポート)・マスタ入口。
import { useState, type CSSProperties, type ChangeEvent, type ReactNode } from 'react';
import { useApp } from '../../app/store';
import type { Screen } from '../../app/nav';
import { C, R, SH } from '../../theme';
import { PageTitle, SectionLabel } from '../components/ui';
import { SyncBadge } from '../components/SyncBadge';

export function Settings({ go }: { go: (s: Screen) => void }) {
  const { data, goal, weightGoal, setGoal, toggleNotif, exportBackup, importBackup, clearRecords, resetAll, logout, syncNow, notifPermission, requestNotif, fireTestNotif } = useApp();
  const notifs = data.notification_setting ?? [];
  const [editing, setEditing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [g, setG] = useState({ kcal: goal.kcal, p: goal.p, f: goal.f, c: goal.c, weight: weightGoal ?? 0 });

  const onExport = async () => {
    const json = await exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dietsupport-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => importBackup(String(r.result));
    r.readAsText(file);
  };

  const saveGoal = async () => {
    await setGoal({ kcal: g.kcal, p: g.p, f: g.f, c: g.c, weight: g.weight || undefined });
    setEditing(false);
  };

  const onClearRecords = async () => {
    setClearing(true);
    try {
      await clearRecords();
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  const onResetAll = async () => {
    setResetting(true);
    try {
      await resetAll();
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  const numField: CSSProperties = { width: 90, padding: '8px 10px', border: `1.5px solid ${C.line}`, borderRadius: 10, fontSize: 14, textAlign: 'right', fontWeight: 800, color: C.green };

  return (
    <div style={{ padding: '18px 18px 110px', animation: 'dsRise .3s ease both' }}>
      <PageTitle>設定</PageTitle>

      {/* 同期 */}
      <SectionLabel>同期</SectionLabel>
      <div style={{ background: '#fff', borderRadius: R.card2, boxShadow: SH.card, marginBottom: 22, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SyncBadge />
        <button onClick={() => void syncNow()} style={{ fontSize: 12.5, fontWeight: 800, color: C.green }}>
          今すぐ同期
        </button>
      </div>

      {/* 目標 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.faint2 }}>目標</span>
        <button onClick={() => (editing ? saveGoal() : setEditing(true))} style={{ fontSize: 12, fontWeight: 800, color: C.green }}>
          {editing ? '保存' : '編集'}
        </button>
      </div>
      <div style={{ background: '#fff', borderRadius: R.card2, boxShadow: SH.card, marginBottom: 22, overflow: 'hidden' }}>
        <Row label="目標カロリー">
          {editing ? (
            <input style={numField} inputMode="numeric" value={g.kcal} onChange={(e) => setG({ ...g, kcal: Number(e.target.value) || 0 })} />
          ) : (
            <Val>{goal.kcal} kcal</Val>
          )}
        </Row>
        <Row label="目標PFC">
          {editing ? (
            <span style={{ display: 'flex', gap: 6 }}>
              {(['p', 'f', 'c'] as const).map((k) => (
                <input key={k} style={{ ...numField, width: 54 }} inputMode="numeric" value={g[k]} onChange={(e) => setG({ ...g, [k]: Number(e.target.value) || 0 })} />
              ))}
            </span>
          ) : (
            <Val soft>
              P{goal.p}・F{goal.f}・C{goal.c}
            </Val>
          )}
        </Row>
        <Row label="体重目標（任意）" last>
          {editing ? (
            <input style={numField} inputMode="decimal" value={g.weight} onChange={(e) => setG({ ...g, weight: Number(e.target.value) || 0 })} />
          ) : (
            <Val soft>{weightGoal != null ? `${weightGoal.toFixed(1)} kg` : '未設定'}</Val>
          )}
        </Row>
      </div>

      {/* 通知 */}
      <SectionLabel note="（しつこくしません）">リマインド通知</SectionLabel>
      <div style={{ background: '#fff', borderRadius: R.card2, boxShadow: SH.card, marginBottom: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: notifPermission === 'granted' ? C.green : notifPermission === 'denied' ? C.verm : C.faint2 }}>
          {notifPermission === 'granted' ? '通知: 許可済み' : notifPermission === 'denied' ? '通知: ブロック中' : '通知: 未許可'}
        </span>
        {notifPermission === 'granted' ? (
          <button onClick={fireTestNotif} style={{ fontSize: 12, fontWeight: 800, color: C.green, background: C.greenBg, borderRadius: 999, padding: '7px 13px' }}>
            テスト通知
          </button>
        ) : (
          <button onClick={() => void requestNotif()} disabled={notifPermission === 'denied'} style={{ fontSize: 12, fontWeight: 800, color: '#fff', background: notifPermission === 'denied' ? '#cfc9bf' : C.green, borderRadius: 999, padding: '7px 13px' }}>
            通知を許可する
          </button>
        )}
      </div>
      {notifPermission === 'denied' && (
        <p style={{ fontSize: 11, fontWeight: 600, color: C.faint, margin: '0 0 12px', lineHeight: 1.6 }}>
          ブラウザで通知がブロックされています。アドレスバーのサイト設定から許可してください。
        </p>
      )}
      <div style={{ background: '#fff', borderRadius: R.card2, boxShadow: SH.card, marginBottom: 22, overflow: 'hidden' }}>
        {notifs.map((n, i) => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < notifs.length - 1 ? `1px solid ${C.line2}` : 'none' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{n.label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.faint }}>{n.time}</span>
            </span>
            <Toggle on={!!n.enabled} onClick={() => toggleNotif(n.id)} />
          </div>
        ))}
      </div>

      {/* データ */}
      <SectionLabel>データ</SectionLabel>
      <div style={{ background: '#fff', borderRadius: R.card2, boxShadow: SH.card, marginBottom: 22, overflow: 'hidden' }}>
        <button onClick={() => go('master')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '15px 16px', borderBottom: `1px solid ${C.line2}`, textAlign: 'left' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>固定メニュー・種目の管理</span>
          <Chevron />
        </button>
        <button onClick={onExport} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '15px 16px', borderBottom: `1px solid ${C.line2}`, textAlign: 'left' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            バックアップを書き出す
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.faint, marginTop: 2 }}>全記録を JSON で保存（端末内）</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.green, background: C.greenBg, borderRadius: 999, padding: '7px 14px' }}>エクスポート</span>
        </button>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '15px 16px', textAlign: 'left', cursor: 'pointer' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            バックアップから復元
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.faint, marginTop: 2 }}>機種変更・端末故障のとき</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.soft, background: '#f1ede4', borderRadius: 999, padding: '7px 14px' }}>インポート</span>
          <input type="file" accept="application/json" onChange={onImport} style={{ display: 'none' }} />
        </label>
      </div>

      {/* 記録の全削除(危険操作) */}
      <div style={{ background: '#fff', borderRadius: R.card2, boxShadow: SH.card, marginBottom: 22, overflow: 'hidden' }}>
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '15px 16px', textAlign: 'left' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.verm }}>
              記録をすべて削除
              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.faint, marginTop: 2 }}>食事・運動・体重・達成スタンプを消去（固定メニュー/種目・目標は残ります）</span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.verm, background: '#fdecec', borderRadius: 999, padding: '7px 14px' }}>削除</span>
          </button>
        ) : (
          <div style={{ padding: '15px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.verm, margin: '0 0 4px' }}>本当にすべての記録を削除しますか？</p>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: C.faint, margin: '0 0 12px', lineHeight: 1.6 }}>この操作は取り消せません。心配な場合は先に「バックアップを書き出す」で保存してください。</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmClear(false)} disabled={clearing} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 800, color: C.soft, background: '#f1ede4', borderRadius: 12 }}>
                キャンセル
              </button>
              <button onClick={() => void onClearRecords()} disabled={clearing} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 800, color: '#fff', background: clearing ? '#e0a3a0' : C.verm, borderRadius: 12 }}>
                {clearing ? '削除中…' : '削除する'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 全データの初期化(マスタ含む / 最も危険) */}
      <div style={{ background: '#fff', borderRadius: R.card2, boxShadow: SH.card, marginBottom: 22, overflow: 'hidden' }}>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '15px 16px', textAlign: 'left' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.verm }}>
              すべてのデータを初期化
              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.faint, marginTop: 2 }}>記録に加え、固定メニュー・種目・予定・目標・通知も含めて空にします</span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.verm, background: '#fdecec', borderRadius: 999, padding: '7px 14px' }}>初期化</span>
          </button>
        ) : (
          <div style={{ padding: '15px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.verm, margin: '0 0 4px' }}>本当にすべてのデータを初期化しますか？</p>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: C.faint, margin: '0 0 12px', lineHeight: 1.6 }}>固定メニュー・種目・予定・目標・通知設定も含めて消え、まっさらな状態になります。この操作は取り消せません。心配な場合は先に「バックアップを書き出す」で保存してください。</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmReset(false)} disabled={resetting} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 800, color: C.soft, background: '#f1ede4', borderRadius: 12 }}>
                キャンセル
              </button>
              <button onClick={() => void onResetAll()} disabled={resetting} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 800, color: '#fff', background: resetting ? '#e0a3a0' : C.verm, borderRadius: 12 }}>
                {resetting ? '初期化中…' : '初期化する'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PWA 案内 */}
      <div style={{ background: '#eef9f1', border: '1px dashed #b6ddc5', borderRadius: 18, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <span style={{ width: 40, height: 40, flex: 'none', borderRadius: 12, background: C.green, color: '#fff', fontWeight: 900, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PWA</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#3c7a55', lineHeight: 1.5 }}>
          ホーム画面に追加すると、アプリのように起動でき、<b style={{ fontWeight: 800 }}>オフラインでも記録</b>できます。
        </span>
      </div>

      <button onClick={logout} style={{ width: '100%', padding: 14, fontSize: 13.5, fontWeight: 800, color: C.faint2 }}>
        ログアウト
      </button>
    </div>
  );
}

function Row({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px', borderBottom: last ? 'none' : `1px solid ${C.line2}`, minHeight: 54 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      {children}
    </div>
  );
}

function Val({ children, soft }: { children: ReactNode; soft?: boolean }) {
  return <span style={{ fontSize: 14, fontWeight: 800, color: soft ? C.soft : C.green }}>{children}</span>;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 46, height: 28, borderRadius: 999, background: on ? C.green : '#dcd6ca', position: 'relative', flex: 'none', transition: 'background .2s' }} aria-pressed={on}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .2s' }} />
    </button>
  );
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cfc9bf" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10,6 16,12 10,18" />
    </svg>
  );
}
