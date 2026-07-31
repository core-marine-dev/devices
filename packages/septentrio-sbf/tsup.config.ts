import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  clean: true,
  format: ['esm', 'cjs'],
  minify: false,
  // Inline the private core's TYPES into our .d.ts too (noExternal only inlines JS),
  // so the published package carries no reference to the unpublished core.
  dts: {
    resolve: [/@coremarine\/protocol-core/]
  },
  splitting: true,
  // Runtime-neutral (node/deno/bun/web): src has no node: imports, no Buffer,
  // and `crc` is only used through its pure calculator subpaths.
  platform: 'neutral',
  // Bundle the private shared core into this package's dist so the published
  // package carries no dependency on the unpublished @coremarine/protocol-core.
  noExternal: [/@coremarine\/protocol-core/],
  outDir: './dist'
})
