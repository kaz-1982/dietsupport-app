# CI/CD 手動設定 Runbook(CR-001)

GitHub UI での手動設定手順。**設計正本**: [B-17 追補 §4.7.5 / §4.7.6](B-17_addendum_4.7_CICD.md)、[B-19 追補 §4.x.7](B-19_addendum_secrets.md)。

> **記録ルール**: GitHub UI の設定は Actions ログに残らないため、各設定の完了時に `_review_log.md` へ「いつ・何を設定したか」を記録する(**Secret の値は絶対に書かない**)。

**実施順序**: 1 → 2 → 3 → 4 の順(ブランチ保護は ci.yml が一度実行された後でないと必須チェック名を選択できないため、CI 初回実行後に実施)。

---

## 1. Actions の permissions を最小化する

**場所**: Settings → Actions → General → Workflow permissions

| 設定 | 値 | 理由(1行) |
|---|---|---|
| Workflow permissions | **Read repository contents and packages permissions** を選択 | `GITHUB_TOKEN` の既定を最小権限にし、workflow 側の `permissions:` 明示宣言(sca.yml の `issues: write` 等)だけが昇格できるようにするため |
| Allow GitHub Actions to create and approve pull requests | **OFF**(チェックなし) | Actions からの PR 作成・承認は本運用で不要なため攻撃面を減らす |

**(推奨・任意)** 同じ画面の Actions permissions:

| 設定 | 値 | 理由(1行) |
|---|---|---|
| Allow specified actions and reusable workflows | `actions/*,` を許可リストに指定 | サードパーティ Action の supply chain リスクを遮断する(B-19 追補 §4.x.4.2。本実装は GitHub 公式 `actions/*` のみ使用) |

---

## 2. Repository Secrets を登録する

**場所**: Settings → Secrets and variables → Actions → Repository secrets → **New repository secret**

以下の5つを登録する(**値はあなたがこの画面でのみ入力**。ファイル・ログ・`_review_log.md` への値の記載は禁止):

| Secret 名 | 用途 | 参照 workflow | 理由(1行) |
|---|---|---|---|
| `DEPLOY_TOKEN_FRONTEND` | 静的ホスティングのデプロイ資格情報 | cd.yml (deploy-frontend) | フロント配送先の認証を YAML 直書きせず暗号化ストレージに隔離するため |
| `DEPLOY_TOKEN_BACKEND` | サーバーホスティングのデプロイ資格情報 | cd.yml (deploy-backend) | バックエンド配送先の認証を同上の理由で隔離するため |
| `PROD_JWT_SECRET` | 本番用 JWT 秘密鍵(サーバー環境変数 `DIETSUPPORT_JWT_SECRET` へ注入) | cd.yml (deploy-backend) | dev と別値の本番鍵をコード外で管理するため(使い回し禁止 / B-19) |
| `PROD_DATABASE_URL` | 本番 DB 接続 URL(→ `DIETSUPPORT_DATABASE_URL`) | cd.yml (deploy-backend) | 本番 DB の所在をリポジトリに残さないため |
| `PROD_ALLOWED_ORIGINS` | 本番 CORS 許可オリジン(→ `DIETSUPPORT_ALLOWED_ORIGINS`) | cd.yml (deploy-backend) | 本番ドメイン1つのみに CORS を絞る値を環境ごとに切り替えるため |

> **注**: デプロイ先が TBD のため、`DEPLOY_TOKEN_*` の値はデプロイ先確定後の登録でもよい(cd.yml は placeholder のため未登録でも赤にならない)。ローテーション方針(JWT 年1回、DEPLOY_TOKEN 半年に1回)は B-19 追補 §4.x.3.3 を参照し、カレンダーリマインドを設定する。

---

## 3. Branch protection rule(main)を設定する

**場所**: Settings → Branches → Branch protection rules → **Add rule** → Branch name pattern: `main`

**前提**: ci.yml が一度でも実行済みであること(必須ステータスチェックの候補に `CI / frontend` / `CI / backend` が現れるのは実行後)。

| 保護項目 | 設定 | 理由(1行) |
|---|---|---|
| Require a pull request before merging | **ON** | main への直接 push を防ぎ、必ず CI を通すため |
| Require approvals | **0** | 1名運用でセルフレビュー承認の空作業を避けるため |
| Require status checks to pass before merging | **ON** | CI が緑でなければマージ不可にするため(R-NF-019) |
| └ 必須ステータスチェックに `frontend` と `backend`(CI workflow の2 job)を追加 | **ON** | 片方でも赤なら全体をブロックするため |
| Require branches to be up to date before merging | **ON** | 古い base で緑になった PR の「合流後に壊れる」を防ぐため |
| Require linear history | **ON**(推奨) | 1名運用で main の履歴を追いやすくするため |
| Do not allow bypassing the above settings | **ON**(自分含む) | 管理者権限を持つ自分自身の操作ミスも防ぐため |
| Allow force pushes | **OFF** | main の履歴改変を不可にするため |
| Allow deletions | **OFF** | main ブランチの削除を不可にするため |

> **緊急時の一時解除**: 障害対応でどうしても直接デプロイが必要な場合のみ、この rule を一時的に無効化 → 対応 → 再有効化し、**理由・実施日時・戻し日時を `_review_log.md` に必ず記録**(B-17 追補 §4.7.5)。

---

## 4. Dependabot alerts / security updates を有効化する

**場所**: Settings → Code security(旧 Code security and analysis)

| 設定 | 値 | 理由(1行) |
|---|---|---|
| Dependabot alerts | **Enable** | 既知脆弱性(GitHub Advisory DB)の通知を受け、週次 SCA の間隙を埋めるため |
| Dependabot security updates | **Enable** | 脆弱性修正 PR を自動起票させ、対応リードタイムを短縮するため |

> `.github/dependabot.yml`(バージョン更新PR)はコードで設定済み。この画面の設定は「セキュリティ起点」の alert / 修正PR を有効にするもの。

---

## 5. 設定後の受入確認(AT-024/025/026)

| AT-ID | 手順 | 期待結果 |
|---|---|---|
| AT-024 | 意図的に失敗するテストを含む feature ブランチを push し、main への PR を作成 | ci.yml が赤 → **マージボタンが押せない**(上記 3. の必須チェックが効いている) |
| AT-025 | 全緑の PR を main にマージ | cd.yml が起動し Actions UI に成功が記録される(実配送は placeholder のため起動確認まで) |
| AT-026 | Actions → SCA (weekly) → **Run workflow** で手動起動 | npm audit / pip-audit が実行され、高/致命検知時のみ Issue が起票される(週次 cron は月曜 09:00 JST) |

---

## 6. 将来対応(初版では実施しない)

- **GitHub Environments(`production`)の導入**: 本番 secrets を Environment secrets に分離し、手動承認ゲートを設定(B-19 追補 §4.x.3.4)。初版はリポジトリ secrets のみで運用し、負担感を実測して判断。
- **Dependabot PR のマージ自動化**: 初版は手動マージ。頻度が高ければ別 CR で自動化(B-17 追補 §7)。
