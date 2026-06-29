// ボトムナビ + 記録メニューシート(FAB)。モック lines 423-446 を移植。
import type { ReactNode } from 'react';
import { C } from '../../theme';

export type NavTab = 'home' | 'cal' | 'dash' | 'settings';
export type RecordKind = 'meal' | 'weight' | 'workout';

function NavBtn({ color, label, onClick, children }: { color: string; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 60, color }}>
      {children}
      <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

export function BottomNav({ active, onNav, onPlus }: { active: NavTab | string; onNav: (t: NavTab) => void; onPlus: () => void }) {
  const col = (s: string) => (active === s ? C.green : '#bdb7ac');
  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: 'rgba(255,255,255,.94)',
        backdropFilter: 'blur(8px)',
        borderTop: `1px solid ${C.line}`,
        padding: '8px 6px 14px',
        position: 'relative',
      }}
    >
      <NavBtn color={col('home')} label="ホーム" onClick={() => onNav('home')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <polygon points="12,3 21,10.5 3,10.5" fill="currentColor" stroke="none" />
          <rect x="5" y="10" width="14" height="10" rx="2" />
        </svg>
      </NavBtn>
      <NavBtn color={col('cal')} label="カレンダー" onClick={() => onNav('cal')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <line x1="4" y1="9.5" x2="20" y2="9.5" />
          <line x1="8" y1="3" x2="8" y2="6.5" />
          <line x1="16" y1="3" x2="16" y2="6.5" />
        </svg>
      </NavBtn>
      <button onClick={onPlus} aria-label="記録する" style={{ width: 62, display: 'flex', justifyContent: 'center' }}>
        <span
          style={{
            width: 58,
            height: 58,
            marginTop: -26,
            borderRadius: '50%',
            background: 'linear-gradient(150deg,#43b378,#1f9d57)',
            boxShadow: '0 8px 18px -6px rgba(31,157,87,.7),0 0 0 5px #f6f3ec',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </button>
      <NavBtn color={col('dash')} label="推移" onClick={() => onNav('dash')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="6" y1="20" x2="6" y2="13" />
          <line x1="12" y1="20" x2="12" y2="8" />
          <line x1="18" y1="20" x2="18" y2="11" />
        </svg>
      </NavBtn>
      <NavBtn color={col('settings')} label="設定" onClick={() => onNav('settings')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
          <circle cx="9" cy="7" r="2.4" fill="#fff" />
          <circle cx="15" cy="12" r="2.4" fill="#fff" />
          <circle cx="8" cy="17" r="2.4" fill="#fff" />
        </svg>
      </NavBtn>
    </div>
  );
}

function SheetItem({ glyph, title, sub, onClick }: { glyph: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 2px 0 #ece7dd', textAlign: 'left', width: '100%' }}
    >
      <span style={{ width: 44, height: 44, borderRadius: 14, background: C.greenBg, color: C.green, fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {glyph}
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 800 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: C.faint }}>{sub}</span>
      </span>
    </button>
  );
}

export function RecordSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (k: RecordKind) => void }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, background: 'rgba(34,31,28,.4)', zIndex: 30, display: 'flex', alignItems: 'flex-end' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', background: C.bg, borderRadius: '28px 28px 0 0', padding: '20px 18px 26px', animation: 'dsSheet .28s ease both' }}
      >
        <div style={{ width: 38, height: 5, borderRadius: 999, background: '#d8d2c6', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, textAlign: 'center' }}>なにを記録する？</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SheetItem glyph="食" title="食事" sub="固定メニューを1タップ" onClick={() => onPick('meal')} />
          <SheetItem glyph="体" title="体重" sub="起きたら、はかるだけ" onClick={() => onPick('weight')} />
          <SheetItem glyph="筋" title="筋トレ" sub="前回値からコピーできる" onClick={() => onPick('workout')} />
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: 12, padding: 14, fontSize: 14, fontWeight: 800, color: C.faint2 }}>
          とじる
        </button>
      </div>
    </div>
  );
}
