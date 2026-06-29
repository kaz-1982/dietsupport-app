// Phase 3.5 ゲート2: Red テスト用「未実装」ヘルパ。
// Phase 4(実装)で各 SUT(下記 domain.ts / application.ts のスタブ本体)を
// 本実装に置き換えて Green 化する。現状はこの関数が必ず throw するため、
// すべてのテストは期待値アサーションに到達せず Red(失敗)になる。
export function notImplemented(name: string): never {
  throw new Error(`NOT_IMPLEMENTED: ${name} — implement in Phase 4 to make this test pass`);
}
