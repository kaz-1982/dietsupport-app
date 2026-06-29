// アプリのシェル: 認証ゲート(S-009) → 画面ルーティング(S-001〜S-008) + ボトムナビ + 記録シート + トースト。
import { useEffect, useState, type ReactNode } from 'react';
import { AppProvider, useApp } from '../app/store';
import type { Screen, Go, GoOpts } from '../app/nav';
import type { MealType } from '../app/date';
import { APP_BG, C } from '../theme';
import { setNotifNavHandler } from '../infrastructure/notifications';
import { BottomNav, RecordSheet, type NavTab, type RecordKind } from './components/Nav';
import { Login } from './screens/Login';
import { Home } from './screens/Home';
import { Meal } from './screens/Meal';
import { Weight } from './screens/Weight';
import { Workout } from './screens/Workout';
import { Dashboard } from './screens/Dashboard';
import { Calendar } from './screens/Calendar';
import { Settings } from './screens/Settings';
import { Master } from './screens/Master';

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

// 端末枠を模した中央寄せの縦カラム(スマホ主対象 / PCでは中央に1カラム)。
function Outer({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: APP_BG, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          height: '100dvh',
          background: C.bg,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(60,50,30,.06)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Shell() {
  const { ready, session, syncNow } = useApp();

  useEffect(() => {
    if (ready && session) void syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session?.token]);

  if (!ready) {
    return (
      <Outer>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, fontWeight: 800, fontSize: 18 }}>
          DietSupport
        </div>
      </Outer>
    );
  }

  if (!session) {
    return (
      <Outer>
        <Login />
      </Outer>
    );
  }

  return <AuthedApp />;
}

function AuthedApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [opts, setOpts] = useState<GoOpts>({});
  const [sheet, setSheet] = useState(false);

  const go: Go = (s, o) => {
    setScreen(s);
    setOpts(o ?? {});
    setSheet(false);
  };
  const onPick = (k: RecordKind) => go(k === 'meal' ? 'meal' : k === 'weight' ? 'weight' : 'workout');

  // 通知タップ → 対応する記録画面へ(F-014)
  useEffect(() => {
    setNotifNavHandler((type) => {
      if (type === 'weight') go('weight');
      else go('meal', { mealType: type === 'breakfast' ? 'morning' : type === 'lunch' ? 'noon' : 'night' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navTab: NavTab | '' =
    screen === 'home' ? 'home' : screen === 'cal' ? 'cal' : screen === 'dash' ? 'dash' : screen === 'settings' ? 'settings' : '';

  // 画面+対象日でキー付けし、遷移ごとにスクロール位置と内部状態をリセット。
  const key = `${screen}:${opts.date ?? ''}:${opts.mealType ?? ''}`;

  return (
    <Outer>
      <div key={key} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {renderScreen(screen, go, opts)}
      </div>
      <BottomNav active={navTab} onNav={go} onPlus={() => setSheet(true)} />
      <RecordSheet open={sheet} onClose={() => setSheet(false)} onPick={onPick} />
      <Toast />
    </Outer>
  );
}

function renderScreen(screen: Screen, go: Go, opts: GoOpts) {
  switch (screen) {
    case 'home':
      return <Home go={go} />;
    case 'meal':
      return <Meal go={go} date={opts.date} initialMealType={opts.mealType as MealType | undefined} />;
    case 'weight':
      return <Weight go={go} date={opts.date} />;
    case 'workout':
      return <Workout go={go} date={opts.date} />;
    case 'dash':
      return <Dashboard />;
    case 'cal':
      return <Calendar go={go} />;
    case 'settings':
      return <Settings go={go} />;
    case 'master':
      return <Master go={go} />;
  }
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 92, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 50 }}>
      <div
        style={{
          background: 'rgba(34,31,28,.92)',
          color: '#fff',
          fontWeight: 800,
          fontSize: 13.5,
          padding: '12px 20px',
          borderRadius: 999,
          boxShadow: '0 8px 24px -8px rgba(0,0,0,.5)',
          animation: 'dsRise .25s ease both',
          maxWidth: '88%',
          textAlign: 'center',
        }}
      >
        {toast}
      </div>
    </div>
  );
}
