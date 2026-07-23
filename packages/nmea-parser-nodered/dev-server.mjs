// Local Node-RED for MANUAL work — no docker (node-red is a devDependency).
//   pnpm run nmea-parser:nodered:dev        -> edit a scratch flow in tests/ (gitignored)
//   pnpm run nmea-parser:nodered:examples   -> edit the SHIPPED example flow(s) in examples/
//
// Both open a fresh editor (welcome tour OFF) at http://localhost:1880 with ONLY this node in
// the palette. Node-RED reads/writes the on-disk flow file directly, so your edits persist there
// (deploy in the editor -> the file updates). node-red's own state lives in a gitignored userDir.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import RED from 'node-red'

const root = dirname(fileURLToPath(import.meta.url))
const ownName = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name
const mode = process.argv[2] === 'examples' ? 'examples' : 'dev'
const port = Number(process.env.PORT ?? 1880)

// TODO (template): node type + a representative sample input for your protocol
const NODE_TYPE = 'cma-nmea-parser'
const SAMPLE = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n'

const starterFlow = (label) => JSON.stringify([
  { id: 'tab', type: 'tab', label, disabled: false, info: '' },
  { id: 'inj', type: 'inject', z: 'tab', name: 'sample', props: [{ p: 'payload' }], payload: SAMPLE, payloadType: 'str', x: 170, y: 140, wires: [['node']] },
  { id: 'node', type: NODE_TYPE, z: 'tab', name: '', memory: true, file: '', x: 410, y: 140, wires: [['dbg']] },
  { id: 'dbg', type: 'debug', z: 'tab', name: 'output', active: true, tosidebar: true, complete: 'payload', targetType: 'msg', x: 630, y: 140, wires: [] }
], null, 2)

// Resolve the flow file per mode (absolute path — node-red supports it).
let flowFile
if (mode === 'examples') {
  const dir = join(root, 'examples')
  mkdirSync(dir, { recursive: true })
  const found = readdirSync(dir).filter((f) => f.endsWith('.json'))
  flowFile = join(dir, process.env.EXAMPLE ?? found[0] ?? 'Example.json')
  if (!existsSync(flowFile)) writeFileSync(flowFile, starterFlow('Example'))
} else {
  const dir = join(root, 'tests')
  mkdirSync(dir, { recursive: true })
  flowFile = join(dir, 'dev.flows.json')
  if (!existsSync(flowFile)) writeFileSync(flowFile, starterFlow('dev'))
}

const userDir = join(root, '.dev-userdir')
mkdirSync(userDir, { recursive: true })

let handler
const server = createServer((req, res) => (handler ? handler(req, res) : res.end()))
RED.init(server, {
  httpAdminRoot: '/',
  httpNodeRoot: '/api',
  userDir,
  flowFile, // absolute -> reads/writes the file in tests/ or examples/ directly
  flowFilePretty: true, // human-readable diffs when the file is committed
  editorTheme: { tours: false }, // no first-run walkthrough
  logging: { console: { level: 'info', metrics: false, audit: false } }
})
handler = RED.httpAdmin

server.listen(port, () => {
  console.log(`\n  Node-RED (${mode}) → http://localhost:${port}\n  flow file: ${flowFile}\n`)
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
