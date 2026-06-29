"""UT-056〜062 — 同期 API(D-13 A-004 pull / A-005 push / D-15 §4.3.11)。

LWW・削除伝播・冪等・account スコープ・since フィルタの契約を検証。
現状はスタブが NotImplementedError を送出するため全ケース Red。
"""
import pytest
from _stubs.server import ServerApi, ScopeError

ACCT = "acct_A"


def rec(rid, updated_at, deleted=0, **extra):
    base = {"id": rid, "updated_at": updated_at, "device_id": "dev1", "deleted": deleted, "account_id": ACCT}
    base.update(extra)
    return base


def test_UT_056_push_newer_local_applied():
    api = ServerApi()
    # サーバーの既存版より新しい local を push → 適用される
    res = api.push(ACCT, {"weight_record": [rec("w1", "2026-06-24T10:00:00.000Z", weight=65.0)]})
    assert "w1" in res["applied"]


def test_UT_057_push_older_local_ignored():
    api = ServerApi()
    # サーバーより古い local → 無視(server_wins)
    res = api.push(ACCT, {"weight_record": [rec("w1", "2026-06-20T10:00:00.000Z", weight=99.0)]})
    assert "w1" not in res["applied"]
    assert any(c["id"] == "w1" and c["resolution"] == "server_wins" for c in res["conflicts"])


def test_UT_058_push_delete_propagation():
    api = ServerApi()
    res = api.push(ACCT, {"weight_record": [rec("w1", "2026-06-24T11:00:00.000Z", deleted=1)]})
    assert "w1" in res["applied"]
    pulled = api.pull(ACCT, since="2026-06-24T00:00:00.000Z")
    rows = pulled["tables"]["weight_record"]
    assert any(r["id"] == "w1" and r["deleted"] == 1 for r in rows)  # 論理削除が伝播


def test_UT_059_push_idempotent():
    api = ServerApi()
    change = {"weight_record": [rec("w1", "2026-06-24T12:00:00.000Z", weight=64.0)]}
    first = api.push(ACCT, change)
    second = api.push(ACCT, change)
    # 冪等: 2回目で状態が変わらない(重複適用なし)
    assert second["applied"] == [] or second["applied"] == first["applied"]
    pulled = api.pull(ACCT, since="2026-06-24T00:00:00.000Z")
    rows = [r for r in pulled["tables"]["weight_record"] if r["id"] == "w1"]
    assert len(rows) == 1


def test_UT_060_push_account_scope_rejected():
    api = ServerApi()
    foreign = rec("w9", "2026-06-24T12:00:00.000Z", weight=50.0)
    foreign["account_id"] = "acct_B"  # 他アカウント
    with pytest.raises(ScopeError):
        api.push(ACCT, {"weight_record": [foreign]})


def test_UT_061_pull_since_filter():
    api = ServerApi()
    pulled = api.pull(ACCT, since="2026-06-24T09:00:00.000Z")
    for r in pulled["tables"].get("weight_record", []):
        assert r["updated_at"] > "2026-06-24T09:00:00.000Z"  # since 以降のみ


def test_UT_062_pull_account_isolation():
    api = ServerApi()
    pulled = api.pull(ACCT, since=None)
    for table in pulled["tables"].values():
        for r in table:
            assert r["account_id"] == ACCT  # 他アカウントのレコードを含まない
