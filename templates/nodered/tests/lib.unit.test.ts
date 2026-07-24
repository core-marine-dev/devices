// built-in
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// installed
// TODO: import your wrapped library's parser class
import { NMEAParser as Parser } from '@coremarine/TODO:'

// coded
import { applyMemory, cleanUndefined, parsePayload } from '../src/lib'

// TODO: a representative sample input that your parser turns into >= 1 CMA
const SAMPLE = 'TODO: sample payload'

describe('applyMemory', () => {
  test('absent input -> undefined', () => {
    assert.equal(applyMemory(new Parser(), undefined), undefined)
  })
  test('get -> { memory, characters }', () => {
    const parser = new Parser({ memory: true })
    assert.deepEqual(applyMemory(parser, { command: 'get' }), { memory: true, characters: parser.bufferLimit })
  })
  test('set toggles parser.memory', () => {
    const parser = new Parser({ memory: true })
    applyMemory(parser, { command: 'set', payload: false })
    assert.equal(parser.memory, false)
  })
  test('set with non-boolean payload -> error string', () => {
    assert.match(String(applyMemory(new Parser(), { command: 'set', payload: 'x' })), /boolean/)
  })
})

describe('parsePayload', () => {
  test('absent -> undefined', () => {
    assert.equal(parsePayload(new Parser(), undefined), undefined)
  })
  test('non-string -> error string', () => {
    assert.match(String(parsePayload(new Parser(), 123)), /string/)
  })
  // TODO: assert your SAMPLE parses to the expected CMA[]
  test.todo('valid SAMPLE -> CMA[]', () => {
    const out = parsePayload(new Parser(), SAMPLE)
    assert.ok(Array.isArray(out))
  })
})

describe('cleanUndefined', () => {
  test('drops only undefined keys', () => {
    const msg: Record<string, unknown> = { a: 1, b: undefined, c: null }
    cleanUndefined(msg)
    assert.deepEqual(msg, { a: 1, c: null })
  })
})
