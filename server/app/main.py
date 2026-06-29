"""FastAPI ルート(D-13 A-001〜A-005)。ServerApi へ委譲し、例外を HTTP ステータスへ写像する。

起動:
    uvicorn server.app.main:app --reload --port 8000
データ正本は本番では SQLite に差し替える(ここではプロセス内 ServerApi インスタンス)。
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from server.app.sync_server import (
    AuthError,
    ConflictError,
    RateLimitError,
    ScopeError,
    ServerApi,
    ValidationError,
)

def _allowed_origins() -> List[str]:
    """CORS 許可オリジン。本番は DIETSUPPORT_ALLOWED_ORIGINS にドメインをカンマ区切りで設定。
    既定は Vite dev サーバー(localhost:5173)のみ。"""
    raw = os.environ.get("DIETSUPPORT_ALLOWED_ORIGINS", "http://localhost:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]


def _check_production_config() -> None:
    """本番(DIETSUPPORT_ENV=production)で開発用の既定 JWT 秘密鍵のまま起動するのを防ぐ。
    環境変数は呼び出し時に読む(起動時にチェック、テストからも検証可能)。"""
    env = os.environ.get("DIETSUPPORT_ENV", "development").lower()
    if env == "production" and not os.environ.get("DIETSUPPORT_JWT_SECRET"):
        raise RuntimeError(
            "DIETSUPPORT_JWT_SECRET が未設定です。本番環境では十分に長い秘密鍵を環境変数で設定してください。"
        )


_check_production_config()

app = FastAPI(title="DietSupport API", version="0.1.0")

# CORS: 許可オリジンは環境変数で制御(本番ドメインを設定)。既定は dev の localhost:5173。
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _security_headers(request: Request, call_next):
    """B-19: 最小限のセキュリティヘッダ。API は JSON のみ返すため CSP は default-src 'none' で十分。
    フロント(PWA)側の CSP は配信ホスト/SW 構成に依存するためデプロイ設定側で付与する。"""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault(
        "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
    )
    return response


# プロセス内シングルトン。SQLite ファイルで永続化(再起動・複数プロセスを跨いで保持)。
# DB パスは環境変数で上書き可。既定はリポジトリ直下 dietsupport.db。
_api = ServerApi(os.environ.get("DIETSUPPORT_DB", "dietsupport.db"))


class Credentials(BaseModel):
    email: str
    password: str


class PushBody(BaseModel):
    changes: Dict[str, Any]


def _require_account(authorization: Optional[str]) -> str:
    token = (authorization or "").replace("Bearer ", "").strip()
    account_id = _api.account_for_token(token)
    if account_id is None:
        raise HTTPException(status_code=401, detail="ログインが必要です")
    return account_id


@app.get("/api/v1/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# A-001
@app.post("/api/v1/auth/signup")
def signup(body: Credentials) -> Dict[str, Any]:
    try:
        return _api.signup(body.email, body.password)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))


# A-002
@app.post("/api/v1/auth/login")
def login(body: Credentials) -> Dict[str, Any]:
    try:
        return _api.login(body.email, body.password)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))


# A-003
@app.post("/api/v1/auth/logout")
def logout(authorization: Optional[str] = Header(default=None)) -> Dict[str, bool]:
    token = (authorization or "").replace("Bearer ", "").strip()
    _api.logout(token)
    return {"ok": True}


# A-004
@app.get("/api/v1/sync/pull")
def pull(
    since: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    account_id = _require_account(authorization)
    return _api.pull(account_id, since)


# A-005
@app.post("/api/v1/sync/push")
def push(
    body: PushBody,
    authorization: Optional[str] = Header(default=None),
    x_device_id: Optional[str] = Header(default=None),  # noqa: ARG001 (X-Device-Id / D-13)
) -> Dict[str, Any]:
    account_id = _require_account(authorization)
    try:
        return _api.push(account_id, body.changes)
    except ScopeError as e:
        raise HTTPException(status_code=403, detail=str(e))
