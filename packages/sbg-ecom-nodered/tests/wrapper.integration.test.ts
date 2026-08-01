// built-in
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

// installed
import RED from 'node-red'

// coded
import { EKF_EULER, GGA, JUNK, UTC_TIME } from './samples'

/* Boot the REAL node-red runtime headless (public API only), let it auto-load our built
   node from node_modules, deploy a flow via the flowFile, and capture output from a tiny
   test-sink. No node-red-node-test-helper (broken on node-red 5 + pnpm).

   ⚠️ THIS RUNS AGAINST dist/, NOT src/. Build the wrapper before believing it — and
   build the LIBRARY too, because the wrapper resolves it through its own dist. */

// @types/node-red models the RED object passed to a node's init(), not the embedded
// runtime we boot here — so init()/nodes.registerType()/createNode() aren't on its type
// even though they exist at runtime. Cast to the minimal surface we use.
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

let userDir: string
const captured: Record<string, unknown>[] = []

/* THREE injects, in order, all through ONE node instance:
     1. a real EKF_EULER frame as base64
     2. a real UTC_TIME frame — which teaches the node the clock, so inject 3 can show
        an absolute timestamp appearing on data that had none
     3. junk plus every diagnostic channel, and the NMEA sentence, together */
const flow = [
  { id: 'tab1', type: 'tab', label: 'Test' },
  { id: 'inj', type: 'inject', z: 'tab1', props: [{ p: 'payload' }], payload: EKF_EULER, payloadType: 'str', once: true, onceDelay: 0.1, wires: [['n1']] },
  { id: 'inj2', type: 'inject', z: 'tab1', props: [{ p: 'payload' }], payload: UTC_TIME, payloadType: 'str', once: true, onceDelay: 0.3, wires: [['n1']] },
  {
    id: 'inj3',
    type: 'inject',
    z: 'tab1',
    props: [
      { p: 'payload' },
      { p: 'memory', v: '{"command":"get"}', vt: 'json' },
      { p: 'firmware', v: '{"command":"get"}', vt: 'json' },
      { p: 'ids', v: 'true', vt: 'bool' },
      { p: 'definition', v: '0:6', vt: 'str' },
      { p: 'fake', v: '0:6', vt: 'str' },
    ],
    payload: JUNK,
    payloadType: 'str',
    once: true,
    onceDelay: 0.5,
    wires: [['n1']],
  },
  // The mixed stream, through the same node with nothing reconfigured.
  { id: 'inj4', type: 'inject', z: 'tab1', props: [{ p: 'payload' }], payload: GGA, payloadType: 'str', once: true, onceDelay: 0.7, wires: [['n1']] },
  { id: 'n1', type: 'cma-sbg-ecom', z: 'tab1', name: 'SBGParser', firmware: '', memory: true, wires: [['sink']] },
  { id: 'sink', type: 'test-sink', z: 'tab1' },
]

before(async () => {
  userDir = mkdtempSync(join(tmpdir(), 'nr-sbg-'))
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
  // wait for all four `once` injects to fire and flow through
  await new Promise((resolve) => setTimeout(resolve, 1500))
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
  metadata: { name: string, timestamp: Record<string, number>, payload?: Record<string, unknown>, body?: unknown }
  errors?: string[]
}

const payloadOf = (index: number): CMA[] => {
  const msg = captured.at(index)
  assert.ok(msg, `there is an output message at ${index}`)
  const payload = msg.payload as CMA[]
  assert.ok(Array.isArray(payload), 'payload is an array (CMA[])')
  return payload
}

const field = (cma: CMA, name: string): Field => {
  const found = cma.payload.find((entry) => entry.name === name)
  assert.ok(found, `field ${name} is present`)
  return found
}

test('real node-red loads the node and parses injected eCom bytes to CMA[]', () => {
  const payload = payloadOf(0)
  assert.equal(payload.length, 1)
  assert.equal(payload[0].protocol.name, 'SBG ECOM')
  assert.equal(payload[0].protocol.version, '2.3')
  assert.equal(payload[0].errors, undefined)
})

// The convention most likely to surprise a flow author: the id is class:message.
test('the id is <class>:<message> and the name is in metadata', () => {
  const payload = payloadOf(0)
  assert.equal(payload[0].id, '0:6')
  assert.equal(payload[0].metadata.name, 'SBG_ECOM_LOG_EKF_EULER')
})

// Base64 in, base64 out — the diagnostic loop the string channel exists for.
test('a base64 payload round-trips: what went in is what raw reports', () => {
  assert.equal(payloadOf(0)[0].raw, EKF_EULER)
})

test('decoded values reach the flow with datasheet units, and metadata for the rest', () => {
  const payload = payloadOf(0)
  const roll = field(payload[0], 'ROLL')
  assert.equal(roll.units, 'rad')
  assert.ok(typeof roll.value === 'number' && Math.abs(roll.value) < 0.2, 'a quay-side ELLIPSE')
  // Radians on the wire, degrees in metadata — nobody should have to convert by hand.
  assert.equal((roll.metadata as { units: string }).units, 'deg')
  // A bitfield keeps its integer value; the decode is in metadata.
  const status = field(payload[0], 'SOLUTION_STATUS')
  assert.equal(status.value, 2260)
  assert.equal((status.metadata as { label: string }).label, 'SBG_ECOM_SOL_MODE_NAV_POSITION')
})

test('an uptime counter is NOT presented as a timestamp', () => {
  const payload = payloadOf(0)
  const ts = payload[0].metadata.timestamp
  assert.ok(typeof ts.received === 'number' && typeof ts.parsed === 'number', 'host timings are there')
  // Nothing has told this node the time yet, so there is no absolute time to give.
  assert.equal(ts.sentence, undefined)
  assert.equal(payload[0].timestamp, ts.parsed)
})

test('a UTC_TIME frame gives the node a clock, and dates ITSELF with it', () => {
  const payload = payloadOf(1)
  assert.equal(payload[0].metadata.name, 'SBG_ECOM_LOG_UTC_TIME')
  const ts = payload[0].metadata.timestamp
  assert.ok(typeof ts.sentence === 'number', 'the device told us the time')
  // Promoted over cma.timestamp: the device's clock beats the host's. This capture is
  // from 2023, so it cannot be confused with the parse time.
  assert.equal(payload[0].timestamp, ts.sentence)
  assert.equal(new Date(payload[0].timestamp).getUTCFullYear(), 2023)
  assert.ok(payload[0].timestamp < ts.parsed, 'the device time is older than the parse')
})

test('keys not sent on the input are absent from the output', () => {
  const msg = captured.at(0)
  assert.ok(msg)
  for (const key of ['memory', 'firmware', 'ids', 'definition', 'fake']) {
    assert.ok(!(key in msg), `${key} was not requested, so it is not on the output`)
  }
})

test('junk bytes arrive as a garbage sentence rather than vanishing', () => {
  const payload = payloadOf(2)
  assert.equal(payload.length, 1)
  assert.equal(payload[0].id, 'unknown')
  assert.deepEqual(payload[0].payload, [])
  assert.equal(payload[0].raw, JUNK, 'the discarded bytes are kept')
  assert.ok(payload[0].errors?.[0].includes('Unparseable data'))
})

test('every diagnostic channel answers through a real flow', () => {
  const msg = captured.at(2)
  assert.ok(msg)
  assert.deepEqual(msg.memory, { memory: true, bytes: 4095 })
  const firmware = msg.firmware as { firmware: string, firmwares: string[], clock?: unknown }
  assert.equal(firmware.firmware, '2.3')
  assert.deepEqual(firmware.firmwares, ['2.3'])
  // The UTC_TIME frame two injects ago taught it the clock, and the channel reports so.
  assert.ok(firmware.clock !== undefined, 'the learned clock is visible to the flow')
  const ids = msg.ids as string[]
  assert.equal(ids.filter((id) => id.includes(':')).length, 34, 'all 34 class-0 logs')
  assert.ok(ids.includes('GGA'), 'and the NMEA ids, from the same node')
  // ONE entry: sbgECom has no revision concept, unlike SBF.
  const definition = msg.definition as { id: string, name: string, payload: unknown[] }[]
  assert.equal(definition.length, 1)
  assert.equal(definition[0].name, 'SBG_ECOM_LOG_EKF_EULER')
  assert.equal(definition[0].payload.length, 8)
})

// A fake frame comes back as a Buffer, so it can be wired straight into another node's
// payload — and it carries a real CRC, so it parses back cleanly.
test('fake returns a real Buffer frame with real sync bytes', () => {
  const msg = captured.at(2)
  assert.ok(msg)
  const fake = msg.fake
  assert.ok(Buffer.isBuffer(fake), 'a Buffer, which is what node-red routes binary as')
  assert.equal((fake as Buffer).byteLength, 41, 'header 6 + body 32 + footer 3')
  assert.deepEqual([...(fake as Buffer).subarray(0, 2)], [0xFF, 0x5A], 'real sbgECom sync bytes')
  assert.equal((fake as Buffer).at(-1), 0x33, 'and the real end flag')
})

/* THE MIXED STREAM, through the same node with nothing reconfigured — this is the test
   that would fail if the wrapper demanded base64 like septentrio's does, or if it had a
   protocol switch to get wrong. */
test('a plain NMEA sentence parses through the same node, with no setting changed', () => {
  const payload = payloadOf(3)
  assert.equal(payload.length, 1)
  assert.equal(payload[0].id, 'GGA')
  assert.equal(payload[0].protocol.name, 'NMEA')
  assert.equal(payload[0].errors, undefined)
  // Its own UTC survived the core re-stamping the timestamp block.
  assert.ok(typeof payload[0].metadata.timestamp.sentence === 'number')
})
