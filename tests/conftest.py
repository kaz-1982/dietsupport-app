import os
import sys

# tests/ をパスに追加し、`_stubs` パッケージ(サーバー契約スタブ)を import 可能にする。
sys.path.insert(0, os.path.dirname(__file__))
