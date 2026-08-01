// built-in
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// installed
import { SBGParser } from '@coremarine/sbg-ecom'

// coded
import { applyFirmware, applyMemory, getDefinition, getFakeSentence, getIds, parsePayload } from '../src/lib'

/* THE SHIPPED EXAMPLE FLOW IS TESTED, not just eyeballed.

   It is published in the tarball and listed in the Node-RED flow library, so a payload
   that no longer parses is a broken advert for the whole package — and the flows in this
   repo have drifted before, silently, because nothing checked them.

   Two halves: the flow is structurally sound (the checks that have caught real problems
   in the other four wrapper flows), and EVERY inject payload actually goes through this
   wrapper's own handlers and produces what its label claims. */

const here = dirname(fileURLToPath(import.meta.url))
const FLOW = join(here, '..', 'examples', 'sbg-ecom-examples.json')

interface Node {
  id: string
  type: string
  name?: string
  g?: string
  x?: number
  y?: number
  w?: number
  h?: number
  nodes?: string[]
  wires?: string[][]
  props?: { p: string, v?: string, vt?: string }[]
  payload?: string
}

const flow = JSON.parse(readFileSync(FLOW, 'utf8')) as Node[]
const byId = new Map(flow.map((node) => [node.id, node]))
const groups = flow.filter((node) => node.type === 'group')
const injects = flow.filter((node) => node.type === 'inject')

const box = (node: Node | undefined): { x: number, y: number, w: number, h: number } =>
  ({ x: node?.x ?? 0, y: node?.y ?? 0, w: node?.w ?? 0, h: node?.h ?? 0 })

const inside = (node: Node | undefined, group: Node): boolean => {
  const { x, y } = box(node)
  const outer = box(group)
  return x >= outer.x && x <= outer.x + outer.w && y >= outer.y && y <= outer.y + outer.h
}

const overlaps = (first: Node, second: Node): boolean => {
  const a = box(first)
  const b = box(second)
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

const pairs = <T>(items: T[]): [T, T][] =>
  items.flatMap((item, index) => items.slice(index + 1).map((other): [T, T] => [item, other]))

describe('the example flow is structurally sound', () => {
  test('every id is unique', () => {
    const ids = flow.map((node) => node.id)
    assert.equal(new Set(ids).size, ids.length)
  })

  test('every group member exists and points back at its group', () => {
    for (const group of groups) {
      for (const member of group.nodes ?? []) {
        const node = byId.get(member)
        assert.ok(node, `group "${group.name}" lists ${member}, which exists`)
        assert.equal(node.g, group.id, `${member} points back at its group`)
      }
    }
  })

  test('every node claiming a group is listed by it', () => {
    for (const node of flow.filter((one) => one.g !== undefined)) {
      const group = byId.get(node.g as string)
      assert.ok(group?.nodes?.includes(node.id), `${node.id} claims group ${String(node.g)}, which lists it`)
    }
  })

  test('every member sits inside its group box', () => {
    // Node-RED renders a member outside its box as a visual mess, and it is the kind of
    // thing that only shows up when someone opens the flow.
    for (const group of groups) {
      for (const member of group.nodes ?? []) {
        assert.ok(inside(byId.get(member), group), `${member} sits inside "${group.name}"`)
      }
    }
  })

  test('no two groups overlap', () => {
    for (const [a, b] of pairs(groups)) {
      assert.ok(!overlaps(a, b), `"${a.name}" and "${b.name}" must not overlap`)
    }
  })

  test('every wire lands on a node that exists', () => {
    for (const node of flow) {
      for (const wire of node.wires ?? []) {
        for (const target of wire) assert.ok(byId.has(target), `${node.id} wires to ${target}`)
      }
    }
  })

  test('every group carries a comment node explaining itself', () => {
    for (const group of groups) {
      if (group.name === 'Flow errors') continue
      const members = (group.nodes ?? []).map((id) => byId.get(id))
      assert.ok(members.some((node) => node?.type === 'comment'), `"${group.name}" has a comment`)
    }
  })
})

const propValue = (prop: { v?: string, vt?: string }, node: Node): unknown => {
  if (prop.vt === 'json') return JSON.parse(prop.v ?? 'null')
  if (prop.vt === 'bool') return prop.v === 'true'
  return prop.v ?? node.payload
}

// A fake must not only be produced — it must PARSE BACK, which is what the flow's own
// function node relies on when it moves `fake` onto `payload`.
const checkFake = (parser: SBGParser, value: unknown, label: string): void => {
  const fake = getFakeSentence(parser, value)
  assert.ok(fake instanceof Uint8Array, `inject "${label}": ${String(fake)}`)
  const back = parsePayload(new SBGParser(), fake)
  assert.ok(Array.isArray(back) && back.length === 1 && back[0].errors === undefined, `inject "${label}" fake re-parses`)
}

const CHANNELS: Readonly<Record<string, (parser: SBGParser, value: unknown, label: string) => void>> = {
  memory: (parser, value, label) => assert.equal(typeof applyMemory(parser, value as never), 'object', label),
  firmware: (parser, value, label) => assert.equal(typeof applyFirmware(parser, value as never), 'object', label),
  ids: (parser, value, label) => assert.ok(Array.isArray(getIds(parser, value)), label),
  definition: (parser, value, label) => assert.ok(Array.isArray(getDefinition(parser, value)), `inject "${label}": ${String(getDefinition(parser, value))}`),
  fake: checkFake,
}

const checkChannel = (parser: SBGParser, channel: string, value: unknown, label: string): void => {
  CHANNELS[channel]?.(parser, value, label)
}

describe('every inject in the flow actually works', () => {
  test('each payload parses, and the ones labelled as broken report errors', () => {
    for (const node of injects) {
      const parser = new SBGParser()
      for (const prop of node.props ?? []) {
        if (prop.p !== 'payload') continue
        const result = parsePayload(parser, propValue(prop, node))
        assert.ok(Array.isArray(result), `inject "${node.name}" payload was rejected: ${String(result)}`)
        const errors = result.flatMap((one) => one.errors ?? [])
        // The injects that are SUPPOSED to misbehave say so in their label; nothing else
        // may report an error. The `N/2 —` pair is deliberately SEQUENTIAL — half a frame
        // is meaningless on its own — so it is covered by its own test below, with the
        // one shared parser the flow actually wires it to.
        if (/^\d\/2 —/.test(node.name ?? '')) continue
        const expectsErrors = /corrupted|junk/.test(node.name ?? '')
        if (expectsErrors) assert.ok(errors.length > 0, `inject "${node.name}" should report an error`)
        else assert.deepEqual(errors, [], `inject "${node.name}" should parse cleanly`)
      }
    }
  })

  test('each control channel answers rather than erroring', () => {
    for (const node of injects) {
      const parser = new SBGParser()
      for (const prop of node.props ?? []) {
        checkChannel(parser, prop.p, propValue(prop, node), node.name ?? node.id)
      }
    }
  })

  test('the memory group really demonstrates memory, with ONE shared parser', () => {
    /* The two halves go to the SAME node in the flow, so they must be tested that way —
       tested with a parser each, the second half is meaningless garbage, which is
       exactly the confusion the group's comment exists to prevent. */
    const parser = new SBGParser()
    const halves = injects.filter((node) => /^\d\/2 —/.test(node.name ?? '') && /bytes|the rest/.test(node.name ?? ''))
    assert.equal(halves.length, 2, 'the two halves are in the flow')
    const first = parsePayload(parser, propValue(halves[0].props![0], halves[0]))
    assert.deepEqual(first, [], 'half a frame decodes to nothing — not an error, just incomplete')
    const second = parsePayload(parser, propValue(halves[1].props![0], halves[1]))
    assert.ok(Array.isArray(second) && second.length === 1, 'the rest completes it')
    assert.equal(second[0].id, '0:6')
    assert.equal(second[0].errors, undefined)
  })

  test('the mixed-stream group emits BOTH protocols from one parser', () => {
    // The distinguishing feature of this device, and the group a user is most likely to
    // open first. Fed in flow order through one node, as the flow does.
    const parser = new SBGParser()
    const group = groups.find((one) => one.name?.startsWith('The mixed stream'))
    assert.ok(group)
    const members = (group.nodes ?? []).map((id) => byId.get(id)).filter((node) => node?.type === 'inject') as Node[]
    const protocols: string[] = []
    for (const node of members) {
      const result = parsePayload(parser, propValue(node.props![0], node))
      assert.ok(Array.isArray(result))
      for (const one of result) protocols.push(one.protocol.name)
    }
    assert.deepEqual(protocols, ['SBG ECOM', 'NMEA', 'SBG ECOM'])
  })
})
