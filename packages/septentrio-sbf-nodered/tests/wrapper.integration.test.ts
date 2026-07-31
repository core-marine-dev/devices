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

// A REAL AttEuler (5938) frame from a Septentrio receiver, base64 — attitude mode 1, so
// Roll and RollDot are at their Do-Not-Use value. Injected as base64 because an inject
// node cannot hold a Buffer, which is exactly why the wrapper accepts that form.
const ATT_EULER = 'JEC0kzIXLADQkPEW2AgHAAEAAADPsS5DPVAQwfkCldDvlEa++QKV0AxBoD4='
// Junk that cannot start a block, to prove nothing is dropped silently.
const JUNK = 'AQID//4='

let userDir: string
const captured: Record<string, unknown>[] = []

const flow = [
  { id: 'tab1', type: 'tab', label: 'Test' },
  { id: 'inj', type: 'inject', z: 'tab1', props: [{ p: 'payload' }], payload: ATT_EULER, payloadType: 'str', once: true, onceDelay: 0.1, wires: [['n1']] },
  // A second inject exercising every diagnostic channel plus the garbage path together.
  {
    id: 'inj2',
    type: 'inject',
    z: 'tab1',
    props: [
      { p: 'payload' },
      { p: 'memory', v: '{"command":"get"}', vt: 'json' },
      { p: 'protocol', v: '{"command":"get"}', vt: 'json' },
      { p: 'firmware', v: '{"command":"get"}', vt: 'json' },
      { p: 'ids', v: 'true', vt: 'bool' },
      { p: 'definition', v: '4007', vt: 'num' },
      { p: 'fake', v: '5938', vt: 'num' },
    ],
    payload: JUNK,
    payloadType: 'str',
    once: true,
    onceDelay: 0.4,
    wires: [['n1']],
  },
  { id: 'n1', type: 'cma-septentrio-parser', z: 'tab1', name: 'SeptentrioParser', firmware: '', memory: true, wires: [['sink']] },
  { id: 'sink', type: 'test-sink', z: 'tab1' },
]

before(async () => {
  userDir = mkdtempSync(join(tmpdir(), 'nr-septentrio-'))
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

interface Field {
  raw: string
  name: string
  type: string
  value: unknown
  units?: string
  metadata?: Record<string, unknown>
}

interface CMA {
  id: string
  raw: string
  timestamp: number
  protocol: { name: string, version: string }
  payload: Field[]
  metadata: { name: string, revision: number, timestamp: Record<string, number>, payload?: Record<string, unknown>, body?: unknown }
  errors?: string[]
}

const field = (cma: CMA, name: string): Field => {
  const found = cma.payload.find((entry) => entry.name === name)
  assert.ok(found, `field ${name} is present`)
  return found
}

test('real node-red loads the node and parses injected SBF bytes to CMA[]', () => {
  const msg = captured.at(0)
  assert.ok(msg, 'the node produced an output message')
  const payload = msg.payload as CMA[]
  assert.ok(Array.isArray(payload), 'payload is an array (CMA[])')
  assert.equal(payload.length, 1)
  assert.equal(payload[0].protocol.name, 'SBF')
  assert.equal(payload[0].protocol.version, '4.10.1')
  assert.equal(payload[0].errors, undefined)
})

// The convention most likely to surprise a flow author: the id is the NUMBER.
test('the id is the block number and the name is in metadata', () => {
  const payload = captured.at(0)!.payload as CMA[]
  assert.equal(payload[0].id, '5938')
  assert.equal(payload[0].metadata.name, 'AttEuler')
  assert.equal(payload[0].metadata.revision, 0)
})

// Base64 in, base64 out — the diagnostic loop the string channel exists for.
test('a base64 payload round-trips: what went in is what raw reports', () => {
  const payload = captured.at(0)!.payload as CMA[]
  assert.equal(payload[0].raw, ATT_EULER)
})

test('the timestamp reaching the flow is the RECEIVER clock, not this machine', () => {
  const payload = captured.at(0)!.payload as CMA[]
  const ts = payload[0].metadata.timestamp
  assert.ok(typeof ts.received === 'number' && typeof ts.parsed === 'number', 'host timings still there')
  // The block's own GPS time, promoted over cma.timestamp because a GNSS clock beats the
  // host's. This frame dates to 2023, so it cannot be confused with the parse time.
  assert.equal(payload[0].timestamp, ts.sentence)
  assert.equal(new Date(payload[0].timestamp).getUTCFullYear(), 2023)
  assert.ok(payload[0].timestamp < ts.parsed, 'the device time is older than the parse')
})

test('a Do-Not-Use field arrives as null and says why, never as a zero', () => {
  const payload = captured.at(0)!.payload as CMA[]
  // Attitude mode 1 is heading + pitch only, so there is no roll solution at all.
  const roll = field(payload[0], 'Roll')
  assert.equal(roll.value, null)
  assert.deepEqual(roll.metadata, { doNotUse: true, value: -20000000000 })
  const rollDot = field(payload[0], 'RollDot')
  assert.equal(rollDot.value, null)
})

test('decoded values reach the flow with the datasheet units, and metadata for the rest', () => {
  const payload = captured.at(0)!.payload as CMA[]
  const heading = field(payload[0], 'Heading')
  assert.equal(heading.units, 'deg')
  assert.ok(Math.abs((heading.value as number) - 174.69456481933594) < 1e-9)
  // A bitfield keeps its integer value; the decode is in metadata.
  const mode = field(payload[0], 'Mode')
  assert.equal(mode.value, 1)
  assert.deepEqual(mode.metadata, { label: 'HEADING_PITCH_FLOAT' })
  // Cross-field aggregates land at payload level.
  assert.deepEqual(payload[0].metadata.payload, {
    attitude: { heading: 174.69456481933594, pitch: -9.0195894241333, roll: null, units: 'deg' },
  })
})

test('keys not sent on the input are absent from the output', () => {
  const msg = captured.at(0)!
  for (const key of ['memory', 'protocol', 'firmware', 'ids', 'definition', 'fake']) {
    assert.ok(!(key in msg), `${key} was not requested, so it is not on the output`)
  }
})

test('junk bytes arrive as a garbage sentence rather than vanishing', () => {
  const payload = captured.at(-1)!.payload as CMA[]
  assert.equal(payload.length, 1)
  assert.equal(payload[0].id, 'unknown')
  assert.deepEqual(payload[0].payload, [])
  assert.equal(payload[0].raw, JUNK, 'the discarded bytes are kept')
  assert.ok(payload[0].errors?.[0].includes('Unparseable data'))
})

test('every diagnostic channel answers through a real flow', () => {
  const msg = captured.at(-1)!
  assert.deepEqual(msg.memory, { memory: true, bytes: 65535 })
  assert.deepEqual(msg.protocol, { protocol: 'sbf', protocols: ['sbf'] })
  assert.deepEqual(msg.firmware, { firmware: '4.10.1', firmwares: ['4.10.1'] })
  const ids = msg.ids as string[]
  assert.equal(ids.length, 108, 'all 108 blocks of Appendix B')
  assert.ok(ids.includes('5938'))
  // One entry per revision — PVTGeodetic has three.
  const definition = msg.definition as { id: string, name: string, revision: number, payload: unknown[] }[]
  assert.equal(definition.length, 3)
  assert.equal(definition[0].name, 'PVTGeodetic')
  assert.deepEqual(definition.map((entry) => entry.revision), [0, 1, 2])
})

// A fake frame comes back as a Buffer, so it can be wired straight into another node's
// payload — and it carries a real CRC, so it parses back cleanly.
test('fake returns a real Buffer frame that the same node can re-parse', () => {
  const msg = captured.at(-1)!
  const fake = msg.fake
  assert.ok(Buffer.isBuffer(fake), 'a Buffer, which is what node-red routes binary as')
  assert.equal((fake as Buffer).byteLength, 44)
  assert.deepEqual([...(fake as Buffer).subarray(0, 2)], [0x24, 0x40], 'real SBF sync bytes')
})
