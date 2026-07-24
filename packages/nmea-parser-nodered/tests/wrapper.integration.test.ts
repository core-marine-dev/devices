// built-in
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

// installed
import RED from 'node-red'

// Boot the REAL node-red runtime headless (public API only), let it auto-load our
// built node from node_modules, deploy a flow via the flowFile, and capture output
// from a tiny test-sink. No node-red-node-test-helper (broken on node-red 5 + pnpm).

// @types/node-red models the RED object passed to a node's init(), not the embedded
// runtime we boot here — so init()/nodes.registerType()/createNode() aren't on its
// type even though they exist at runtime. Cast to the minimal surface we use.
interface SinkNode {
  on: (event: string, cb: (msg: Record<string, unknown>) => void) => void
}
const nr = RED as unknown as {
  init: (server: unknown, settings: Record<string, unknown>) => void
  start: () => Promise<void>
  stop: () => Promise<void>
  nodes: {
    registerType: (type: string, ctor: (this: SinkNode, config: object) => void) => void
    createNode: (node: SinkNode, config: object) => void
  }
}

const GGA = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n'

let userDir: string
const captured: Record<string, unknown>[] = []

const flow = [
  { id: 'tab1', type: 'tab', label: 'Test' },
  { id: 'inj', type: 'inject', z: 'tab1', props: [{ p: 'payload' }], payload: GGA, payloadType: 'str', once: true, onceDelay: 0.1, wires: [['n1']] },
  { id: 'n1', type: 'cma-nmea-parser', z: 'tab1', name: 'NMEAParser', memory: true, wires: [['sink']] },
  { id: 'sink', type: 'test-sink', z: 'tab1' },
]

before(async () => {
  userDir = mkdtempSync(join(tmpdir(), 'nr-nmea-'))
  writeFileSync(join(userDir, 'flows.json'), JSON.stringify(flow))
  nr.init(createServer(), {
    httpAdminRoot: false,
    httpNodeRoot: false,
    disableEditor: true,
    userDir,
    logging: { console: { level: 'off' } },
    flowFile: 'flows.json',
  })
  // a sink node to capture what our node emits
  nr.nodes.registerType('test-sink', function (this: SinkNode, config: object) {
    nr.nodes.createNode(this, config)
    this.on('input', (msg) => {
      captured.push(msg)
    })
  })
  await nr.start()
  // wait for the `once` inject to fire and flow through
  await new Promise((resolve) => setTimeout(resolve, 800))
})

after(async () => {
  await nr.stop()
  rmSync(userDir, { recursive: true, force: true })
})

test('real node-red loads the node and parses an injected sentence to CMA[]', () => {
  const msg = captured.at(-1)
  assert.ok(msg, 'the node produced an output message')
  const payload = msg.payload as { id: string, protocol: { name: string } }[]
  assert.ok(Array.isArray(payload), 'payload is an array (CMA[])')
  assert.equal(payload[0].id, 'GGA')
  assert.equal(payload[0].protocol.name, 'NMEA')
})

test('output CMA carries the core timestamp metadata', () => {
  const payload = captured.at(-1)!.payload as { metadata: { timestamp: Record<string, number> } }[]
  const ts = payload[0].metadata.timestamp
  assert.ok(typeof ts.received === 'number' && typeof ts.parsed === 'number', 'received + parsed stamped')
})
