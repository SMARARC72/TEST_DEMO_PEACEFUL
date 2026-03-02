import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // ── Accessibility (WCAG 2.1 AA) ──────────────────
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/heading-has-content': ['error', { components: [] }],
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-access-key': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-redundant-roles': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',

      // ── Code complexity ────────────────────────────────
      'complexity': ['warn', { max: 25 }],
      'max-depth': ['warn', { max: 5 }],
      'max-lines-per-function': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],

      // ── React refresh — allow hooks alongside components ──
      'react-refresh/only-export-components': ['warn', { allowExportNames: ['useStepUpAuth', 'useAnnounce', 'useAnnouncerStore', 'getErrorLog', 'useFeatureFlag', 'useFeatureFlags', 'useFeatureFlagStore', 'isFeatureEnabled'] }],

      // ── React hooks compiler rules — warn-only for now ──
      'react-hooks/rules-of-hooks': 'error',

      // ── Synthetic data prevention ──────────────────────
      'no-restricted-imports': ['error', {
        patterns: ['**/public/js/*', '**/state.js', '**/api-bridge.js'],
      }],

      // ── TypeScript adjustments ──────────────────────────
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // ── Console control ────────────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
])
