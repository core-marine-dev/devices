// Local Node-RED for MANUAL work — no docker (node-red is a devDependency).
//   pnpm run norsub-emru:nodered:dev        -> edit a tracked scratch flow in tests/dev.flows.json
//   pnpm run norsub-emru:nodered:examples   -> edit the SHIPPED example flow(s) in examples/
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

const NODE_TYPE = 'cma-norsub-parser'
// A real PNORSUB8: T1/T2, then roll/pitch/heading, motion, periods, amplitudes, status.
const SAMPLE = '$PNORSUB8,1234567,890,1.234,-0.567,123.456,0.101,-0.202,0.303,0.012,-0.034,0.056,0.021,-0.043,0.065,0.077,-0.088,9.807,7.1,8.2,9.3,0.41,0.52,0.63,4160749567*40\r\n'

const starterFlow = (label) => JSON.stringify([
  { id: 'tab', type: 'tab', label, disabled: false, info: '' },
  { id: 'inj', type: 'inject', z: 'tab', name: 'sample', props: [{ p: 'payload' }], payload: SAMPLE, payloadType: 'str', x: 170, y: 140, wires: [['node']] },
  { id: 'node', type: NODE_TYPE, z: 'tab', name: '', protocol: 'nmea', memory: true, file: '', x: 410, y: 140, wires: [['dbg']] },
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
const userDir = mkdtempSync(join(tmpdir(), 'nr-cma-'))
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
