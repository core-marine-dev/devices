// ESLint flat config (plain JS — Node runs it natively, no jiti dep).
// Toolchain: typescript-eslint (TS parser + recommended) + @stylistic (formatting
// rules: no-semi, single-quotes, 2-space) + eslint-plugin-sonarjs (SonarLint rules)
// + eslint-plugin-perfectionist (import ordering matching our // built-in →
// // installed → // coded convention). Run: `pnpm lint` (check) or `pnpm lint:fix`.

// installed
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import perfectionist from 'eslint-plugin-perfectionist'
import sonarjs from 'eslint-plugin-sonarjs'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/node_modules/',
    '**/coverage/',
    'templates/',
    'misc/',
    'pnpm-lock.yaml',
    '**/vitest.config.ts',
    '**/tsup.config.ts',
    '**/gpstime.d.ts',
    '**/legacy/',
  ]),

  // TypeScript files (src + tests) — all library packages.
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylistic,
      perfectionist,
      sonarjs,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true },
    },
    rules: {
      // ── typescript-eslint: recommended ──
      ...tseslint.configs.recommended[0].rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // ── @stylistic: house style (no semicolons, single quotes, 2-space) ──
      ...stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: false,
        jsx: false,
        arrowParens: 'always',
      }).rules,

      // Overrides: stylistic customize() defaults don't match our house style
      // on two points — operator-linebreak wants `=` at line start (we want it
      // at line end, like a normal assignment), and brace-style defaults to
      // stroustrup (we use 1tbs / K&R: `} catch {`, `} else {`).
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],

      // ── perfectionist: import ordering matching // built-in → // installed → // coded.
      //    partitionByComment preserves our three marker comments as independent
      //    sort partitions, so eslint --fix never reorders across blocks — it only
      //    alphabetizes within each block. groups still classifies by import type so
      //    a builtin landing in the // coded block is flagged. ──
      'perfectionist/sort-imports': ['error', {
        type: 'alphabetical',
        order: 'asc',
        ignoreCase: true,
        newlinesBetween: 1,
        groups: [
          ['value-builtin', 'type-builtin'],
          ['value-external', 'type-external'],
          ['value-internal', 'type-internal'],
        ],
        partitionByComment: '^(built-in|installed|coded)$',
        internalPattern: ['^\\./'],
        environment: 'node',
      }],

      // ── sonarjs: SonarLint rules (~120: complexity, cognitive-load, no-magic-numbers,
      //    no-duplicate-string, no-unused-collection, no-small-switch, …). Recommended
      //    set, NOT auto-fixed — surfaced for triage. ──
      ...sonarjs.configs.recommended.rules,
      // Rules Sonar ships but marks `recommended: false` — we want them on.
      // Tight thresholds enforce the small-functions house style.
      'sonarjs/max-lines-per-function': ['error', { maximum: 50 }],
      'sonarjs/cyclomatic-complexity': ['error', { threshold: 10 }],
      'sonarjs/cognitive-complexity': ['error', 15],
    },
  },

  // Test files: describe() bodies are inherently setup-heavy (beforeAll/afterAll
  // + sequential cases). max-lines-per-function is exempted for tests; all other
  // Sonar/stylistic rules still apply.
  {
    files: ['**/tests/**/*.ts'],
    rules: {
      'sonarjs/max-lines-per-function': 'off',
    },
  },
])
