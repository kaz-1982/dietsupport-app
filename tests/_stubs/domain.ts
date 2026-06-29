// Phase 4 実装ブリッジ:
// テストは従来どおり '../_stubs/domain' を import するが、実体は本実装 src/domain に置く。
// (テストコードは一切変更せず、_stubs を実装へ張り替えて Green 化する TDD 方式)
export * from '../../src/domain';
