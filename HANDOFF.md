# DietSupport 実装 — 引き継ぎ(次セッション向け)

> このリポジトリ `DietSupport_app/` は DietSupport(健康記録 PWA)の実装。
> 設計の正本は隣の **`../開発doc作成_v04_DietSupport/`**(ドキュメント生成ハーネス)にある。
> **現在地: HANDOFF §5(5.1〜5.8)を全完了 + サーバーを本番化(SQLite 永続化 / JWT風トークン)まで実装済み。**
> あわせて読む: [DESIGN_DIGEST.md](DESIGN_DIGEST.md)(設計3,000行の要約+現状対応・**最初に読む**)/ [README.md](README.md)

---

## 0. 「正(source of truth)」の優先順位 ★最初に把握

| 領域 | 正とするもの | 置き場所 |
|---|---|---|
| UIの見た目・画面構造・配色・コピー | **Claude Design 製モック** `DietSupport.dc.html` + `support.js` | `../開発doc作成_v04_DietSupport/output/04_画面設計_from_ClaudeDesign/mockups/` |
| 挙動・ロジック・受け入れ条件 | **`tests/`(85件・書き換え禁止)** | `tests/` |
| なぜそうか(根拠) | 設計doc(R-*/B-*/D-*/TS-1) | `../開発doc作成_v04_DietSupport/output/` |

⚠️ モックの `support.js` 内 `confirmMeal()` は `P≥goal.p*0.8` の**簡易デモ判定**で仕様ではない。◎判定の挙動は必ず `tests`/D-7 に従う(下記 §4)。

---

## 1. 現在地(完了済み)

**Phase 4 §5 を全完了 + サーバー本番化。全9画面が動作し、ローカル永続・端末間同期・通知・E2E まで通っている。**

| 区分 | 状態 |
|---|---|
| Domain(評価/集計/ストリーク/ギャップ/競合/日付) | ✅ `src/domain/` |
| Application(記録UseCase原子Tx/Sync/Auth/各Service/Controller/例外) | ✅ `src/application/` |
| Infrastructure(IndexedDB Repo / ApiClient / 通知スケジューラ) | ✅ `src/infrastructure/`(`repository.ts`, `idb.ts`, `apiClient.ts`, `notifications.ts`) |
| アプリStore(DI配線・派生・同期制御・通知制御) | ✅ `src/app/store.tsx` |
| 全9画面 S-001〜S-009 | ✅ `src/ui/screens/`(Home/Meal/Weight/Workout/Dashboard/Calendar/Settings/Master/Login) |
| 記録の閲覧・編集・削除、数量、履歴コピー(実データ)、遡及入力 | ✅ |
| 端末間同期(起動/保存時/オンライン復帰、LWW、論理削除、同期状態UI) | ✅ §5.5 |
| 通知タイマー(設定時刻発火・クリックで記録導線・しつこくしない) | ✅ §5.7(フォアグラウンド) |
| PWA(SW/manifest) | ✅ `vite-plugin-pwa` |
| **サーバー SQLite 永続化 + JWT風ステートレストークン** | ✅ `server/app/sync_server.py`(再起動跨ぎで永続・トークン有効を実証) |
| **本番ハーデニング(CORS env化 / セキュリティヘッダ / 本番JWTガード)** | ✅ §5.A 一部 `server/app/main.py` |
| **認証堅牢化(レート制限の時間窓+恒久ロック解消 / signup サーバー側検証)** | ✅ §5.D 一部 `server/app/sync_server.py` |
| **細部UX(筋トレ予定なし表示 / seed の today 再アンカー / 食事の下書き保持)** | ✅ §5.G 完了 `Workout.tsx`/`seed.ts`/`Meal.tsx` |
| Playwright E2E(AT-* を UI 二重化) | ✅ `e2e/`(8シナリオ) |

**テスト/品質ゲート(現状すべて green):**
- Vitest 66 + pytest 19 = **85 件**(`tests/` 引き渡し物・不変)
- 追加サーバーハーデニング **13 件**(net-new・`tests/unit/server/test_hardening_additive.py`・凍結85とは別物) → pytest 合計 **32 件**
- Playwright E2E **9件**(AT-* 二重化 8 + 追加 UX 回帰 1: `e2e/meal_draft.spec.ts` 食事の下書き保持)
- `tsc -b` 型チェック / `npm run build`(PWA生成)

---

## 2. セットアップ・起動・テスト

```bash
# 依存(初回)
npm install
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
npx playwright install chromium      # E2E用(初回)

# テスト
npm test                              # Vitest 66(Domain/Application/UI/受け入れ)
.venv/bin/pytest                      # pytest 19(サーバーAPI/受け入れ)
npm run test:e2e                      # Playwright 8(webServerが uvicorn+vite を自動起動)
npm run build                         # tsc -b + vite build(PWA)

# 起動(手動)
PYTHONPATH=. .venv/bin/uvicorn server.app.main:app --port 8000   # バックエンド(SQLite: dietsupport.db)
npm run dev                                                       # フロント(HMR) → http://localhost:5173
npm run build && npm run preview                                  # もしくは 本番ビルドをローカル配信(インストール可能なPWA) → http://localhost:4173
```
- シードアカウント: `me@example.com` / `correct-horse`(acct_me)。
- `dev`(:5173)も `preview`(:4173)も Vite が `/api` を `:8000` にプロキシ(`vite.config.ts` の `server.proxy` / `preview.proxy`)。ブラウザからは同一オリジンのため CORS 不要。
- ローカル利用なら公開デプロイは不要(§5.A は外部公開時のみ)。`localhost` は SW/PWAインストール可。
- 環境変数:
  - `DIETSUPPORT_DB`(既定 `dietsupport.db`)
  - `DIETSUPPORT_JWT_SECRET`(**本番必須**・既定は開発用。`DIETSUPPORT_ENV=production` かつ未設定だと**起動拒否**)
  - `DIETSUPPORT_ENV`(既定 `development` / 本番は `production`)
  - `DIETSUPPORT_ALLOWED_ORIGINS`(CORS 許可オリジン・カンマ区切り。既定 `http://localhost:5173`)

---

## 3. アーキテクチャと実ファイル構成

レイヤード + 依存性逆転(D-2 / B-2)。Domain は framework 非依存(純粋関数)。
```
src/
├── theme.ts               デザイントークン(モック由来の配色/フォント/影)
├── domain/                評価・集計・ストリーク・ギャップ・競合・日付(TDDコア)
├── application/           UseCase(原子Tx)/SyncService/AuthService/各Service/Controller/errors
├── infrastructure/        idb.ts(IndexedDBラッパ)/repository.ts(Repo実装・同期表現変換)/
│                          apiClient.ts(fetch/Bearer/X-Device-Id)/notifications.ts(実時刻通知)
├── app/                   store.tsx(中核Store=全配線)/seed.ts(初回サンプル)/date.ts/nav.ts
└── ui/                    App.tsx(認証ゲート+ルーティング+ナビ+シート+トースト)/
                           components/(Stamp,ui,Nav,Chart,CalendarGrid,SyncBadge)/ screens/(9画面)
server/app/                main.py(FastAPI ルート A-001〜005)/ sync_server.py(ServerApi: SQLite+JWT)
e2e/                       helpers.ts + auth/record/views/sync の各 .spec.ts(playwright.config.ts)
tests/                     引き渡しの85件(_stubs は src/server への re-export ブリッジ)
```

**同期の要点(§5.5 実装済み):**
- クライアントは `updatedAt`/`deleted:boolean`、サーバーは `updated_at`/`deleted:0|1`。`repository.ts` の `toServerRow`/`toClientRow` で変換。
- pull→apply は各行に載せた `__table` でストアへルーティング(`SyncService.sync` の `apply` は table 名を受けない契約のため)。
- LWW: サーバーが `updated_at` 比較、クライアント apply は「ローカルが新しければ保持」。pull 後に当日 recompute。
- 同期状態は `SyncBadge`(ホーム/設定)。`store.scheduleSync`(保存時デバウンス)+ online/offline リスナー。

**サーバーの要点(本番化済み):**
- `ServerApi(db_path)`: 既定 `:memory:`(**テストはインスタンス毎に独立**)/ `main.py` は `dietsupport.db`。
- テーブル: `account` と `sync_record(account_id,tbl,id,updated_at,deleted,payload(JSON))`。汎用 payload 保持。
- トークン: **ステートレス署名トークン(JWT風 HS256・stdlib)**。サーバー保存なし → 再起動で失効しない。`logout` は no-op。

---

## 4. ★ TDD の鉄則 / 確定済み設計判断(再確認不要)

- `tests/`(85件)は**設計ハーネスからの引き渡し物。assertion を1行も書き換えない**。仕様変更が要るときは設計ハーネス(`../開発doc作成_v04_DietSupport/`)で D-15/TS-1 を改訂しゲート再通過 → 再取り込み。
- テストは `tests/_stubs/{domain,application}.ts` / `_stubs/server.py` を import(本実装への re-export ブリッジ)。新クラスを足したら re-export 追加。
- **食事◎判定**: `◎ = (kcal≤goal.kcal) ∧ (P≥goal.p) ∧ (F≤goal.f) ∧ (C≤goal.c)`、○=入力済み未達、なし=無入力。運動=予定実行◎/休む○、体重=測定◎。
- **記録確定(D-7 A7)**: 検証 → 原子Tx{ upsert → evaluate → update(dailyAchievement) } → 同期キュー。失敗時ロールバック・入力保持。
- **同期**: 起動/保存時に双方向、競合=LWW(updated_at)、削除=論理削除、冪等、`X-Device-Id`、`/api/v1`、HTTPS。
- **認証**: メール+パスワードの単一アカウント。ハッシュ保管(PBKDF2)、レート制限5回/分、Bearer。`account_id` スコープ外は拒否。
- **テストが固定した2判断**: ストリークは当日未記録を中断にしない(UT-021)。detectGap は履歴なし(新規)では再開導線を出さない(UT-028)。

---

## 5. 残作業(優先順)

### 5.A 本番デプロイ / インフラ(B-17 / B-3 / B-19)— 本番稼働に必須
**✅ このセッションで実装済み(コード側の地ならし):**
- CORS オリジンを env 化(`DIETSUPPORT_ALLOWED_ORIGINS` カンマ区切り・既定 `http://localhost:5173`)。`main.py` のハードコード解消。
- 本番設定ガード: `DIETSUPPORT_ENV=production` かつ `DIETSUPPORT_JWT_SECRET` 未設定なら**起動を拒否**(危険な既定秘密鍵での本番起動を防止)。
- API セキュリティヘッダ(`X-Content-Type-Options: nosniff` / `X-Frame-Options: DENY` / `Referrer-Policy: no-referrer` / `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`)を `main.py` のミドルウェアで付与。
- ✅ **`npm audit` 解消(6→0)**: 原因は `vitest@2.1.9` が引き込む入れ子 `vite@5.4.21`→`esbuild@0.21.5`(esbuild dev-server advisory GHSA-67mh-4wv8-2f99)。**`vitest` と `@vitest/coverage-v8` を `4.1.9` へ更新**して解消(`npm audit` = 0 vulnerabilities)。アプリ本体の `vite@6.4.3` は元から安全な `esbuild@0.25.12` のため**据え置き**(vitest4 の peer が `vite ^6` を許容 → 全 vite が 6.4.3 に dedupe)。`@vitejs/plugin-react@4.7.0` / `vite-plugin-pwa@1.3.0` も変更なし。`vitest.config.ts` の変更も不要。Vitest 66 / build / coverage / pytest 32 / E2E 9 すべて green を再確認。本番ランタイム(FastAPI + ビルド済み静的PWA)は元から非該当。

**⬜ 残(外部/運用判断が要る・コードだけでは閉じない):**
- ホスティング選定と実デプロイ: FastAPI(PaaS/VPS)+ PWA(静的ホスティング/CDN)。
- HTTPS/TLS 終端、本番 `DIETSUPPORT_JWT_SECRET` の実値設定、`DIETSUPPORT_ALLOWED_ORIGINS` に本番ドメイン。
- **フロント(PWA)側 CSP**: 配信ホスト/SW 構成依存(index.html 直書きは SW/インラインを壊しうる)→ デプロイ設定側で付与。
- `dietsupport.db` のバックアップ運用(B-17)。

### 5.B 通知の完全バックグラウンド配信(F-014 / R-NF-009)
- 現状: **アプリ起動中のみ**発火(`notifications.ts` の setTimeout + `new Notification`)。
- 残: アプリを閉じていても届く配信 = **Web Push(VAPID + push server)** または Notification Triggers。
- iOS PWA は `new Notification` 不可 → SW の `showNotification` + `notificationclick` ハンドラが必要。現状 `vite-plugin-pwa` は generateSW のため、カスタム SW ハンドラには **injectManifest へ切替**が要る。

### 5.C F-015 バックアップの形式確定
- 現状: 全テーブルを JSON で export/import(`BackupService`、単純復元)。
- 残: ファイル形式のバージョニング、復元時の競合解決方針(マージ vs 置換)。AT-013 は単純復元前提。

### 5.D 認証の堅牢化(D-13 §7 / B-19)
**✅ このセッションで実装済み:**
- ログイン試行レート制限を**時間窓化**(`LOGIN_FAILURE_WINDOW_SECONDS=60`・「5回/分」)。**旧実装の恒久ロックを解消**(失敗が窓を過ぎると失効し自動解除。再起動を待たず復帰)。
- サインアップの**サーバー側入力検証**(パスワード最小長8 + メール形式)→ `ValidationError` → HTTP 400(VAL-*)。クライアント側のみだった検証をバックストップ。`_stubs/server.py` に `ValidationError` を re-export 追加。

**⬜ 残:**
- トークンのリフレッシュ/ローテーション(現状 30日固定・refresh なし)。クライアント側の対応も要る。
- レート制限の**永続化**(現状なお**プロセス内メモリ**・再起動でリセット。窓ロジックは入れたが永続ストアではない)。
- (任意)パスワード強度を長さ以上に(複雑性要件)。現状は設計の「8文字」に揃えてある。

### 5.E サーバーを型付きスキーマへ(D-8/D-9/D-10)(任意・最適化)
- 現状 `sync_record(payload JSON)` で汎用保持。D-10 の型付きテーブルへ移行すると整合性/クエリが堅くなる。機能は同等。

### 5.F E2E / テスト拡充(任意)
- 現状 E2E は代表8シナリオ。未カバー AT: AT-002/003/004/006/008/009/010/011/012/013/014/017/019/020。
- 特に AT-013(バックアップのDL/UL)、AT-014(通知・フェイクタイマー)、AT-019/020(オフライン/競合のUI)。

### 5.G 細部 UX / 既知の小課題 — ✅ このセッションで完了
- ✅ 筋トレ「今日の予定」: 別曜日プランへのフォールバック(`?? plans[0]`)を撤去(`Workout.tsx`)。予定のない曜日は「予定なし」+空状態カードを表示し、主ボタンを ◎「予定どおり記録する」(予定あり)/ ○「トレーニングを記録する」(予定なし=予定外実行は §5.2 どおり ○)に切替。`store.saveWorkout` を 3 値化(`asPlanned`/`performed`/`rest`)。
- ✅ デモ seed の日付陳腐化: `seed.ts` の履歴生成を `writeDemoHistory()` に共通化し、起動時 `refreshDemoIfStale()` で「純デモ かつ 日付が進んだ」時だけ today 基準に再生成。旧行は**論理削除**して削除を同期伝播し、端末間で復活させない。実記録が1件でもあれば触らない(`hasReal` ガード)。
- ✅ S-002 入力中断時の下書き保持(B-8 §7): 未確定の選択を localStorage に退避し、離脱→再訪で復元(`Meal.tsx`)。確定/削除でクリア・同期しない。初期下書きは同期的に lazy-init して「退避効果が初回の空レンダーで下書きを消す」競合(StrictMode 二重実行)を回避。

検証: 実ブラウザ(preview)で 3 件とも確認(予定なし表示・下書き復元・stale→再アンカーで 9 行 tombstone & 最新日が昨日へ・`hasReal` で実記録は保護)。回帰 E2E `e2e/meal_draft.spec.ts` を追加。
残(任意): no-plan 表示は実機確認のみ(曜日依存で決定性が低く E2E 未追加)。

---

## 6. 既知の注意点 / gotcha

- **旧トークン無効化**: JWT 化したため、既存ブラウザに残る旧ランダムトークンは無効 → 初回のみ再ログインが必要(以後は再起動でも維持)。
- **uvicorn 再起動とトークン**: 旧実装の「再起動でトークン/データ消失」は**解消済み**(SQLite + ステートレス JWT)。
- **E2E の決定性**: token 注入 + `localStorage 'e2e-nosync'`(store.syncNow が参照し自動同期を抑止)。UI要素に最小限の `data-testid`(login-submit / pill-* / meal-tab-* / meal-menu / meal-save / weight-save / sync-badge)。同期E2Eは「A==B の収束」で検証(共有DB汚染に強い)。
- **E2E のサーバー汚染**: `dietsupport.db` は実行ごとに残る。同期E2Eを厳密にしたい時は実行前に `rm -f dietsupport.db`。
- **iOS PWA 通知**は制約あり(§5.B)。ヘッドレス環境は通知 permission=denied で実発火不可(コード/タイミングは検証済み)。

---

## 7. やってはいけないこと
- `tests/` の assertion を書き換えてテストを通す(設計に戻って D-15/TS-1 改訂 → ゲート再通過が正規ルート)。
- `_stubs/*` を未実装スタブに戻す。
- スコープ外(初版 Won't): AI(LLM)アドバイス、運動の消費カロリー算出、栄養データの外部API、写真記録、マルチユーザー/共有(※同一利用者のスマホ・PC併用=マルチデバイス同期は対象内)。

---
*更新(2026-06-26): 本番ハーデニング(§5.A 一部)+認証堅牢化(§5.D 一部)+細部UX(§5.G 完了)を実装。CORS env化 / セキュリティヘッダ / 本番JWTガード / レート制限の時間窓+恒久ロック解消 / signup サーバー側検証 / 筋トレ予定なし表示 / seed の today 再アンカー / 食事の下書き保持。さらに `npm audit` を解消(vitest→4.1.9 / vite6据え置き・0 vulnerabilities)。凍結85+追加13(pytest計32)+E2E9 + build すべて green。残: 5.A の実デプロイ(ホスティング/HTTPS/CDN-CSP/DBバックアップ)・5.B Web Push・5.C バックアップ形式・5.D トークンrefresh/レート制限永続化・(任意)5.E 型付きスキーマ・5.F E2E拡充。*
