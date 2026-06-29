"""TS-1 AT-018〜020 — 端末間同期(UC-13 / F-016)。

サーバー契約スタブを通して「端末間反映 / オフライン→復帰 / 競合 LWW 収束」を検証。
2端末は同一アカウント・別 device_id の push/pull で表現する。
"""
from _stubs.server import ServerApi

ACCT = "acct_A"


def rec(rid, updated_at, device_id="dev1", **extra):
    base = {"id": rid, "updated_at": updated_at, "device_id": device_id, "deleted": 0, "account_id": ACCT}
    base.update(extra)
    return base


def test_AT_018_cross_device_reflection():
    api = ServerApi()
    # 端末1が push したレコードが、(端末2の)pull で取得できる
    api.push(ACCT, {"meal_record": [rec("m1", "2026-06-24T10:00:00.000Z", device_id="dev1", meal_type="昼", eval="◎")]})
    pulled = api.pull(ACCT, since="2026-06-24T00:00:00.000Z")
    ids = [r["id"] for r in pulled["tables"].get("meal_record", [])]
    assert "m1" in ids


def test_AT_019_offline_then_sync():
    api = ServerApi()
    # オフライン中にためた変更を、復帰後に push → サーバーへ反映
    queued = {"weight_record": [rec("w1", "2026-06-24T08:00:00.000Z", weight=65.5)]}
    res = api.push(ACCT, queued)
    assert "w1" in res["applied"]


def test_AT_020_conflict_lww_converges():
    api = ServerApi()
    # 端末2(新しい)→ 端末1(古い)の順に同一レコードを push。LWW で新しい方に収束。
    api.push(ACCT, {"goal": [rec("g1", "2026-06-24T09:00:00.000Z", device_id="dev2", kcal=2000)]})
    res = api.push(ACCT, {"goal": [rec("g1", "2026-06-24T07:00:00.000Z", device_id="dev1", kcal=1800)]})
    assert "g1" not in res["applied"]  # 古い更新は無視
    pulled = api.pull(ACCT, since="2026-06-24T00:00:00.000Z")
    g = [r for r in pulled["tables"].get("goal", []) if r["id"] == "g1"][0]
    assert g["kcal"] == 2000  # 新しい方に収束
