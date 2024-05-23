import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ... Specify options here.
    coverage: {
      exclude: [
        '**/*/constants.ts',
        '**/*/types.ts',
        'dist/*',
        'examples'
      ]
    }
  }
})
