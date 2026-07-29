// built-in
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// installed
import { NMEAParser } from '@coremarine/nmea-parser'

// coded
import { applyMemory, applySentences, cleanUndefined, getFakeSentence, getSentenceInfo, parsePayload } from '../src/lib'

const GGA = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n'
const noop = (): string => ''

describe('applyMemory', () => {
  test('absent input -> undefined', () => {
    assert.equal(applyMemory(new NMEAParser(), undefined), undefined)
  })
  test('get -> { memory, characters }', () => {
    const out = applyMemory(new NMEAParser({ memory: true }), { command: 'get' })
    assert.deepEqual(out, { memory: true, characters: new NMEAParser().bufferLimit })
  })
  test('set toggles parser.memory', () => {
    const parser = new NMEAParser({ memory: true })
    const out = applyMemory(parser, { command: 'set', payload: false })
    assert.equal(parser.memory, false)
    assert.equal((out as { memory: boolean }).memory, false)
  })
  test('set with non-boolean payload -> error string', () => {
    assert.equal(applyMemory(new NMEAParser(), { command: 'set', payload: 'nope' }), 'memory.payload should be boolean')
  })
  test('bad command -> error string', () => {
    assert.match(String(applyMemory(new NMEAParser(), { command: 'delete' })), /get.*set/)
  })
})

describe('applySentences', () => {
  test('absent input -> undefined', () => {
    assert.equal(applySentences(new NMEAParser(), undefined, noop), undefined)
  })
  test('get -> defined protocol listing', () => {
    assert.notEqual(applySentences(new NMEAParser(), { command: 'get' }, noop), undefined)
  })
  test('set without content/file -> error string', () => {
    assert.match(String(applySentences(new NMEAParser(), { command: 'set' }, noop)), /content.*file/)
  })
  test('set with invalid YAML content -> error string', () => {
    const out = applySentences(new NMEAParser(), { command: 'set', content: ':\n::bad' }, noop)
    assert.match(String(out), /^sentences:/)
  })
  test('set with file whose reader throws -> cannot read file', () => {
    const throwing = (): string => {
      throw new Error('ENOENT')
    }
    const out = applySentences(new NMEAParser(), { command: 'set', file: '/nope.yml' }, throwing)
    assert.match(String(out), /cannot read file/)
  })
})

describe('getSentenceInfo / getFakeSentence', () => {
  test('absent -> undefined', () => {
    assert.equal(getSentenceInfo(new NMEAParser(), undefined), undefined)
    assert.equal(getFakeSentence(new NMEAParser(), undefined), undefined)
  })
  test('non-string -> error string', () => {
    assert.match(String(getSentenceInfo(new NMEAParser(), 42)), /must be a string/)
    assert.match(String(getFakeSentence(new NMEAParser(), 42)), /must be a string/)
  })
  test('string id returns a defined result (object|string|null)', () => {
    assert.doesNotThrow(() => getSentenceInfo(new NMEAParser(), 'GGA'))
    assert.doesNotThrow(() => getFakeSentence(new NMEAParser(), 'GGA'))
  })
})

describe('parsePayload', () => {
  test('absent -> undefined', () => {
    assert.equal(parsePayload(new NMEAParser(), undefined), undefined)
  })
  test('non-string -> error string', () => {
    assert.match(String(parsePayload(new NMEAParser(), 123)), /ASCII string/)
  })
  test('valid GGA -> CMA[] with id GGA', () => {
    const out = parsePayload(new NMEAParser(), GGA)
    assert.ok(Array.isArray(out))
    assert.equal((out as { id: string }[])[0].id, 'GGA')
  })
})

describe('cleanUndefined', () => {
  test('drops only undefined keys', () => {
    const msg: Record<string, unknown> = { a: 1, b: undefined, c: null, d: false }
    cleanUndefined(msg)
    assert.deepEqual(msg, { a: 1, c: null, d: false })
  })
})
