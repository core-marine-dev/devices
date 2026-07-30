// built-in
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// installed
import { NMEAParser } from '@coremarine/nmea-parser'

// coded
import { applyMemory, applySentences, cleanUndefined, getFakeSentence, getDefinition, parsePayload } from '../src/lib'

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

describe('getDefinition / getFakeSentence', () => {
  test('absent -> undefined', () => {
    assert.equal(getDefinition(new NMEAParser(), undefined), undefined)
    assert.equal(getFakeSentence(new NMEAParser(), undefined), undefined)
  })
  test('non-string -> error string', () => {
    assert.match(String(getDefinition(new NMEAParser(), 42)), /must be a sentence id string/)
    assert.match(String(getFakeSentence(new NMEAParser(), 42)), /must be a string/)
  })
  test('a known id returns an ARRAY of definitions', () => {
    const definitions = getDefinition(new NMEAParser(), 'GGA')
    assert.ok(Array.isArray(definitions))
    assert.equal(definitions[0].id, 'GGA')
    assert.equal(definitions[0].protocol.name, 'NMEA')
  })
  test('a talker prefix resolves and is reported', () => {
    const definitions = getDefinition(new NMEAParser(), 'GPGGA') as { talker?: { value: string } }[]
    assert.equal(definitions[0].talker?.value, 'GP')
  })
  test('an unknown id is an error STRING, not null', () => {
    // v5: the library returns a Result, so the user reads WHY instead of guessing
    // what a bare `null` meant.
    assert.match(String(getDefinition(new NMEAParser(), 'ZZZZ')), /unknown sentence id/)
    assert.match(String(getFakeSentence(new NMEAParser(), 'ZZZZ')), /unknown sentence id/)
    assert.match(String(getDefinition(new NMEAParser(), 'X')), /invalid sentence id/)
  })
  test('a known id gives a fake sentence that parses back', () => {
    const fake = getFakeSentence(new NMEAParser(), 'GGA') as string
    assert.match(fake, /^\$GGA,/)
    const parsed = new NMEAParser().parseData(fake)
    assert.equal(parsed.length, 1)
    assert.equal(parsed[0].id, 'GGA')
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
