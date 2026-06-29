// 同期状態インジケータ(F-016 / D-6)。タップで今すぐ同期。ホーム・設定に表示。
import { useApp, type SyncStatus } from '../../app/store';
import { C } from '../../theme';

const STYLE: Record<SyncStatus, { bg: string; fg: string; dot: string; label: string }> = {
  syncing: { bg: '#eef1ec', fg: C.faint2, dot: C.faint, label: '同期中…' },
  synced: { bg: C.greenBg, fg: '#178a4b', dot: C.green, label: '同期済' },
  offline: { bg: '#fdeecb', fg: '#9a6a12', dot: '#e0a23a', label: 'オフライン' },
  error: { bg: '#fde8e4', fg: '#c0392b', dot: '#d6452f', label: '同期エラー' },
  idle: { bg: '#f1ede4', fg: C.faint2, dot: C.dim, label: '未同期' },
};

export function SyncBadge() {
  const { syncStatus, online, syncNow } = useApp();
  const st = STYLE[!online && syncStatus !== 'syncing' ? 'offline' : syncStatus];
  return (
    <button
      data-testid="sync-badge"
      onClick={() => void syncNow()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: st.bg, color: st.fg, fontWeight: 800, fontSize: 11.5, borderRadius: 999, padding: '6px 12px' }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, animation: syncStatus === 'syncing' ? 'dsPop .8s ease infinite alternate' : undefined }} />
      {st.label}
    </button>
  );
}
