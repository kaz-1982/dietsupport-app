// 汎用UIプリミティブ(モックの装飾を共通化)。
import type { CSSProperties, ReactNode } from 'react';
import { C, SH, R } from '../../theme';

export function Card({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  const base: CSSProperties = { background: '#fff', borderRadius: R.card, padding: 18, boxShadow: SH.card };
  if (onClick) {
    return (
      <button onClick={onClick} style={{ ...base, display: 'block', width: '100%', textAlign: 'left', ...style }}>
        {children}
      </button>
    );
  }
  return <div style={{ ...base, ...style }}>{children}</div>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '4px 0 16px' }}>
      <span style={{ fontSize: 22, fontWeight: 800 }}>{children}</span>
    </div>
  );
}

export function SectionLabel({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 800, color: C.faint2, marginBottom: 10 }}>
      {children}
      {note ? <span style={{ fontWeight: 600, color: C.dim }}> {note}</span> : null}
    </div>
  );
}

export function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 16px' }}>
      <button
        onClick={onBack}
        aria-label="戻る"
        style={{ width: 38, height: 38, borderRadius: 12, background: '#fff', boxShadow: SH.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="14,6 8,12 14,18" />
        </svg>
      </button>
      <span style={{ fontSize: 19, fontWeight: 800 }}>{title}</span>
    </div>
  );
}

export function SegTabs<T extends string>({
  options,
  value,
  onChange,
  variant = 'seg',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  variant?: 'seg' | 'pill';
}) {
  const radius = variant === 'pill' ? R.pill : 12;
  return (
    <div style={{ display: 'flex', background: C.line, borderRadius: variant === 'pill' ? R.pill : 14, padding: 4, gap: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        const st: CSSProperties = on
          ? { flex: 1, textAlign: 'center', background: '#fff', color: C.green, fontWeight: 800, fontSize: 13, borderRadius: radius, padding: '9px 0', boxShadow: '0 1px 4px -1px rgba(0,0,0,.18)' }
          : { flex: 1, textAlign: 'center', background: 'transparent', color: C.faint, fontWeight: 700, fontSize: 13, borderRadius: radius, padding: '9px 0' };
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={st}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        background: disabled ? '#e3dfd5' : C.green,
        color: disabled ? '#aaa49a' : '#fff',
        fontWeight: 800,
        fontSize: 16,
        borderRadius: R.btn,
        padding: 16,
        boxShadow: disabled ? 'none' : SH.btn,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
