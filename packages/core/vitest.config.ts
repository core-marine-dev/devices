import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      exclude: [
        '**/*/constants.ts',
        '**/*/types.ts',
        'dist/*',
        'tsup.config.ts',
      ],
      // ENFORCED FLOOR, so coverage cannot quietly regress. Set at 80 — the bar for this
      // repo — not at the achieved numbers, which are higher: a legitimate refactor should
      // not trip the build, but a real loss of cover should. Measured 2026-08-01.
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 80
      }
    },
  },
})
