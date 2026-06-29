# DESIGN_DIGEST — DietSupport 設計ダイジェスト

> 設計書一式（`../開発doc作成_v04_DietSupport/output/`、約3,000行）を工程順に読み、**実装に必要な要点 + 現状コードとの対応**を1枚に圧縮したもの。
> 人間が全体像を掴むため／実装者(Claude)が判断の根拠を引くための索引を兼ねる。詳細が要るときは各章末の「出典」から原本へ。
> 作成: 2026-06-25。

---

## 0. このドキュメントの位置づけと「正(source of truth)」の優先順位

実装中に判断が割れたら、**領域ごとに以下を正とする**:

| 領域 | 正(canonical) | 置き場所 |
|---|---|---|
| **UIの見た目・画面構造・配色・コピー** | **Claude Design 製モック** `DietSupport.dc.html` + `support.js` | `04_画面設計_from_ClaudeDesign/mockups/` |
| **挙動・ロジック・受け入れ条件** | **`tests/`（引き渡しテスト85件・書き換え禁止）** | `DietSupport_app/tests/` |
| **設計の根拠・なぜそうなのか** | 設計doc（R-*/B-*/D-*/TS-1） | `../開発doc作成_v04_DietSupport/output/` |

⚠️ **罠**: モックの `support.js` 内 `confirmMeal()` は `p >= goal.p*0.8` という**簡易デモ判定**で、これは仕様ではない。◎判定の挙動は必ず §5（D-7 / テスト）に従う。モックは「絵」として正、ロジックは別。

---

## 1. プロダクト概要（何を・なぜ・誰に）

- **何を**: 食事・運動・体重の「3本柱」を“ラクに続けられる”個人向け健康記録 **PWA**。
- **誰に**: 利用者本人**1名のみ**（自分専用 / マルチユーザーではない）。スマホ・PCを併用。
- **なぜ**: ダイエット記録が続かない。特に食事は「固定メニューで“同じだから”と怠る」「毎回ゼロから入力が面倒」で途切れる。体重測定だけは続いている。過去の自作アプリが「使いづらく続かなかった」反省から、**継続性(使用性)を最重視**。
- **中心コンセプト**: **「0の日をなくす」**。完璧(◎)でなくても、入力さえすれば最低 ○ が付き、ストリーク(連続記録)が途切れない。例外日も残し、抜けたら**責めずに**再開導線を出す。
- **施策 T1〜T6**: T1 食事1タップ記録 / T2 3本柱を1画面集約 / T3 習慣化+リマインド / T4 統合ダッシュボード / T5 ◎○カレンダー+ストリーク+3つ揃い / T6 0の日をなくす+再開導線。

**出典**: PR-1, P-3, R-1 / 用語: R-13。

---

## 2. スコープ（初版）

**やる（F-001〜F-017）**: 体重記録・食事記録(固定メニュー/履歴コピー/外食手入力)・筋トレ記録・各マスタ管理・目標設定・◎○評価・ストリーク・再開支援・統合ダッシュボード・カレンダー・達成アイコン・ホーム集約・リマインド通知・バックアップ(JSON)・**端末間同期**・**認証**。

**やらない（Won't・重要）**:
- 運動の**消費カロリー算出**
- **AI(LLM)アドバイス**（将来拡張。拡張点だけ用意）
- **栄養データの外部API**（自前マスタ＋手入力で運用）
- **写真による食事記録**
- **複数ユーザー/共有**（※同一人物のスマホ・PC併用＝マルチデバイス同期は対象**内**）
- データ移行・定型帳票出力・サーバー定期バッチ（通知はクライアントのローカル通知）

**出典**: R-8, R-9, B-6。

---

## 3. 全体アーキテクチャ

### 3.1 構成（ローカルファースト + サーバー同期のハイブリッド）
- **データ正本 = サーバー SQLite**。各端末 = **IndexedDB**（ローカルキャッシュ / オフラインバッファ）。
- オフラインでも記録・閲覧・評価が完結（ローカル即時）。同期はバックグラウンドで起動時・保存時に自動。
- 通知 = **クライアント Service Worker のローカル通知**（サーバー定期処理なし）。

### 3.2 レイヤード + 依存性逆転（鉄則）
```
Presentation (src/ui, React)
   └─→ Application (src/application: UseCase / Service / Controller)
          └─→ Domain (src/domain: 純粋関数。どこにも依存しない)
Infrastructure (src/infrastructure: ApiClient / 今後 IndexedDB Repo) が Domain の契約を実装し注入される
Server (server/app: FastAPI → ServerApi)
```
- **Domain は framework 非依存**（application/infra/ui を import しない）。純粋・決定的・副作用なし。
- UseCase / Service は Repository・ApiClient を**コンストラクタ注入**で受ける（テストはモック差し替え）。
- 技術: React+TS+Vite(PWA) / Vitest+Playwright。Python+FastAPI / pytest+httpx。グラフは Recharts か Chart.js。

**出典**: B-1, B-2, B-3, profile §5。

---

## 4. 画面（★モックを正とする）

### 4.1 画面一覧（S-001〜S-009）
| ID | 画面 | 区分 | 主な機能 | モック有無 |
|---|---|---|---|---|
| **S-001** | ホーム | 起動/メイン | 今日の◎○・3つ揃い・ストリーク・週内スタンプ・カロリー進捗・再開導線 | ✅ |
| **S-002** | 食事記録 | 記録 | 区分(朝昼夕)・履歴コピー・固定メニュー・外食/手入力・集計サマリ・◎○事前判定 | ✅ |
| **S-003** | 体重記録 | 記録 | ±0.1kgステッパー・目標差分・推移グラフ・測定=◎ | ✅ |
| **S-004** | 筋トレ記録 | 記録 | 今日の予定・前回値コピー・予定どおり◎/休む○ | ✅ |
| **S-005** | 統合ダッシュボード | 閲覧 | 体重折れ線＋運動日マーカー＋目標線・期間トグル(週/月/3ヶ月)・統計 | ✅ |
| **S-006** | ◎○カレンダー | 閲覧 | 月グリッドに日別◎○/達/なし・ストリーク/最長・凡例 | ✅ |
| **S-007** | 設定 | 設定 | 目標・通知トグル・バックアップ(エクスポート/インポート)・PWA案内・マスタ入口 | ✅ |
| **S-008** | マスタ管理 | マスタ | 固定メニュー / 種目・予定 のタブ編集 | ✅ |
| **S-009** | ログイン/サインアップ | 認証 | メール+パスワード・モード切替 | ❌ **モックなし**（2026-06-24 ハーネス追補。**デザイン最小限**で可） |

### 4.2 ナビゲーション
- **ボトムナビ（全画面常設）**: ［ホーム］［カレンダー］［＋(FABシート)］［推移］［設定］。
- **FAB「＋」** → アクションシート「なにを記録する？」→ 食事/体重/筋トレ へ。
- **最短記録**: ホームのスタンプ直タップ or FABシートで 1〜3タップ。記録確定後は S-001 へ戻り◎○即時反映(1秒以内)。
- **認証ゲート**: 未ログインは S-009 のみ。ログイン済みは S-001 起動。オフラインはキャッシュ済セッションで起動。

### 4.3 ビジュアル仕様（モックから抽出 — UIの正）
- **配色**: 背景 クリーム `#f6f3ec`/`#f3efe6`、上部グラデ `#eaf6ee→#efe9dd`。主色 緑 `#1f9d57`/`#43b378`。スタンプ朱 `#d6452f`。達成・3つ揃い 金 `#c0871f`/`#e0a23a`、淡金地 `#f8ecd2`。サブ文字 `#a9a39a`/`#8a857c`。カード白 + 影 `0 2px 0 #ece7dd`。
- **フォント**: UI＝`M PLUS Rounded 1c`（丸ゴ, 700-900多用）。**◎○達のスタンプ＝`Shippori Mincho B1`（明朝）** で回転させハンコ風。
- **スタンプ表現**: 84px円。◎＝二重リング太字、○＝同系、**なし＝点線リングに「未」**。3つ揃い＝金「達」バッジ + 「3つそろった！」。
- **角丸**: カード 26px、ボタン 16-18px、ピル 999px。**端末枠**: 幅420px・高880px・角丸40px（スマホ主対象）。
- **トーン&コピー**: 終始やさしい。再開バナー例「おかえり。また今日から。」「2日あいたけど大丈夫。1つ記録すればストリークは復活するよ。」 休む例「休んでも『0の日』にはなりません。」

### 4.4 サンプルデータ（モック内 = シード/デモの素データに流用可）
- 固定メニュー9件（納豆ごはん＋味噌汁 朝450kcal P20F12C65 … 刺身定食 夕520 など、`method`料理方法つき）。
- 外食・コンビニ4件（サラダチキン114 / おにぎり鮭180 / ファミチキ242 / 牛丼並635）。
- 種目6件（ベンチ/ショルダー/スクワット/デッド/懸垂/プランク、前回値つき）。予定3件（月:胸 / 水:脚 / 金:背中）。
- 目標 `{kcal:1800, p:120, f:50, c:200, weight:68.0}`。通知4件(体重07:00/朝08:00/昼12:30/夕19:30)。体重履歴20点(70.6→69.2)。
- デモ切替「順調に継続中 / 今日まだ未記録」の2サンプル状態を持つ。

**出典**: B-7, B-8, モック `DietSupport.dc.html` + `support.js`。

---

## 5. ドメインの中核ルール（★契約：テスト・D-7 が正）

### 5.1 食事 ◎○なし 判定（F-007）
```
evaluateMeal(items, goal):
  items が空            → なし
  goal 未設定           → ○            （入力済みだが基準なし）
  total = aggregate(items)
  ◎ = (total.kcal ≤ goal.kcal) ∧ (total.p ≥ goal.p) ∧ (total.f ≤ goal.f) ∧ (total.c ≤ goal.c)
  ◎条件成立            → ◎  / それ以外（入力済み未達） → ○
```
- **P は「目標以上」、F・C・kcal は「目標以下」**。境界は等号を含む(≤ / ≥)。
- 継続性は ○ で担保されるので◎を厳密にしてOK（2026-06-24 ユーザー確定）。

### 5.2 運動・体重 判定（F-007）
- **運動**: 予定どおり実行 → ◎ / 「休む」記録 → ○ / それ以外実行 → ○ / 予定日に記録なし → なし。**消費カロリーは扱わない**。
- **体重**: 測定あり → ◎ / なし → なし（○状態は持たない）。同日再入力は上書き。

### 5.3 集計・ストリーク・ギャップ・競合（F-002/008/009/016）
- **aggregate**: `deleted` 以外の各 item の `kcal/p/f/c × qty` を合算。値は**記録時点スナップショット**（マスタ変更が過去に波及しない）。
- **calcStreak**: today から遡り `achievement ≠ なし`（○か◎）の連続日数。**当日未記録でも当日を中断扱いにしない**（UT-021）。`maxStreak`は履歴の最長。
- **detectGap**: 直近の記録日 < today−1 なら `{gap:true, from:…}`。**履歴なし(新規)では再開導線を出さない**（UT-028 / 責めないUX）。
- **resolveConflict (LWW)**: `local.updated_at ≥ server.updated_at` なら local 採用（同点は local 勝ち）。`deleted=1` も updated_at で勝敗（削除の伝播）。決定的＝冪等の基礎。

### 5.4 記録確定フロー（D-7 A7 / 原子トランザクション）
```
confirmRecord(input):
  validate(input)                              // 不正は ValidationError、保存は呼ばない
  BEGIN TX (IndexedDB)
    rec  = upsert(input)                        // updated_at=now, device_id 付与
    rec.eval = evaluate(rec, goal/plan)         // §5.1/5.2
    daily = buildDailyAchievement(rec.date); upsert(daily)   // E-011 集約更新
  COMMIT                                        // 失敗時ロールバック・入力保持
  enqueueForSync([rec, daily])                  // 同期キュー（非同期 / オンライン時 push）
```

**出典**: D-7(A1〜A7), D-12。**合否は `tests/unit/` の UT-001〜034 / 035〜037 が最終判定。**

---

## 6. データモデル（★契約）

### 6.1 共通カラム（全業務テーブル T-001〜T-011）
`id`(TEXT PK, UUIDv4 クライアント生成) / `account_id`(FK→t_account) / `updated_at`(TEXT ISO8601ms, LWW基準) / `device_id`(TEXT) / `deleted`(INTEGER 0|1, 論理削除)。
> **t_account(T-012) だけは同期対象外**（`device_id`/`deleted` を持たない）。

### 6.2 テーブル（SQLite=正本 / IndexedDBは同論理構造のストア）
| T | テーブル | 主な列 | 業務UNIQUE |
|---|---|---|---|
| T-001 | t_weight_record | date, weight(REAL>0,≤500), eval(◎/null) | (account_id,date) |
| T-002 | t_meal_record | date, meal_type(morning/noon/night), eval(◎/○/null), kcal/p/f/c_total | (account_id,date,meal_type) |
| T-003 | t_meal_item | meal_record_id(FK), item_type(fixed/eating_out/manual), fixed_menu_id?, eating_out_id?, name?, qty, kcal/p/f/c(**スナップショット**) | なし |
| T-004 | t_fixed_menu | name, meal_type?, kcal/p/f/c, recipe? | (account_id,name) |
| T-005 | t_eating_out_item | name, kcal/p/f/c, category? | (account_id,name) |
| T-006 | t_workout_record | date, exercise_id(FK), reps?, weight(TEXT;kg or「自重」), sets?, eval | (account_id,date,exercise_id) |
| T-007 | t_exercise | name, part? | (account_id,name) |
| T-008 | t_workout_plan | exercise_id(FK), plan(曜日/頻度) | (account_id,exercise_id) |
| T-009 | t_goal | kcal/p/f/c_goal, weight_goal?, applied_from? | (account_id) ※**単一レコード・履歴なし** |
| T-010 | t_notification_setting | type(morning/noon/night/weight), notify_time(HH:MM), enabled | (account_id,type) |
| T-011 | t_daily_achievement | date, meal_eval, workout_eval, weight_eval, all_achieved | (account_id,date) ※記録確定Txで更新 |
| T-012 | t_account | id, email(UNIQUE), password_hash(bcrypt/argon2), created_at, updated_at | (email) ※**同期対象外** |

- **インデックス**: 全業務テーブルに同期差分用 `idx_sync_*(account_id, updated_at)`、明細に `idx_meal_item_fk(meal_record_id)`。
- VIEW/TRIGGER なし・物理CASCADEなし（集約はアプリ層Tx、削除は論理削除を同期で伝播）。

**出典**: B-12, D-8, D-9, D-10。

---

## 7. API 仕様（★契約 / D-13）

- **ベースURL** `/api/v1`、**HTTPS必須**。認証 = **Bearer トークン**。同期は `X-Device-Id` ヘッダ付与。
- エラー形 `{ "error": { "code", "message" } }`。

| ID | METHOD パス | 用途 | 成功 | 主なエラー |
|---|---|---|---|---|
| A-001 | POST `/auth/signup` | アカウント作成（認可不要） | 201 `{token, account_id}` | 400 / 409(email既存) |
| A-002 | POST `/auth/login` | ログイン（認可不要） | 200 `{token, account_id}` | 401 / 429(レート制限) |
| A-003 | POST `/auth/logout` | セッション無効化 | 204 | 401 |
| A-004 | GET `/sync?since=ISO8601` | 差分取得(pull)。テーブル別に `updated_at>since`（**deleted=1含む**） | 200 `{server_time, tables{...}}` | 401 |
| A-005 | POST `/sync` | 変更送信(push)。`id` で upsert、**LWW**で適用、account スコープ外は拒否、**冪等** | 200 `{applied, conflicts, server_time}` | 400 / 401 / 409 |

- **スコープ**: 認可必須APIは当該 account のデータのみ返す/受け付ける。
- **レート制限**: ログイン 例 5回/分 超過で 429（具体値は運用調整）。

**出典**: D-13。**サーバー実装は `server/app/sync_server.py` + `main.py`（実装済・稼働確認済）。**

---

## 8. エラー処理・文言（D-14）

- **方針**: 画面に**コードを出さない**・**非難しないやさしい文言**（継続性のため）。記録系はエラーでも**入力を保持**。ログにパスワード/トークン/健康データ値を出さない。日本語のみ。
- **HTTP→コード**: 400→`VAL-*` / 401→`AUT-001`(認証失敗)・`AUT-003`(期限切れ) / 409→`AUT-004`(email既存) / 429→`AUT-002` / 500→`SYS-001`。
- **代表文言**: VAL-004「メールアドレスの形式を確認してください」/ AUT-001「メールアドレスまたはパスワードが正しくありません」/ SYN-001「オフラインのため、後で自動的に同期します」/ PER-001「保存に時間がかかっています。もう一度お試しください」。

**出典**: D-14。

---

## 9. テスト / 受け入れ条件（★契約・書き換え禁止）

- **構成**: 単体 **UT-001〜063**（Vitest 66 + pytest 一部）、受け入れ **AT-001〜022**。合計 **85件**（現状すべて Green）。
- **`_stubs` ブリッジ**: `tests/_stubs/{domain,application}.ts`・`server.py` が本実装へ re-export。新クラスを足したらブリッジに追記。
- **カバレッジ目標**: Domain C1 90%↑ / Application・API C0 80%↑（現状 domain C1 98% / application 91%）。

**契約として固定された判断（抜粋・原文準拠）**:
- UT-002: total=goal=`{2000,120,60,250}`（全条件等号）→ **◎**（境界含む）。
- UT-008: items非空・goal=null → **○**。
- UT-010: 運動「休む」→ **○**。UT-013: 体重測定 → **◎**。UT-018: `deleted` は集計除外。
- UT-021: `当日なし/◎/○/◎` → **streak=3**（当日未記録は中断にしない）。UT-022: 2日連続抜け → **0**。
- UT-028: 履歴 `[]` → **`{gap:false}`**（新規は再開導線を出さない）。
- UT-032: updated_at 同値 → **local 採用**。UT-033/034: 新しい `deleted=1` が勝つ。
- UT-036: commit 失敗 → ロールバック・部分更新なし・入力保持。UT-037: 不正入力 → save 呼ばない。
- UT-057: 古い push は無視(server_wins)。UT-059: 再送で結果不変(冪等)。UT-060: 他 account は拒否。UT-061: `since` フィルタ（deleted含む）。
- AT-014(通知/フェイクタイマー)・AT-018〜020(マルチデバイス/2コンテキスト・httpx) は E2E代替実装。

**出典**: D-15, TS-1, _test_manifest, 開発ハンドオフ_実装ガイド。

---

## 10. 現状実装マップ（実装済 / 未実装）と残作業

> ⚠️ **この §10 は「Phase 4 骨格」時点の記録です。現状は §5.1〜5.8 を全完了 + サーバー本番化(SQLite/JWT)済み。
> 最新の現在地・残作業は [HANDOFF.md](HANDOFF.md) の §1・§5 を参照してください。** §1〜9 の設計要約は引き続き有効です。

### 10.1 実装済み（骨格・テスト85件 Green）
| レイヤ | 実装 | 場所 |
|---|---|---|
| Domain | 評価/集計/ストリーク/ギャップ/競合/日付 | `src/domain/*`（evaluation, aggregate, streak, gap, conflict, dateUtil, types）|
| Application | 記録確定UseCase(原子Tx)・Sync・Auth・各Service・Controller・例外 | `src/application/*`（usecases, sync, auth, services, controllers, errors）|
| Infrastructure | ApiClient(fetch/Bearer/X-Device-Id) のみ | `src/infrastructure/apiClient.ts` |
| Server | ServerApi + FastAPI ルート A-001〜005（認証/LWW/スコープ/レート/冪等） | `server/app/sync_server.py`, `main.py` |
| UI | **ログイン→ホームの最小UI のみ**（食事プレビュー・ストリークはデモ） | `src/ui/App.tsx` |
| PWA | vite-plugin-pwa（SW/manifest 生成） | `vite.config.ts` |

### 10.2 未実装 → 残作業（HANDOFF §5 / 推奨順。多くは「配線」）
1. **§5.1 IndexedDB リポジトリ + 同期キュー**（最初。他が依存）— `idb`で `runInTx/upsert/listChangedSince/apply/getAll/save`。出典 D-8/9/10。
2. **§5.2 記録確定UI**（S-002食事 / S-003体重 / S-004筋トレ）— モックを正に画面化。UseCaseは実装済、配線中心。出典 B-8 + mock / D-4 / D-7 / D-14。
3. **§5.3 ◎○カレンダー**（S-006）— 月グリッド + ストリーク。`CalendarService.build` を IndexedDB集計で本実装。
4. **§5.4 統合ダッシュボード**（S-005）— Recharts で体重折れ線＋◎○オーバーレイ。`DashboardService.build` 本実装。
5. **§5.5 同期の実配線**— 起動時/保存時に `SyncService.sync`、オフライン検知・再送・同期状態UI。出典 D-13/D-6。
6. **§5.6 認証フロー本実装**（S-009）— サインアップ画面・トークン localStorage 永続化・セッション復元。出典 D-13/B-19。
7. **§5.7 通知の実タイマー化**— 現状「即時発火」を SW のローカル通知で設定時刻発火へ。出典 B-1/R-8(F-014)。
8. **§5.8 Playwright E2E**（仕上げ・任意）— AT-* をシナリオ名に流用。

### 10.3 起動（確認済み）
```bash
PYTHONPATH=. .venv/bin/uvicorn server.app.main:app --port 8000   # バックエンド
npm run dev                                                       # フロント :5173
```
シードアカウント `me@example.com` / `correct-horse`。dev は `/api`→`:8000` プロキシ。

---

## 11. 用語（最小）
◎○評価＝達成度3段階(◎目標クリア/予定実行・○入力したが未達/休み・なし無入力。△×は使わない) / 0の日＝記録ゼロの日(なくすのが要) / ストリーク＝連続記録日数 / 固定メニュー＝登録済み定番(PFCを登録時1回設定) / 履歴コピー＝前回組合せを複製 / 再開導線＝抜け翌日の責めない復帰導線 / 端末間同期＝サーバー経由の双方向(自前サーバーなので「クラウド同期」と呼ばない) / LWW＝last-write-wins(updated_at の新しい方を採用)。
**出典**: R-13。

---

## 12. ID 体系
`R-B-*`業務要件 / `R-NF-*`非機能(001〜018) / `F-*`機能(001〜017) / `S-*`画面(001〜009) / `A-*`API(001〜005) / `E-*`エンティティ(001〜012) / `T-*`テーブル(001〜012) / `UT-*`単体テスト(001〜063) / `AT-*`受け入れ(001〜022)。台帳: `_id_registry.md`。

---

## 13. 主な TBD（設計が実装に委ねた点）
- トークン方式(JWT/セッション)・有効期限・リフレッシュ（D-13 §7 / B-19）。
- レート制限の具体値・同期 push の最大ペイロード/分割（運用調整。現状上限5）。
- 例外クラスの最終名・階層（意味で規定。`src/application/errors.ts` / `sync_server.py` を踏襲）。
- F-015 バックアップのファイル形式・復元時の競合解決（現状は単純復元 / AT-013）。
- S-002 入力中断時の下書き保持 or 破棄（B-8 §7）。
- E-009 目標の履歴保持（適用開始日）有無（D-8 で単一レコード採用済）。
- ストリークの「当日除外」実装ロジックの最終確定（UT-021 の期待に合わせる）。

---
*出典の正本: `../開発doc作成_v04_DietSupport/output/`。UIは mock、挙動は `tests/`、根拠は設計doc（§0）。*
