"""UT-051〜055, 063 — 認証 API(D-13 A-001/A-002/A-003 / D-15 §4.3.11)。

サーバーロジック契約スタブ(_stubs.server.ServerApi)に対するテスト。
現状はスタブが NotImplementedError を送出するため全ケース Red。
Phase 4 で FastAPI ルート(ハッシュ照合・レート制限・トークン発行)に対応付けて Green 化する。
"""
import pytest
from _stubs.server import ServerApi, AuthError, RateLimitError, ConflictError


def test_UT_051_login_success():
    api = ServerApi()
    res = api.login("me@example.com", "correct-horse")  # 200
    assert "token" in res and "account_id" in res


def test_UT_052_login_wrong_password():
    api = ServerApi()
    with pytest.raises(AuthError):  # 401 / AUT-001
        api.login("me@example.com", "wrong")


def test_UT_053_login_rate_limited():
    api = ServerApi()
    last_error = None
    # 規定回数(例: 5)を超える連続失敗の後、次の試行で 429(AUT-002)
    for _ in range(6):
        try:
            api.login("me@example.com", "wrong")
        except (AuthError, RateLimitError) as e:
            last_error = e
    assert isinstance(last_error, RateLimitError)


def test_UT_054_signup_success():
    api = ServerApi()
    res = api.signup("new@example.com", "Str0ngPass!")  # 201
    assert "token" in res and "account_id" in res


def test_UT_055_signup_duplicate_email():
    api = ServerApi()
    with pytest.raises(ConflictError):  # 409 / AUT-004
        api.signup("me@example.com", "Str0ngPass!")


def test_UT_063_logout_success():
    api = ServerApi()
    res = api.logout("valid-token")  # 204(ボディなし)
    assert res is None or res == 204
