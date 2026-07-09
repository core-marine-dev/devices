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
    },
  },
})
