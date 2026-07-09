import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  clean: true,
  format: ['esm', 'cjs'],
  minify: false,
  dts: true,
  splitting: true,
  // Runtime-neutral (node/deno/bun/web) — NMEA has no node: imports in src.
  platform: 'neutral',
  // Bundle the private shared core into this package's dist so the published
  // package carries no dependency on the unpublished @coremarine/protocol-core.
  noExternal: [/@coremarine\/protocol-core/],
  outDir: './dist'
})
