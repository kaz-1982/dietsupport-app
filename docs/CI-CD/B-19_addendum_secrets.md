---
doc_id: B-19
doc_name: セキュリティ設計書
phase: 基本設計
required_when: WF / 全規模で必須(セキュリティ設計)
depends_on: [B-1, B-17]
mode: WF
addendum: true
cr_id: CR-001
merge_target: B-19
merge_target_sections: ["§4.x GitHub Actions における Secrets 管理・権限(新設)", "§4 SCA項の拡張(Dependabot + 自動 SCA)"]
---

# 【追補】ダイエットサポートアプリ - セキュリティ設計書 §4.x CI/CD の保護(B-19 addendum / CR-001)

> **注意**: これは追補ドキュメントです。CR-001 マージ完了までは本ファイルが正、マージ完了後は `output/03_基本設計/B-19_セキュリティ設計書.md` §4.x が正になります(CLAUDE.md ルール8)。

---

## 1. 目的

CR-001 に基づき、B-17 §4.7 で追加した CI/CD パイプラインにおける**secrets の隔離・最小権限・供給連鎖(SCA)の自動化**を、B-19 に §4.x として追加する。追補期間中の設計正本を本ファイルとする。

## 2. 適用範囲・スコープ

- **本追補が扱う本体節**: B-19 §4.x(新設)、§4「脆弱な/古い依存(SCA)」項の拡張
- **本追補が扱わない**: B-19 §3(脅威モデル本編)、§4 の CI/CD 以外の項目は現行維持。CI/CD パイプライン全景は B-17 追補、非機能要件は R-9 追補に委譲

## 3. 前提・依存

- **上流本体**: [B-1 システム方式設計書](../../03_基本設計/B-1_システム方式設計書.md)、[B-17 運用設計書 現行 0.2](../../03_基本設計/B-17_運用設計書.md)、[B-19 セキュリティ設計書 現行 0.3](../../03_基本設計/B-19_セキュリティ設計書.md)
- **同一 CR の他追補**: [B-17 追補(CI/CD 全景)](B-17_addendum_4.7_CICD.md)、[R-9 追補(NF)](R-9_addendum_NF_maint.md)、[P-3 追補(WBS)](P-3_addendum_WBS.md)
- **参照 CR**: [CR-001](../../_change_requests/CR-001_CI-CD追加.md)
- **前提条件**: GitHub Actions を CI/CD 実行基盤として採用済(B-17 §4.7 追補)

## 4. 本文

### 4.x CI/CD の保護(GitHub Actions における Secrets 管理・権限)【本体 B-19 §4 内に新設】

##### 4.x.1 目的

B-17 §4.7 で追加した CI/CD パイプライン(GitHub Actions)における、**secrets の隔離・最小権限・供給連鎖(SCA)の自動化**を定義する。ワークフローファイル `.github/workflows/*.yml` は公開リポジトリでもコード上に見える前提とし、**機密情報を YAML に直接書かない**ことを絶対原則とする。

#### 4.x.2 脅威モデル(STRIDE 該当抜粋)

B-19 §3 の脅威一覧の CI/CD 領域拡張:

| 脅威 | シナリオ | 対策 |
|---|---|---|
| Spoofing | 悪意ある PR が secrets を持ったジョブを実行 | `pull_request_target` **使用禁止**。fork からの PR は secrets を参照させない |
| Tampering | 依存パッケージへのマルウェア混入(supply chain) | Dependabot + 週次 SCA(`npm audit`/`pip audit`)、lockfile 厳格運用(`npm ci` / `pip install -r`) |
| Repudiation | 誰がいつマージしたか不明 | GitHub の commit history + Actions ログを正本。手動介入(ブランチ保護一時解除等)は `_review_log.md` に記録 |
| Information Disclosure | secrets のログ出力・成果物漏えい | `echo` での secret 出力禁止。Actions は secrets を自動マスキングするが、加工後の値(base64 デコード後等)はマスキングされないため注意 |
| Denial of Service | 無限ループするワークフローで課金爆発 | `concurrency: cancel-in-progress: true`、`workflow_dispatch` 手動起動時の権限最小化 |
| Elevation of Privilege | `GITHUB_TOKEN` に強すぎる権限を付与 | 全 workflow で `permissions:` を**明示宣言**し、既定は `contents: read` のみ |

#### 4.x.3 Secrets の管理方針

##### 4.x.3.1 保管場所

- **正本**: GitHub リポジトリの **Secrets and variables → Actions**(暗号化ストレージ)
- **禁止**: リポジトリ内のファイル(`.env`、`config.yml`、`docker-compose.yml` 等)への直書き
- **禁止**: ローカルの `.env.local` を Git 管理下に置くこと(`.gitignore` で除外必須)

##### 4.x.3.2 命名規則と粒度

環境(prod / dev / staging)を **prefix で分離**する:

| Prefix | 用途 | 例 |
|---|---|---|
| `PROD_` | 本番デプロイ・本番相当環境用 | `PROD_JWT_SECRET`、`PROD_DATABASE_URL` |
| `DEV_` | dev / preview デプロイ用(将来) | `DEV_JWT_SECRET` |
| `DEPLOY_TOKEN_` | デプロイサービス資格情報 | `DEPLOY_TOKEN_FRONTEND`、`DEPLOY_TOKEN_BACKEND` |

**JWT 秘密鍵は prod / dev で必ず別値**。同一値の使い回し禁止(B-19 現行方針の踏襲)。

##### 4.x.3.3 ローテーション

| Secret 種別 | ローテーション頻度 | 契機 |
|---|---|---|
| `PROD_JWT_SECRET` | 年1回 + 漏えい疑い時 | カレンダーリマインド(Runbook 化) |
| `DEPLOY_TOKEN_*` | 半年に1回 + 権限縮小時 | ホスティングサービスの推奨に従う |
| `PROD_DATABASE_URL` | DB 資格情報変更時 | DB 資格情報の再発行イベント |

ローテーション実施は `_review_log.md` に記録する(いつ・何を・誰が回したか)。

##### 4.x.3.4 GitHub Environments による本番保護(推奨)

将来的にリスクが顕在化したら、GitHub Environments 機能で本番 secrets を保護:

- `production` Environment を作成
- 本番 secrets(`PROD_*`)を Environment secrets として登録(リポジトリ secrets からは分離)
- CD ワークフローの deploy-* jobs に `environment: production` を宣言
- Environment に **手動承認レビュワー = 自分1名** を設定 → 本番デプロイに承認が必要になる(1名運用でも「自分がゲートを踏む」意識が芽生える)

初版はリポジトリ secrets のみで運用開始。負担感を実測して Environment 導入を判断。

#### 4.x.4 `GITHUB_TOKEN` の権限最小化

全 workflow で `permissions:` を**明示宣言**する。既定の書き込み権限は使わない。

##### 4.x.4.1 workflow ごとの最小権限一覧

| workflow | 必要権限 | 理由 |
|---|---|---|
| `ci.yml` | `contents: read` | ソース取得のみ |
| `cd.yml` | `contents: read`、デプロイ先に応じた最小(例: `id-token: write` for OIDC) | ソース取得 + 外部サービスへの OIDC 認証 |
| `sca.yml` | `contents: read`、`issues: write` | ソース取得 + 脆弱性 Issue 起票 |

**リポジトリ設定側の既定**: Settings → Actions → General → Workflow permissions で **「Read repository contents and packages permissions」** を選択(既定を最小にする)。

##### 4.x.4.2 サードパーティ Actions の使用制限

- 使用可: `actions/*`(GitHub 公式)、`docker/*`(Docker 公式)、`hashicorp/*` 等の**組織公式**アクション
- 制限: 個人リポジトリ由来の Action は原則不可。使用する場合は**タグではなくコミット SHA でピン留め**(supply chain 対策)
- リポジトリ設定 → Actions → General → **「Allow specified actions and reusable workflows」** で許可リストを明示

#### 4.x.5 `pull_request_target` の使用禁止

- **原則**: `.github/workflows/*.yml` で `on: pull_request_target:` を使用禁止
- **理由**: fork からの PR は書き込み権限とリポジトリ secrets を取得可能になり、悪意ある PR による情報漏えい・改ざんリスクが極めて高い
- **代替**: fork からの PR で CI を回したい場合は `on: pull_request:`(secrets を渡さない)+ maintainer による手動ラベル付けで CI 起動、を選ぶ
- **本案件**: 自分専用リポジトリのため fork PR は基本発生しない。念のため `pull_request_target` を CI レビュー観点として明示

#### 4.x.6 依存管理(SCA)の自動化 【本体 B-19 §4「脆弱な/古い依存(SCA)」項を拡張】

現行本体表現:

> 「依存パッケージ(クライアント + サーバー)を定期更新・`npm audit` / `pip audit` 等で点検」

拡張後(追補期間中は本追補が正):

- **自動 SCA**: `sca.yml` により週次(月曜 09:00 JST)で `npm audit --audit-level=high` および `pip-audit` を実行
- **脆弱性検知時**: `high` 以上を検知すると GitHub Issue を自動起票(タイトル: `[SCA] <side> high vulnerabilities detected (YYYY-MM-DD)`)。**本人が5営業日以内にトリアージ**(修正 / 見送り / 別バージョン)
- **Dependabot**: `.github/dependabot.yml` により、npm / pip / github-actions を週次で更新PR 起票(月次 = github-actions)
- **PR 対応方針**:
  - CI が緑の Dependabot PR → 内容を確認しマージ(初版は手動、負担が高ければ将来 CR で自動化)
  - CI が赤の Dependabot PR → 破壊的変更あり。影響調査 → 対応(修正 / スキップ / 別バージョン)
- **lockfile 厳格運用**: `npm ci` / `pip install -r`(freeze) により、開発と CI で依存が完全一致することを保証

#### 4.x.7 GitHub リポジトリ設定(手動設定手順)

**GitHub UI での設定は Actions ログに残らないため、必ず本節を Runbook として参照して設定する。設定完了時に `_review_log.md` に記録する。**

| # | 設定項目 | 設定値 |
|---|---|---|
| 1 | Settings → Actions → General → Workflow permissions | Read repository contents and packages permissions |
| 2 | Settings → Actions → General → Allow specified actions... | `actions/*, docker/*, hashicorp/setup-terraform@v3`(必要に応じ追加) |
| 3 | Settings → Actions → General → Fork pull request workflows | Require approval for first-time contributors(既定でOK) |
| 4 | Settings → Secrets and variables → Actions → Repository secrets | 4.x.3.2 の Secret を登録(値はここでのみ入力、`_review_log.md` には**値を書かない**) |
| 5 | Settings → Branches → Branch protection rules → main | B-17 §4.7.5 の表に従い設定 |
| 6 | Settings → Code security → Dependabot alerts | Enable |
| 7 | Settings → Code security → Dependabot security updates | Enable |
| 8 | Settings → Environments →(将来) production 作成 | 手動承認レビュワー = 自分 |

#### 4.x.8 セキュリティヘッダ・CORS への CD 経由での上書き

現行 B-19 §4.6 で「セキュリティヘッダを実装済(`server/app/main.py`)」「CORS を `DIETSUPPORT_ALLOWED_ORIGINS` で制限」とあるが、**本番と dev で値が異なる**。CD ではこれを environment 変数として上書きする:

| 環境変数 | 本番値の例 | 保管先 |
|---|---|---|
| `DIETSUPPORT_ALLOWED_ORIGINS` | `https://<本番フロントドメイン>`(1つのみ) | `PROD_ALLOWED_ORIGINS` secret |
| `DIETSUPPORT_JWT_SECRET` | ランダム256bit | `PROD_JWT_SECRET` secret |
| `DIETSUPPORT_DATABASE_URL` | `sqlite:///<本番DBファイルパス>` | `PROD_DATABASE_URL` secret |

CD ワークフローの deploy-backend は、これらを **サーバー環境変数として注入**する(コード or lockfile への埋め込みは絶対禁止)。

#### 4.x.9 受入テスト観点(TS-1 追補として AT-026 予定)

マージ時に TS-1 §受入テスト表末尾に吸収する予定のケース:

| AT-ID | シナリオ | 期待結果 |
|---|---|---|
| AT-026 | Dependabot の週次スケジュールが動作 | 月曜 09:00 JST(UTC 月曜 00:00)に `sca.yml` が起動し、Actions ログに実行記録が残る。高/致命脆弱性がある場合は Issue 自動作成される |

---

### 4.SCA 「脆弱な/古い依存(SCA)」項の拡張

**追補完了時**、本体 B-19 §4 の「脆弱な/古い依存(SCA)」の対応列を以下に置き換える:

> 「依存パッケージ(クライアント + サーバー)を Dependabot(週次)+ 自動 SCA(`sca.yml` 週次月曜 09:00 JST)で継続的に監視。`high` 以上の脆弱性は Issue 自動起票し、本人が5営業日以内にトリアージ。lockfile 厳格運用(`npm ci` / `pip install -r`)で開発↔ CI の依存を完全一致」

---

## 5. 関連トレーサビリティ(追補内)

- **上流(本追補の根拠)**: CR-001 §1 動機、B-17 追補 §4.7 パイプライン全景、B-19 現行 §4 SCA・セキュリティヘッダ方針
- **下流(本追補を参照するもの)**: 実装セッションで `.github/workflows/*.yml` の `permissions:` セクション、Environment 設定、Runbook
- **マージ後の位置づけ**: 本体 B-19 §4.x として吸収され、以降は本体を参照する

---

## 6. 改訂履歴(追補内)

| 版 | 日付 | 変更者 | 変更内容 |
|---|---|---|---|
| 0.1 | 2026-07-04 | kazu | 追補初版作成。CI/CD の脅威モデル、Secrets 命名・ローテーション、`GITHUB_TOKEN` 最小化、`pull_request_target` 禁止、Dependabot + 自動SCA、リポジトリ設定 Runbook |

---

## 7. レビュー状態(追補内)

- 単体品質チェック: 実施予定
- 整合性チェック: 実施予定(追補は check.py 対象外の暫定運用、B-19 マージ後に本体側で緑確認)
- TBD / 残課題:
  - **GitHub Environments 導入判断**(初版はリポジトリ secrets のみで開始、負担感で判定)
  - **サードパーティ Action 許可リストの初期集合**(実装セッションで必要な Action を洗い出したのち確定)
- 承認: 未取得(CR-001 追補設計承認と連動)
