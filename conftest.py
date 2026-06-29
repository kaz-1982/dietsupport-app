import os
import sys

# ルートを基準に、サーバー実装(server.app.*)とテスト用ブリッジ(_stubs.*)の
# 双方を import 可能にする。
#   - ROOT          … `server` パッケージ解決用(_stubs/server.py のブリッジが import する)
#   - ROOT/tests    … `_stubs` パッケージ解決用(各 test_*.py が import する)
ROOT = os.path.dirname(os.path.abspath(__file__))
for _p in (ROOT, os.path.join(ROOT, "tests")):
    if _p not in sys.path:
        sys.path.insert(0, _p)
