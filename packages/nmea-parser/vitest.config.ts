import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ... Specify options here.
    coverage: {
      exclude: [
        '**/*/constants.ts',
        '**/*/types.ts',
        'lib/*',
        'dist/*',
        'yaml-to-json.js'
      ]
    }
  }
})
