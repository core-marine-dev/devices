import { defineConfig } from 'tsup'

// Node-RED loads nodes via require() — CJS only. @coremarine/norsub-emru is a
// published runtime dependency, so it stays external (node-red installs it).
// Static assets (parser.html + icons) are copied post-build by copy-assets.mjs.
export default defineConfig({
  entry: ['src/parser.ts'],
  format: ['cjs'],
  platform: 'node',
  target: 'node22',
  clean: true,
  minify: false,
  dts: false,
  splitting: false,
  outDir: 'dist'
})
