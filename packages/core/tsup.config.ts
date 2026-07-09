import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  clean: true,
  format: ['esm', 'cjs'],
  minify: false,
  dts: true,
  splitting: true,
  // Runtime-neutral: the shared contract must run on node, deno, bun and the
  // web — no platform-specific globals injected.
  platform: 'neutral',
  outDir: './dist',
})
