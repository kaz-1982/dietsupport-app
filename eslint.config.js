// ESLint flat config(CI: B-17 §4.7.3.1 frontend job の lint step)
// Vite React+TS テンプレート準拠。対象は TS/TSX のみ(ビルド成果物・依存は除外)。
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // --- 既存コード(Phase 3.5 TDD 資産)を baseline とした調整。厳格化は Phase 4 以降の別タスク ---
      // 85件の Red→Green テスト資産が any を多用(コード書き換えは CR-001 のスコープ外)
      '@typescript-eslint/no-explicit-any': 'off',
      // `_` prefix は「意図して未使用」の規約
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 日本語 UI テキスト・コメント中の全角空白を許容(コード部分は引き続き検出)
      'no-irregular-whitespace': ['error', { skipComments: true, skipJSXText: true, skipStrings: true, skipTemplates: true }],
      // 既存 1 箇所が該当。修正はスコープ外のため警告に降格(Phase 4 で解消)
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
)
