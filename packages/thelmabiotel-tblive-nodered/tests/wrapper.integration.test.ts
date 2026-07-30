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

// The 1.0.1 datasheet's own detection example (receiver-1.0.1.pdf S8.2.1), and its
// R64K example, whose `data` field is legitimately EMPTY.
const DETECTION = '$1000042,1589557202,615,S64K,1285,0,24,69,11\r'
const NO_DATA = '$1000042,1589557202,897,R64K,1023,,24,69,9\r'

let userDir: string
const captured: Record<string, unknown>[] = []

const flow = [
  { id: 'tab1', type: 'tab', label: 'Test' },
  { id: 'inj', type: 'inject', z: 'tab1', props: [{ p: 'payload' }], payload: DETECTION, payloadType: 'str', once: true, onceDelay: 0.1, wires: [['n1']] },
  // A second inject exercising the diagnostic keys and the empty-data case together.
  {
    id: 'inj2',
    type: 'inject',
    z: 'tab1',
    props: [
      { p: 'payload' },
      { p: 'firmware', v: '{"command":"get"}', vt: 'json' },
      { p: 'ids', v: 'true', vt: 'bool' },
      { p: 'definition', v: '{"id":"receiver","protocol":"1.0.2"}', vt: 'json' },
      { p: 'fake', v: '{"id":"emitter","protocol":"1.0.2"}', vt: 'json' },
    ],
    payload: NO_DATA,
    payloadType: 'str',
    once: true,
    onceDelay: 0.4,
    wires: [['n1']],
  },
  { id: 'n1', type: 'cma-thelmabiotel-tblive', z: 'tab1', name: 'TBLiveParser', firmware: '', memory: true, wires: [['sink']] },
  { id: 'sink', type: 'test-sink', z: 'tab1' },
]

before(async () => {
  userDir = mkdtempSync(join(tmpdir(), 'nr-tblive-'))
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
  // wait for both `once` injects to fire and flow through
  await new Promise((resolve) => setTimeout(resolve, 1200))
})

after(async () => {
  await nr.stop()
  rmSync(userDir, { recursive: true, force: true })
})

interface CMA {
  id: string
  raw: string
  protocol: { name: string, version: string }
  payload: { name: string, value: unknown, metadata?: Record<string, unknown> }[]
  metadata: { mode: string, timestamp: Record<string, number>, payload?: Record<string, unknown> }
  errors?: string[]
}

test('real node-red loads the node and parses an injected detection to CMA[]', () => {
  const msg = captured.at(0)
  assert.ok(msg, 'the node produced an output message')
  const payload = msg.payload as CMA[]
  assert.ok(Array.isArray(payload), 'payload is an array (CMA[])')
  assert.equal(payload[0].id, 'emitter')
  assert.equal(payload[0].protocol.name, 'TBLive')
  assert.equal(payload[0].protocol.version, '1.0.1')
  assert.equal(payload[0].raw, DETECTION)
  assert.equal(payload[0].errors, undefined)
})

test('the mode reaches the flow inside metadata, not as a top-level key', () => {
  const payload = captured.at(0)!.payload as CMA[]
  assert.equal(payload[0].metadata.mode, 'listening')
  assert.ok(!('mode' in payload[0]), 'no top-level mode key')
  assert.ok(!('firmware' in payload[0]), 'no top-level firmware key — it is protocol.version')
})

test('output CMA carries the core timestamp metadata and NO sentence timestamp', () => {
  const payload = captured.at(0)!.payload as CMA[]
  const ts = payload[0].metadata.timestamp
  assert.ok(typeof ts.received === 'number' && typeof ts.parsed === 'number', 'received + parsed stamped')
  // The device clock may be epoch or uptime and nothing on the wire says which, so the
  // parser never asserts a sentence time.
  assert.equal(ts.sentence, undefined)
})

test('the device time and identity facts arrive as payload metadata', () => {
  const payload = captured.at(0)!.payload as CMA[]
  const mirror = payload[0].metadata.payload!
  assert.equal(mirror.receiver, '1000042')
  assert.equal(mirror.emitter, '1285')
  assert.deepEqual(mirror.time, { seconds: 1589557202, milliseconds: 615, total_milliseconds: 1589557202615 })
  assert.deepEqual(mirror.snr, { raw: 24, signal: 'regular' })
})

test('serial numbers reach the flow as strings, so padding survives', () => {
  const payload = captured.at(0)!.payload as CMA[]
  const serial = payload[0].payload[0]
  assert.equal(serial.name, 'receiver_serial_number')
  assert.equal(serial.value, '1000042')
  assert.equal(typeof serial.value, 'string')
})

test('keys not sent on the input are absent from the output', () => {
  const msg = captured.at(0)!
  for (const key of ['memory', 'firmware', 'ids', 'definition', 'fake']) {
    assert.ok(!(key in msg), `${key} was not requested, so it is not on the output`)
  }
})

test('an empty data field arrives as null, never as a zero', () => {
  // The regression that matters most: an ID-only transmit protocol carries no data, and
  // reporting 0 made a missing measurement look like a perfectly vertical mooring line.
  const msg = captured.at(-1)!
  const payload = msg.payload as CMA[]
  assert.equal(payload[0].id, 'emitter')
  const data = payload[0].payload.find((field) => field.name === 'data')
  assert.equal(data?.value, null)
  assert.equal(data?.metadata, undefined, 'the opaque data field is never decoded')
})

test('the diagnostic keys answer through a real flow', () => {
  const msg = captured.at(-1)!
  const firmware = msg.firmware as { firmware: string, firmwares: string[] }
  assert.deepEqual(firmware.firmwares, ['1.0.1', '1.0.2'])
  const ids = msg.ids as string[]
  assert.equal(ids.length, 17)
  assert.ok(ids.includes('receiver'))
  const definition = msg.definition as { id: string, mode: string, payload: unknown[], description: string }[]
  assert.equal(definition.length, 1)
  assert.equal(definition[0].id, 'receiver')
  assert.equal(definition[0].payload.length, 7)
  assert.ok(definition[0].description.includes('Recognised by'))
  // Deterministic, and the datasheet's own 1.0.2 shape.
  assert.equal(msg.fake, '$1000042,1589557202,615,S64K,1285,0,24,69\r')
})
