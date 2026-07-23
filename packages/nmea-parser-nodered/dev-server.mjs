// Local Node-RED for MANUAL/visual testing — see the node, its icon, wire it, inject
// data, watch output in the debug sidebar. No docker: node-red is a devDependency.
//   pnpm run nmea-parser:nodered:dev   ->   http://localhost:1880
//
// The built node (dist/) auto-loads from node_modules (workspace symlink). A starter
// flow (inject GGA -> cma-nmea-parser -> debug) is seeded on first run.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import RED from 'node-red'

const root = dirname(fileURLToPath(import.meta.url))
const ownName = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name
const userDir = join(root, '.dev-userdir')
const port = Number(process.env.PORT ?? 1880)

mkdirSync(userDir, { recursive: true })
const flowFile = join(userDir, 'flows.json')
if (!existsSync(flowFile)) {
  const sample = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\\r\\n'
  writeFileSync(flowFile, JSON.stringify([
    { id: 'tab', type: 'tab', label: 'NMEA demo' },
    { id: 'inj', type: 'inject', z: 'tab', name: 'GGA sample', props: [{ p: 'payload' }], payload: sample, payloadType: 'str', x: 160, y: 120, wires: [['nmea']] },
    { id: 'nmea', type: 'cma-nmea-parser', z: 'tab', name: '', memory: true, x: 400, y: 120, wires: [['dbg']] },
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

// Monorepo-only quirk: node-red auto-discovers EVERY sibling @coremarine/*-nodered from the
// shared workspace node_modules. Disable them so the palette shows only THIS node. (End users
// who `npm i` just this package never see the others — this is purely a local-dev convenience.)
const siblings = [...new Set(RED.nodes.getNodeList()
  .map((n) => n.module)
  .filter((m) => m?.startsWith('@coremarine/') && m !== ownName))]
for (const module of siblings) {
  try {
    await RED.runtime.nodes.setModuleState({ user: {}, module, enabled: false })
  } catch {
    // best-effort palette tidy-up; ignore if a module can't be disabled
  }
}
if (siblings.length) console.log(`  (dev) hid ${siblings.length} sibling CoreMarine node(s) from the palette\n`)
