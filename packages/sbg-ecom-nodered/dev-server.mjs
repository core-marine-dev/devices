// Local Node-RED for MANUAL work — no docker (node-red is a devDependency).
//   pnpm run sbg-ecom:nodered:dev        -> edit a tracked scratch flow in tests/dev.flows.json
//   pnpm run sbg-ecom:nodered:examples   -> edit the SHIPPED example flow(s) in examples/
//
// Both open a fresh editor (welcome tour OFF) at http://localhost:1880 with this node under the
// CoreMarine palette category, pinned first. Node-RED reads/writes the on-disk flow file directly,
// so your edits persist there (deploy in the editor -> the file updates). node-red's own state
// lives in a gitignored userDir.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import RED from 'node-red'

const root = dirname(fileURLToPath(import.meta.url))
const mode = process.argv[2] === 'examples' ? 'examples' : 'dev'
const port = Number(process.env.PORT ?? 1880)

const NODE_TYPE = 'cma-sbg-ecom'
// A REAL EKF_EULER (0:6) frame from an SBG ELLIPSE, base64 — carved from the committed
// corpus at packages/sbg-ecom/tests/fixtures/stream-mixed.bin. eCom is binary, and the
// node accepts base64 on `payload` precisely so a flow file can carry a frame as text:
// an inject node cannot hold a Buffer.
const SAMPLE = '/1oGACAAmGQpnj9gx7t2hfi7KhW4v68bIzu6ASM7galSPdQIAAARRTM='

const starterFlow = (label) => JSON.stringify([
  { id: 'tab', type: 'tab', label, disabled: false, info: '' },
  { id: 'inj', type: 'inject', z: 'tab', name: 'EKF_EULER', props: [{ p: 'payload' }], payload: SAMPLE, payloadType: 'str', x: 170, y: 140, wires: [['node']] },
  { id: 'node', type: NODE_TYPE, z: 'tab', name: '', firmware: '', memory: true, x: 410, y: 140, wires: [['dbg']] },
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

// Fresh, throwaway node-red state dir each run -> a truly fresh instance every time
// (the flow file above lives in tests/ or examples/ and persists independently).
const userDir = mkdtempSync(join(tmpdir(), 'nr-sbg-'))
const cleanup = () => { try { rmSync(userDir, { recursive: true, force: true }) } catch {} }
process.on('SIGINT', () => { cleanup(); process.exit(0) })
process.on('SIGTERM', () => { cleanup(); process.exit(0) })
process.on('exit', cleanup)

let handler
const server = createServer((req, res) => (handler ? handler(req, res) : res.end()))
RED.init(server, {
  httpAdminRoot: '/',
  httpNodeRoot: '/api',
  userDir,
  flowFile, // absolute -> reads/writes the file in tests/ or examples/ directly
  flowFilePretty: true, // human-readable diffs when the file is committed
  editorTheme: {
    tours: false, // no first-run walkthrough
    // CoreMarine category first; built-in defaults keep their order after it. Dev-only:
    // palette category order is a per-editor setting, not shippable by a node package.
    palette: { categories: ['CoreMarine', 'subflows', 'common', 'function', 'network', 'sequence', 'parser', 'storage'] }
  },
  telemetry: { enabled: false }, // no "Enable Update Notifications" prompt / telemetry
  logging: { console: { level: 'info', metrics: false, audit: false } }
})
handler = RED.httpAdmin
await RED.start()

// Note: in this monorepo node-red auto-discovers every sibling @coremarine/*-nodered from the
// shared workspace node_modules, so they also appear under the CoreMarine palette category. That's
// accepted by design — end users who `npm i` just this package never see the others, and isolating
// the dev instance isn't worth the complexity for a dev-only convenience. This node registers under
// the CoreMarine category (see parser.html) and that category is pinned first (editorTheme above).

server.listen(port, () => {
  console.log(`\n  Node-RED (${mode}) → http://localhost:${port}\n  flow file: ${flowFile}\n`)
})
