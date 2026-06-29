"""Phase 4 実装ブリッジ:
テストは従来どおり `from _stubs.server import ServerApi, ...` を import するが、
実体は本実装 server.app.sync_server。
(テストコードは一切変更せず、conftest.py がルートを sys.path に追加して
 `server` パッケージを解決する。_stubs を実装へ張り替えて Green 化する TDD 方式)
"""
from server.app.sync_server import (  # noqa: F401
    ServerApi,
    AuthError,
    RateLimitError,
    ConflictError,
    ScopeError,
    ValidationError,
)

__all__ = ["ServerApi", "AuthError", "RateLimitError", "ConflictError", "ScopeError", "ValidationError"]
