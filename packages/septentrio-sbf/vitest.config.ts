import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // ... Specify options here.
    coverage: {
      exclude: [
        '**/*/constants.ts',
        '**/*/types.ts',
        'dist/*',
        'tsup.config.ts'
      ]
    }
  }
})
