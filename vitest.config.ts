import { defineConfig } from 'vitest/config';

// Domain/Application/UI の単体(UT-*)と受け入れ(AT-*)。
// サーバー API(UT-051〜063 / AT-015〜020)は pytest 側で実行する。
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/acceptance/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', 'html'],
    },
  },
});
