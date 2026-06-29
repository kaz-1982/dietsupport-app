"""DietSupport 同期・認証サーバーのコアロジック(D-13 A-001〜A-005)。

データ正本 = サーバー SQLite(D-8/D-10)。本クラスは SQLite で永続化する。
- 既定は in-memory(`:memory:`)= インスタンスごとに独立(テストの分離を保つ)。
- FastAPI 層(main.py)はファイルパスを渡し、プロセス/再起動を跨いで永続化する。
トークンは **ステートレス署名トークン(JWT 風 / HS256, stdlib)** で、サーバーに保存しない
(再起動でも失効しない)。logout はクライアント側の破棄に委ねる。

例外 → HTTP(D-14): AuthError->401(AUT-001) / RateLimitError->429(AUT-002)
                    ConflictError->409(AUT-004) / ScopeError->403(R-NF-017)
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timezone

# これを超える連続ログイン失敗の後は 429(AUT-002)。
MAX_LOGIN_FAILURES = 5
# 失敗回数を数える時間窓(秒)。設計の「5回/分」(D-13 §7)。
# 窓より古い失敗は失効するため、ロックは時間経過で自動解除される(恒久ロックを防ぐ)。
# 失敗履歴はプロセス内メモリのみで揮発する(再起動でリセット。永続化は 5.D の残課題)。
LOGIN_FAILURE_WINDOW_SECONDS = 60
# サインアップ時のパスワード最小長。クライアント側規則(8文字)のサーバー側バックストップ。
MIN_PASSWORD_LENGTH = 8
# サインアップのメール形式チェック(VAL-004)。厳密さより明白な誤入力の弾きが目的。
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# 自分専用の単一アカウント(profile §5)。初期シード。
SEED_EMAIL = "me@example.com"
SEED_PASSWORD = "correct-horse"
SEED_ACCOUNT_ID = "acct_me"

# 同期テストが用いる account スコープ。
SYNC_ACCOUNT_ID = "acct_A"

# 署名トークンの秘密鍵と有効期限。秘密鍵は環境変数で上書き可(本番は必須)。
# 既定値を固定しておくことで、開発時はサーバー再起動後もトークンが有効。
JWT_SECRET = os.environ.get("DIETSUPPORT_JWT_SECRET", "dietsupport-dev-secret-change-me").encode("utf-8")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30  # 30日


class AuthError(Exception):
    """401 相当(AUT-001: メール/パスワード不正)"""


class RateLimitError(Exception):
    """429 相当(AUT-002: ログイン試行過多)"""


class ConflictError(Exception):
    """409 相当(AUT-004: email 既存)"""


class ScopeError(Exception):
    """403 相当(R-NF-017: account スコープ外のレコード改変拒否)"""


class ValidationError(Exception):
    """400 相当(VAL-*: 入力検証エラー — メール形式 / パスワード強度)"""


def _validate_credentials(email, password):
    """サインアップ入力の最小検証(D-14 VAL-*)。login では検証しない(既存アカウント救済のため)。"""
    if not email or not _EMAIL_RE.match(email):
        raise ValidationError("メールアドレスの形式を確認してください")
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        raise ValidationError(f"パスワードは{MIN_PASSWORD_LENGTH}文字以上で設定してください")


def _hash_pw(password, salt):
    """PBKDF2-HMAC-SHA256 でハッシュ化(パスワードは平文保管しない)。"""
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000).hex()


def _now():
    return datetime.now(timezone.utc).isoformat()


# --- 署名トークン(JWT 風 / HS256・stdlib) ---
def _b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def _b64u_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _sign_token(account_id: str, now_epoch: int) -> str:
    payload = {"sub": account_id, "exp": now_epoch + TOKEN_TTL_SECONDS}
    body = _b64u(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = _b64u(hmac.new(JWT_SECRET, body.encode("ascii"), hashlib.sha256).digest())
    return f"{body}.{sig}"


def _verify_token(token: str, now_epoch: int):
    try:
        body, sig = token.split(".", 1)
        expected = _b64u(hmac.new(JWT_SECRET, body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(_b64u_decode(body))
        if int(payload.get("exp", 0)) < now_epoch:
            return None
        return payload.get("sub")
    except Exception:
        return None


class ServerApi:
    """A-001〜A-005 のロジック契約。FastAPI ルートはここへ委譲する。

    db_path 既定 ":memory:" は接続ごとに独立した DB(テストはインスタンス単位で分離)。
    main.py はファイルパスを渡して永続化する。
    """

    def __init__(self, db_path: str = ":memory:"):
        self._db = sqlite3.connect(db_path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        self._failed = {}  # email -> list[float] 直近の失敗時刻(時間窓で失効・揮発)
        self._init_schema()
        self._seed()

    def _init_schema(self):
        self._db.executescript(
            """
            CREATE TABLE IF NOT EXISTS account(
              email TEXT PRIMARY KEY,
              salt BLOB NOT NULL,
              pw_hash TEXT NOT NULL,
              account_id TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sync_record(
              account_id TEXT NOT NULL,
              tbl TEXT NOT NULL,
              id TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              deleted INTEGER NOT NULL DEFAULT 0,
              payload TEXT NOT NULL,
              PRIMARY KEY (account_id, tbl, id)
            );
            CREATE INDEX IF NOT EXISTS idx_sync_scope ON sync_record(account_id, updated_at);
            """
        )
        self._db.commit()

    def _seed(self):
        # シードアカウント(冪等)
        if self._db.execute("SELECT 1 FROM account WHERE email=?", (SEED_EMAIL,)).fetchone() is None:
            salt = secrets.token_bytes(16)
            self._db.execute(
                "INSERT INTO account(email,salt,pw_hash,account_id,created_at) VALUES(?,?,?,?,?)",
                (SEED_EMAIL, salt, _hash_pw(SEED_PASSWORD, salt), SEED_ACCOUNT_ID, _now()),
            )
        # 同期 LWW テスト用のサーバー既存レコード w1(acct_A / 2026-06-22)。冪等。
        if self._db.execute(
            "SELECT 1 FROM sync_record WHERE account_id=? AND tbl=? AND id=?",
            (SYNC_ACCOUNT_ID, "weight_record", "w1"),
        ).fetchone() is None:
            w1 = {
                "id": "w1",
                "updated_at": "2026-06-22T00:00:00.000Z",
                "account_id": SYNC_ACCOUNT_ID,
                "device_id": "seed",
                "deleted": 0,
                "weight": 70.0,
            }
            self._db.execute(
                "INSERT INTO sync_record(account_id,tbl,id,updated_at,deleted,payload) VALUES(?,?,?,?,?,?)",
                (SYNC_ACCOUNT_ID, "weight_record", "w1", w1["updated_at"], 0, json.dumps(w1)),
            )
        self._db.commit()

    def _issue_token(self, account_id):
        return _sign_token(account_id, int(time.time()))

    # A-001 signup(email, password) -> {"token","account_id"} / ValidationError(400) / ConflictError(409)
    def signup(self, email, password):
        _validate_credentials(email, password)
        with self._lock:
            if self._db.execute("SELECT 1 FROM account WHERE email=?", (email,)).fetchone():
                raise ConflictError("このメールアドレスは既に登録されています")
            salt = secrets.token_bytes(16)
            account_id = "acct_" + secrets.token_hex(8)
            self._db.execute(
                "INSERT INTO account(email,salt,pw_hash,account_id,created_at) VALUES(?,?,?,?,?)",
                (email, salt, _hash_pw(password, salt), account_id, _now()),
            )
            self._db.commit()
        return {"token": self._issue_token(account_id), "account_id": account_id}

    # A-002 login(email, password) -> {"token","account_id"} / AuthError(401) / RateLimitError(429)
    def login(self, email, password):
        with self._lock:
            now = time.time()
            # 時間窓内の失敗だけを残す(古い失敗は失効 → ロックは自動解除される)。
            recent = [t for t in self._failed.get(email, ()) if now - t < LOGIN_FAILURE_WINDOW_SECONDS]
            if len(recent) >= MAX_LOGIN_FAILURES:
                self._failed[email] = recent
                raise RateLimitError("試行回数が多いため、しばらくしてからお試しください")
            row = self._db.execute(
                "SELECT salt,pw_hash,account_id FROM account WHERE email=?", (email,)
            ).fetchone()
            if row is None or _hash_pw(password, row["salt"]) != row["pw_hash"]:
                recent.append(now)
                self._failed[email] = recent
                raise AuthError("メールアドレスまたはパスワードが正しくありません")
            self._failed[email] = []  # 成功でリセット
            return {"token": self._issue_token(row["account_id"]), "account_id": row["account_id"]}

    # A-003 logout(token) -> None(204)。ステートレスのためサーバー側破棄は不要。
    def logout(self, token):
        return None

    def account_for_token(self, token):
        """署名トークンを検証して account_id を返す(無効/期限切れは None)。"""
        return _verify_token(token or "", int(time.time()))

    # A-004 pull(account_id, since) -> {"server_time","tables"}(updated_at>since, account スコープ)
    def pull(self, account_id, since):
        with self._lock:
            rows = self._db.execute(
                "SELECT tbl,payload FROM sync_record WHERE account_id=?", (account_id,)
            ).fetchall()
        tables = {}
        for r in rows:
            rec = json.loads(r["payload"])
            if since is None or rec["updated_at"] > since:
                tables.setdefault(r["tbl"], []).append(rec)
        return {"server_time": _now(), "tables": tables}

    # A-005 push(account_id, changes) -> {"applied","conflicts","server_time"}
    #   LWW(updated_at)・削除伝播・冪等・account スコープ。
    def push(self, account_id, changes):
        applied = []
        conflicts = []
        with self._lock:
            # スコープ検証(他人のデータは1件でも含まれたら拒否・部分適用しない)
            for _table, rows in changes.items():
                for row in rows:
                    if row.get("account_id") != account_id:
                        raise ScopeError("アカウントの範囲外のデータは変更できません")
            # 適用(LWW)
            for table, rows in changes.items():
                for row in rows:
                    rid = row["id"]
                    ex = self._db.execute(
                        "SELECT updated_at FROM sync_record WHERE account_id=? AND tbl=? AND id=?",
                        (account_id, table, rid),
                    ).fetchone()
                    if ex is None or row["updated_at"] > ex["updated_at"]:
                        self._db.execute(
                            "INSERT OR REPLACE INTO sync_record(account_id,tbl,id,updated_at,deleted,payload)"
                            " VALUES(?,?,?,?,?,?)",
                            (account_id, table, rid, row["updated_at"], int(row.get("deleted", 0)), json.dumps(row)),
                        )
                        applied.append(rid)
                    else:
                        conflicts.append({"id": rid, "resolution": "server_wins"})
            self._db.commit()
        return {"applied": applied, "conflicts": conflicts, "server_time": _now()}
