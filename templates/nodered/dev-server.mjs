// Local Node-RED for MANUAL/visual testing — see the node, its icon, wire it, inject
// data, watch output in the debug sidebar. No docker: node-red is a devDependency.
//   pnpm run <lib>:nodered:dev   ->   http://localhost:1880
//
// The built node (dist/) auto-loads from node_modules (workspace symlink). A starter
// flow (inject -> cma-TODO: -> debug) is seeded on first run.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import RED from 'node-red'

const root = dirname(fileURLToPath(import.meta.url))
const userDir = join(root, '.dev-userdir')
const port = Number(process.env.PORT ?? 1880)

mkdirSync(userDir, { recursive: true })
const flowFile = join(userDir, 'flows.json')
if (!existsSync(flowFile)) {
  // TODO: a representative sample input for your protocol
  const sample = 'TODO: sample payload'
  writeFileSync(flowFile, JSON.stringify([
    { id: 'tab', type: 'tab', label: 'demo' },
    { id: 'inj', type: 'inject', z: 'tab', name: 'sample', props: [{ p: 'payload' }], payload: sample, payloadType: 'str', x: 160, y: 120, wires: [['node']] },
    // TODO: node type must match package.json node-red.nodes + parser.html
    { id: 'node', type: 'cma-TODO:', z: 'tab', name: '', memory: true, x: 400, y: 120, wires: [['dbg']] },
    { id: 'dbg', type: 'debug', z: 'tab', name: 'parsed', active: true, complete: 'payload', x: 620, y: 120, wires: [] }
  ], null, 2))
}

let handler
const server = createServer((req, res) => (handler ? handler(req, res) : res.end()))
RED.init(server, {
  httpAdminRoot: '/',
  httpNodeRoot: '/api',
  userDir,
  flowFile: 'flows.json',
  logging: { console: { level: 'info', metrics: false, audit: false } }
})
handler = RED.httpAdmin

server.listen(port, () => {
  console.log(`\n  Node-RED (dev) → http://localhost:${port}  (userDir: ${userDir})\n`)
})
await RED.start()
