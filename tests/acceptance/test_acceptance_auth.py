"""TS-1 AT-015〜017 — ログイン/サインアップ(UC-14 / F-017)。

サーバー契約スタブ(_stubs.server.ServerApi)を通して受け入れ基準を検証。
画面遷移(S-009→S-001)は UI(Playwright)で別途確認するが、認証成立=トークン発行を本層で担保。
"""
import pytest
from _stubs.server import ServerApi, AuthError


def test_AT_015_login_success_session():
    api = ServerApi()
    res = api.login("me@example.com", "correct-horse")
    assert res.get("token")  # 認証成功 → セッション確立(ホーム遷移可)


def test_AT_016_login_failure_friendly():
    api = ServerApi()
    with pytest.raises(AuthError):  # AUT-001 やさしい文言を UI で表示
        api.login("me@example.com", "wrong")


def test_AT_017_signup_creates_account():
    api = ServerApi()
    res = api.signup("first@example.com", "Str0ngPass!")
    assert res.get("token") and res.get("account_id")  # 初回サインアップでアカウント作成
