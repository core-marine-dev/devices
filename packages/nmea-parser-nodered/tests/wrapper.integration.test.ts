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

interface InputNode {
  receive: (msg: Record<string, unknown>) => void
}
const nr = RED as unknown as {
  init: (server: unknown, settings: Record<string, unknown>) => void
  start: () => Promise<void>
  stop: () => Promise<void>
  nodes: {
    registerType: (type: string, ctor: (this: SinkNode, config: object) => void) => void
    createNode: (node: SinkNode, config: object) => void
    getNode: (id: string) => InputNode | null
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

// Feed the live node a message and return what came out the other side.
const roundTrip = async (input: Record<string, unknown>): Promise<Record<string, unknown>> => {
  captured.length = 0
  nr.nodes.getNode('n1')!.receive(input)
  await new Promise((resolve) => setTimeout(resolve, 300))
  return captured[0]
}

// The definitions channel is `msg.sentences` (3.0.0). It takes the library's own
// vocabulary — addSentences / getSentencesByProtocol — and leaves the word
// "protocol" free for the DEVICE-protocol meaning it has in the sibling
// norsub wrapper's `msg.protocol`.
test('msg.sentences GET is answered on msg.sentences', async () => {
  const msg = await roundTrip({ sentences: { command: 'get' } })
  const sentences = msg.sentences as Record<string, unknown[]> | undefined
  assert.ok(sentences !== undefined, 'answered')
  assert.ok('NMEA' in sentences, 'grouped by protocol name')
  assert.ok(!('protocols' in msg), 'the old key is never produced')
})

test('the OLD msg.protocols key is ignored — renaming it is the breaking change', async () => {
  const msg = await roundTrip({ protocols: { command: 'get' } })
  assert.ok(!('sentences' in msg), 'nothing was asked, so nothing is answered')
  // passed straight through untouched, like any unrelated msg property
  assert.deepEqual(msg.protocols, { command: 'get' })
})

test('msg.sentences SET expands the parser, and its errors report under the new name', async () => {
  const yaml = [
    'protocols:',
    '  - protocol: DEMO',
    '    version: \'1.0\'',
    '    standard: false',
    '    sentences:',
    '      - id: PDEMO',
    '        payload:',
    '          - name: a',
    '            type: float64',
  ].join('\n')
  const set = await roundTrip({ sentences: { command: 'set', content: yaml } })
  assert.ok('DEMO' in (set.sentences as Record<string, unknown>), 'the new protocol is registered')

  const parsed = await roundTrip({ payload: '$PDEMO,12.5*4E\r\n' })
  const payload = parsed.payload as { id: string, protocol: { name: string } }[]
  assert.equal(payload[0].id, 'PDEMO')
  assert.equal(payload[0].protocol.name, 'DEMO')

  const bad = await roundTrip({ sentences: { command: 'set', content: ':\n::bad' } })
  assert.match(String(bad.sentences), /^sentences:/)
})
