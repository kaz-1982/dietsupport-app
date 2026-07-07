---
doc_id: B-17
doc_name: 運用設計書
phase: 基本設計
required_when: WF / 全規模で必須(運用設計)
depends_on: [B-1, B-3, B-19]
mode: WF
addendum: true
cr_id: CR-001
merge_target: B-17
merge_target_sections: ["§4.7 CI/CD パイプライン(新設)", "§4.6 定常作業一覧(追記)", "§7 レビュー状態(TBD再構成)"]
---

# 【追補】ダイエットサポートアプリ - 運用設計書 §4.7 CI/CD パイプライン(B-17 addendum / CR-001)

> **注意**: これは追補ドキュメントです。CR-001 マージ完了までは本ファイルが正、マージ完了後は `output/03_基本設計/B-17_運用設計書.md` §4.7 が正になります(CLAUDE.md ルール8)。

---

## 1. 目的

CR-001 に基づき、B-17 §4.6 の直後に **§4.7「CI/CD パイプライン(GitHub Actions)」** を新設し、既存 §4.6 の定常作業表末尾と §7 レビュー状態(TBD)を再構成する。追補期間中の設計正本を本ファイルとする。

## 2. 適用範囲・スコープ

- **本追補が扱う本体節**: B-17 §4.7(新設)、§4.6(既存表末尾に3行追加)、§7(TBD 再構成)
- **本追補が扱わない**: B-17 §4.1〜4.5(体制・カレンダー・監視・バックアップ・障害対応)は現行維持。B-19 の Secrets 詳細・R-9 の非機能要件は別追補(B-19 / R-9 の同 CR 追補)へ委譲

## 3. 前提・依存

- **上流本体**: [B-1 システム方式設計書](../../03_基本設計/B-1_システム方式設計書.md)、[B-3 ネットワーク構成図](../../03_基本設計/B-3_ネットワーク構成図.md)、[B-17 運用設計書 現行 0.2](../../03_基本設計/B-17_運用設計書.md)、[B-19 セキュリティ設計書 現行 0.3](../../03_基本設計/B-19_セキュリティ設計書.md)
- **同一 CR の他追補**: [B-19 追補(Secrets)](B-19_addendum_secrets.md)、[R-9 追補(NF)](R-9_addendum_NF_maint.md)、[P-3 追補(WBS)](P-3_addendum_WBS.md)
- **参照 CR**: [CR-001](../../_change_requests/CR-001_CI-CD追加.md)
- **前提条件**: v1.0 リリース済(v1.0 の実装リポジトリが存在し、`main` ブランチが本番相当)

## 4. 本文

### 4.7 CI/CD パイプライン(GitHub Actions)【本体 B-17 §4.6 の直後に新設】

##### 4.7.1 目的

v1.0 まで手動で行っていた「テスト実行 → ビルド → デプロイ → 依存点検」を、**GitHub Actions によるパイプラインで再現可能に自動化**する。1名内製・長期メンテを前提として、以下を確保する:

- **回帰の抑止**: PR 単位で全テストが自動実行され、緑でなければ main にマージできない
- **デプロイの再現性**: main 到達時点のコミットが自動でデプロイされ、ロールバックは main の revert で行う
- **SCA の実効化**: B-19 の SCA 方針を週次スケジュールで自動実行し、脆弱性検知の形骸化を防ぐ

#### 4.7.2 パイプライン全景

```
   [開発者 PC]
       │ git push (feature branch)
       ▼
   [GitHub]
       │
       ├─► [PR 作成]
       │     │
       │     ▼
       │   ci.yml トリガー
       │     ├─ frontend job (Ubuntu, Node 20)
       │     │    lint → typecheck → vitest → build
       │     └─ backend  job (Ubuntu, Python 3.12)
       │          ruff → mypy → pytest
       │     ↓
       │   全 job 緑?
       │     ├─ Yes → PR に緑チェック → main マージ可能
       │     └─ No  → PR に赤 → マージ不可(ブランチ保護)
       │
       ├─► [main へマージ]
       │     │
       │     ▼
       │   cd.yml トリガー
       │     ├─ frontend deploy (静的ホスティング宛)
       │     └─ backend  deploy (サーバー宛、TBD)
       │     ↓
       │   デプロイ成功?
       │     ├─ Yes → 完了。Actions ログに記録
       │     └─ No  → 通知(GitHub 通知)。main の revert で戻す
       │
       └─► [週次スケジュール(月曜 09:00 JST)]
             │
             ▼
           sca.yml トリガー
             ├─ npm audit (frontend)
             └─ pip audit (backend)
             ↓
           脆弱性検知?
             ├─ Yes → GitHub Issue 自動作成(高/致命度のみ)
             └─ No  → Actions ログのみ
```

#### 4.7.3 ワークフロー定義(ジョブレベル)

##### 4.7.3.1 `.github/workflows/ci.yml`

| 項目 | 内容 |
|---|---|
| **name** | `CI` |
| **on** | `pull_request:` main向け / `push:` 全ブランチ(main含む) |
| **permissions** | `contents: read`(最小) |
| **concurrency** | `group: ci-${{ github.ref }}`, `cancel-in-progress: true` |
| **jobs** | `frontend`, `backend`(**並列実行**) |

##### frontend job

| ステップ | コマンド / 内容 |
|---|---|
| checkout | `actions/checkout@v4` |
| setup-node | `actions/setup-node@v4`、Node.js 20 LTS、`cache: npm` |
| install | `npm ci`(lockfile 厳格、`package-lock.json` 必須) |
| lint | `npm run lint`(ESLint) |
| typecheck | `npm run typecheck`(tsc --noEmit) |
| test | `npm run test:unit`(Vitest、CI モード) |
| build | `npm run build`(Vite 本番ビルド) |
| upload-artifact | `dist/` を artifact に(CD で再利用可) |

##### backend job

| ステップ | コマンド / 内容 |
|---|---|
| checkout | `actions/checkout@v4` |
| setup-python | `actions/setup-python@v5`、Python 3.12、`cache: pip` |
| install | `pip install -r requirements.txt -r requirements-dev.txt` |
| lint | `ruff check .` |
| typecheck | `mypy server/` |
| test | `pytest -q`(pytest + httpx) |

##### 完了基準

- 両 job 緑で PR に ✅
- どちらか赤で PR に ❌ → ブランチ保護によりマージ不可
- 実行時間目標: **合計 5分以内**(R-NF-022)

##### 4.7.3.2 `.github/workflows/cd.yml`

| 項目 | 内容 |
|---|---|
| **name** | `CD` |
| **on** | `push:` branches=main のみ |
| **permissions** | `contents: read`, デプロイ先に応じた最小権限 |
| **concurrency** | `group: cd-main`, `cancel-in-progress: false`(進行中デプロイは中断しない) |
| **jobs** | `deploy-frontend`, `deploy-backend`(**並列**、独立) |

##### deploy-frontend job

- 静的ホスティング宛にビルド成果物をデプロイ
- **デプロイ先**: TBD(B-17 §7 の TBD と同期。追補フォルダマージ時にも未定なら「宛先パラメタライズド、実装時に確定」で運用)
- 想定候補: Vercel / Cloudflare Pages / GitHub Pages 等
- **暫定**: CI で `dist/` を artifact に上げるところまでを CD の前提とし、実配送のステップは placeholder(`# TODO: deploy to <service>`)で置く

##### deploy-backend job

- FastAPI サーバー宛にコードをデプロイ + 再起動
- **デプロイ先**: TBD(B-17 §7 の TBD と同期)
- 想定候補: Fly.io / Render / Railway / VPS(SSH + docker) 等
- **暫定**: 同上、placeholder で置く

##### 完了基準

- 両 job 緑でデプロイ完了通知(GitHub UI)
- どちらか赤で通知(GitHub 通知 or メール) → 手動対応

##### 4.7.3.3 `.github/workflows/sca.yml`

| 項目 | 内容 |
|---|---|
| **name** | `SCA (weekly)` |
| **on** | `schedule:` cron `0 0 * * 1`(UTC 月曜 00:00 = JST 月曜 09:00) / `workflow_dispatch:`(手動実行可) |
| **permissions** | `contents: read`, `issues: write`(高/致命度発見時に Issue 起票) |
| **jobs** | `audit-frontend`, `audit-backend` |

##### audit-frontend job

- `npm audit --audit-level=high --json` を実行
- `high` 以上を検知したら GitHub Issue を作成(タイトル: `[SCA] frontend high vulnerabilities detected (YYYY-MM-DD)`)

##### audit-backend job

- `pip install pip-audit && pip-audit --format json` を実行
- `high` 以上を検知したら GitHub Issue を作成(タイトル: `[SCA] backend high vulnerabilities detected (YYYY-MM-DD)`)

#### 4.7.4 `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Asia/Tokyo"
    open-pull-requests-limit: 5
  - package-ecosystem: "pip"
    directory: "/server"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Asia/Tokyo"
    open-pull-requests-limit: 5
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
    open-pull-requests-limit: 3
```

#### 4.7.5 ブランチ保護(GitHub リポジトリ設定 / 手動設定)

`main` ブランチに以下の保護を適用する(GitHub UI で設定、変更履歴が残る):

| 保護項目 | 設定 | 理由 |
|---|---|---|
| Require pull request before merging | **ON** | 直接 push を防ぐ |
| Require approvals | **0**(1名運用のため) | セルフレビュー地獄を避ける |
| Require status checks to pass | **ON** | CI が緑でなければマージ不可 |
| 必須ステータス: `CI / frontend`, `CI / backend` | **ON** | R-NF-019 の担保 |
| Require branches to be up to date | ON | rebase 済で緑を担保 |
| Require linear history | ON(推奨) | main の履歴を追いやすくする |
| Do not allow bypassing the above settings | **ON**(自分含む) | 1名運用でも自分自身のミスを防ぐ |
| Allow force pushes | OFF | 履歴改変不可 |
| Allow deletions | OFF | main の削除不可 |

**緊急時の一時解除**: 障害時に緊急デプロイが必要な場合、リポジトリ設定で保護を一時的に無効化 → 対応 → 保護を再度有効化。**この操作は `_review_log.md` に必ず記録する**。

#### 4.7.6 環境変数と Secrets

詳細は B-19 追補 §4.x を参照。B-17 で扱うのは **CI/CD ワークフローが参照する secret 名の一覧と用途** のみ(値は GitHub Secrets 側に保管):

| Secret 名(候補) | 用途 | 参照 workflow |
|---|---|---|
| `DEPLOY_TOKEN_FRONTEND` | 静的ホスティングのデプロイ資格情報 | cd.yml (deploy-frontend) |
| `DEPLOY_TOKEN_BACKEND` | サーバーホスティングのデプロイ資格情報 | cd.yml (deploy-backend) |
| `PROD_JWT_SECRET` | 本番用 JWT 秘密鍵(デプロイ時にサーバー環境変数へ注入) | cd.yml (deploy-backend) |
| `PROD_DATABASE_URL` | 本番 DB 接続 URL(SQLite ファイルパス等) | cd.yml (deploy-backend) |
| `PROD_ALLOWED_ORIGINS` | 本番 CORS 許可オリジン | cd.yml (deploy-backend) |

**設定手順**: GitHub リポジトリ → Settings → Secrets and variables → Actions → New repository secret。詳細は B-19 追補。

#### 4.7.7 障害対応(CI/CD 起因)

本節は B-17 §4.5 障害対応フローの拡張:

| 障害種別 | 対応 |
|---|---|
| CI が赤(自分のPR) | ローカルで再現 → 修正 → 再push。原因が flaky test なら `_review_log.md` に記録 |
| CD が赤(main マージ後) | Actions ログを確認 → 原因判定。復旧優先なら `git revert <merge-commit>` → push で main を巻き戻す |
| デプロイ後の本番不具合 | 上記の revert 手順で切り戻し。ロールバック済も `_review_log.md` に記録 |
| GitHub Actions 障害(GitHub 側) | GitHub Status 確認。復旧まで待つ。緊急時のみ 4.7.5 の「緊急時の一時解除」で手動デプロイ可 |
| Dependabot PR の CI 赤 | 依存の破壊的変更のため、影響範囲を調査。scope が広ければ PR クローズ + 手動更新のスケジュールに切り替え |

#### 4.7.8 受入テスト観点(TS-1 追補として AT-024〜026 予定)

マージ時に TS-1 §受入テスト表末尾に吸収する予定のケース:

| AT-ID | シナリオ | 期待結果 |
|---|---|---|
| AT-024 | 意図的に赤テストを含む feature ブランチから main への PR を作成 | ci.yml が赤で終わり、ブランチ保護によりマージボタンが押せない |
| AT-025 | 全緑の PR を main にマージ | cd.yml が起動し、Actions UI に成功が記録される(実配送先は暫定 placeholder のため「起動確認」まで) |
| AT-026 | Dependabot の週次スケジュールが動作 | 月曜 09:00 JST に sca.yml が起動し、Actions ログに実行記録が残る(高/致命脆弱性がある場合は Issue 自動作成) |

---

### 4.6 定常作業一覧 の追記(既存表の末尾に行を追加)

以下の行を、B-17 §4.6 の既存表末尾に追加する予定:

| 周期 | 作業 |
|---|---|
| **週次(自動 / 月曜 09:00 JST)** | **SCA 週次実行(`sca.yml`)。高/致命度検知時は Issue 起票を確認** |
| **随時(Dependabot 起票時)** | **Dependabot PR の CI 緑を確認しマージ(B-19 追補と連動)** |
| **随時(緊急時)** | **ブランチ保護の一時解除(`_review_log.md` に理由・実施日時・戻し日時を記録)** |

---

### 7 レビュー状態 の TBD 再構成

B-17 現行 §7 の以下の TBD について:

- **本体現状**: 「サーバーホスティング先の具体サービス・DB バックアップ方式 → 実装/デプロイ時に確定」
- **CR-001 マージ後**: 「サーバーホスティング先の具体サービス」については、**CD ジョブの deploy-backend ステップの実配送先を確定する時点で解消**。B-17 §4.7.3.2 と連動して具体サービス名 + 認証方式を確定する

追補完了時に本体 §7 の TBD をこの表現に置き換える。

---

## 5. 関連トレーサビリティ(追補内)

- **上流(本追補の根拠)**: CR-001 §1 動機、B-1(方式)/ B-3(NW)/ B-19(SCA・Secrets 方針)/ R-9(保守性・信頼性)
- **下流(本追補を参照するもの)**: 実装セッションで `.github/workflows/*.yml`、`.github/dependabot.yml`、GitHub リポジトリ設定(ブランチ保護)
- **マージ後の位置づけ**: 本体 B-17 §4.7 として吸収され、以降は本体を参照する

---

## 6. 改訂履歴(追補内)

| 版 | 日付 | 変更者 | 変更内容 |
|---|---|---|---|
| 0.1 | 2026-07-04 | kazu | 追補初版作成。§4.7 パイプライン全景、ci.yml/cd.yml/sca.yml のジョブ定義、`.github/dependabot.yml`、ブランチ保護、Secrets 一覧、障害対応、受入テスト観点 |

---

## 7. レビュー状態(追補内)

- 単体品質チェック: 実施予定
- 整合性チェック: 実施予定(追補は check.py 対象外の暫定運用、B-17 マージ後に本体側で緑確認)
- TBD / 残課題:
  - **デプロイ先の具体サービス確定**(cd.yml deploy-frontend / deploy-backend の実配送ステップ)
  - **CI 実行時間の実測値**(初回パイプライン稼働後、5分以内目標が現実的か検証)
  - **Dependabot PR のマージ自動化**(初版は手動マージ。実運用で頻度が高ければ将来 CR で自動化)
- 承認: 未取得(CR-001 追補設計承認と連動)
