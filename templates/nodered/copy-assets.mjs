// Copy the Node-RED static assets (editor HTML + icons) next to the built JS.
// tsup only bundles JS; node-red needs parser.html and the icons/ folder in dist/.
import { cp, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const src = join(root, 'src')
const dist = join(root, 'dist')

await mkdir(dist, { recursive: true })
await cp(join(src, 'parser.html'), join(dist, 'parser.html'))
await cp(join(src, 'icons'), join(dist, 'icons'), { recursive: true })

console.log('copied parser.html + icons/ -> dist/')
