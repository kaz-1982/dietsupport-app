"""追加(net-new)ハーネス: 本番化 / 認証堅牢化(HANDOFF §5.A / §5.D)の検証。

⚠️ これは設計から引き渡された凍結 85 件とは別物。実装側で新規追加したテストであり、
   既存テストの assertion は一切変更していない(本ファイルの追加のみ)。
検証対象:
  - レート制限の時間窓(「5回/分」)と恒久ロックの解消(sync_server.login)
  - サインアップのサーバー側入力検証(パスワード長 / メール形式)
  - main.py の本番設定ガード / CORS オリジンのパース / セキュリティヘッダ
"""
import os
import time

import pytest

from server.app.sync_server import (
    ServerApi,
    AuthError,
    RateLimitError,
    ValidationError,
    MAX_LOGIN_FAILURES,
    LOGIN_FAILURE_WINDOW_SECONDS,
    MIN_PASSWORD_LENGTH,
)

# TestClient が実 DB(dietsupport.db)を汚さないよう、main を import する前に in-memory を指定。
os.environ.setdefault("DIETSUPPORT_DB", ":memory:")
from fastapi.testclient import TestClient  # noqa: E402
from server.app.main import (  # noqa: E402
    app,
    _allowed_origins,
    _check_production_config,
)


# --- 5.D レート制限: 時間窓 + 恒久ロックの解消 ---

def test_login_locks_after_max_failures_within_window():
    api = ServerApi()
    last = None
    for _ in range(MAX_LOGIN_FAILURES + 1):
        try:
            api.login("me@example.com", "wrong")
        except (AuthError, RateLimitError) as e:
            last = e
    assert isinstance(last, RateLimitError)


def test_login_auto_unlocks_after_window():
    """窓より古い失敗は失効し、ロックが自動解除される(サーバー再起動を待たず復帰)。"""
    api = ServerApi()
    old = time.time() - (LOGIN_FAILURE_WINDOW_SECONDS + 60)
    api._failed["me@example.com"] = [old] * MAX_LOGIN_FAILURES  # 窓外の失敗を偽装
    res = api.login("me@example.com", "correct-horse")  # 失効済み → ログインできる
    assert res["token"]


def test_recent_failures_keep_lock_within_window():
    """窓内の失敗は数え続ける(正しいパスワードでも窓内はロックが維持される)。"""
    api = ServerApi()
    now = time.time()
    api._failed["me@example.com"] = [now] * MAX_LOGIN_FAILURES
    with pytest.raises(RateLimitError):
        api.login("me@example.com", "correct-horse")


# --- 5.D サインアップのサーバー側入力検証 ---

def test_signup_rejects_short_password():
    api = ServerApi()
    short = "a" * (MIN_PASSWORD_LENGTH - 1)
    with pytest.raises(ValidationError):
        api.signup("ok@example.com", short)


def test_signup_rejects_malformed_email():
    api = ServerApi()
    with pytest.raises(ValidationError):
        api.signup("not-an-email", "Str0ngPass!")


def test_signup_accepts_valid_credentials():
    api = ServerApi()
    res = api.signup("brand-new@example.com", "Str0ngPass!")
    assert res["token"] and res["account_id"]


# --- 5.A main.py: CORS / 本番ガード / セキュリティヘッダ ---

def test_allowed_origins_parses_csv(monkeypatch):
    monkeypatch.setenv("DIETSUPPORT_ALLOWED_ORIGINS", " https://a.example , https://b.example ")
    assert _allowed_origins() == ["https://a.example", "https://b.example"]


def test_allowed_origins_default_is_dev(monkeypatch):
    monkeypatch.delenv("DIETSUPPORT_ALLOWED_ORIGINS", raising=False)
    assert _allowed_origins() == ["http://localhost:5173"]


def test_production_requires_jwt_secret(monkeypatch):
    monkeypatch.setenv("DIETSUPPORT_ENV", "production")
    monkeypatch.delenv("DIETSUPPORT_JWT_SECRET", raising=False)
    with pytest.raises(RuntimeError):
        _check_production_config()


def test_production_ok_with_jwt_secret(monkeypatch):
    monkeypatch.setenv("DIETSUPPORT_ENV", "production")
    monkeypatch.setenv("DIETSUPPORT_JWT_SECRET", "x" * 32)
    _check_production_config()  # 例外を出さない


def test_development_does_not_require_secret(monkeypatch):
    monkeypatch.setenv("DIETSUPPORT_ENV", "development")
    monkeypatch.delenv("DIETSUPPORT_JWT_SECRET", raising=False)
    _check_production_config()  # dev は既定で起動可


def test_security_headers_present():
    client = TestClient(app)
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"
    assert "default-src 'none'" in r.headers["Content-Security-Policy"]


def test_signup_weak_password_returns_400():
    client = TestClient(app)
    r = client.post(
        "/api/v1/auth/signup",
        json={"email": "http-weak@example.com", "password": "short"},
    )
    assert r.status_code == 400
