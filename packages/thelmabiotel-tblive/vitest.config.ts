import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // ... Specify options here.
    coverage: {
      exclude: [
        // Pure data: the protocol lookup tables and the sentence table.
        '**/*/constants.ts',
        '**/*/definitions.ts',
        '**/*/index.ts',
        'dist/*',
        'tsup.config.ts',
        'vitest.config.ts'
      ],
      // Enforced so coverage cannot quietly regress. The handful of branches that
      // stay uncovered are guards the type system requires but the public API
      // cannot reach (a bounds check on an array that is always long enough, a
      // `typeof` on a value that is always a string).
      thresholds: {
        statements: 95,
        lines: 95,
        functions: 95,
        branches: 90
      }
    }
  }
})
