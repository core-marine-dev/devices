// built-in
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

// installed
import RED from 'node-red'

// Boot the REAL node-red runtime headless (public API only), let it auto-load the
// built node from node_modules, deploy a flow via the flowFile, and capture output
// from a tiny test-sink. No node-red-node-test-helper (broken on node-red 5 + pnpm).

// @types/node-red models the RED passed to a node's init(), not the embedded runtime
// booted here — cast to the minimal surface we use.
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

// TODO: a representative sample input for your protocol
const SAMPLE = 'TODO: sample payload'

let userDir: string
const captured: Record<string, unknown>[] = []

const flow = [
  { id: 'tab1', type: 'tab', label: 'Test' },
  { id: 'inj', type: 'inject', z: 'tab1', props: [{ p: 'payload' }], payload: SAMPLE, payloadType: 'str', once: true, onceDelay: 0.1, wires: [['n1']] },
  // TODO: node type must match package.json node-red.nodes + parser.html
  { id: 'n1', type: 'cma-TODO:', z: 'tab1', name: 'Node', memory: true, wires: [['sink']] },
  { id: 'sink', type: 'test-sink', z: 'tab1' }
]

before(async () => {
  userDir = mkdtempSync(join(tmpdir(), 'nr-todo-'))
  writeFileSync(join(userDir, 'flows.json'), JSON.stringify(flow))
  nr.init(createServer(), {
    httpAdminRoot: false,
    httpNodeRoot: false,
    disableEditor: true,
    userDir,
    logging: { console: { level: 'off' } },
    flowFile: 'flows.json'
  })
  nr.nodes.registerType('test-sink', function (this: SinkNode, config: object) {
    nr.nodes.createNode(this, config)
    this.on('input', (msg) => {
      captured.push(msg)
    })
  })
  await nr.start()
  await new Promise((resolve) => setTimeout(resolve, 800))
})

after(async () => {
  await nr.stop()
  rmSync(userDir, { recursive: true, force: true })
})

// TODO: assert your node parses SAMPLE into the expected CMA[] output
test.todo('real node-red loads the node and parses the injected sample', () => {
  const msg = captured.at(-1)
  assert.ok(msg, 'the node produced an output message')
  assert.ok(Array.isArray(msg.payload), 'payload is CMA[]')
})
