// built-in
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

// installed
import { NorsubParser } from '@coremarine/norsub-emru'

// coded
import { applyMemory, applyProtocol, applySentences, cleanUndefined, getFakeSentence, getSentenceInfo, parsePayload } from '../src/lib'

// The OEM manual's example checksums are unreliable, so fixtures are checksummed here.
const checksum = (body: string): string => {
  let result = 0
  for (const character of body) result ^= character.charCodeAt(0)
  return result.toString(16).toUpperCase().padStart(2, '0')
}
const nmea = (body: string): string => `$${body}*${checksum(body)}\r\n`

// PNORSUB8: 24 payload fields, the last being the status bitfield.
const PNORSUB8 = nmea(`PNORSUB8,${[...Array<string>(23).fill('0'), '4160749567'].join(',')}`)
const GGA = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n'

const noop = (): string => ''

describe('applyMemory', () => {
  test('absent input -> undefined', () => {
    assert.equal(applyMemory(new NorsubParser(), undefined), undefined)
  })

  test('get -> { memory, characters }', () => {
    const result = applyMemory(new NorsubParser(), { command: 'get' })
    assert.deepEqual(Object.keys(result as object).sort((a, b) => a.localeCompare(b)), ['characters', 'memory'])
  })

  test('set toggles parser.memory', () => {
    const parser = new NorsubParser()
    applyMemory(parser, { command: 'set', payload: false })
    assert.equal(parser.memory, false)
  })

  test('set with non-boolean payload -> error string', () => {
    assert.equal(applyMemory(new NorsubParser(), { command: 'set', payload: 'no' }), 'memory.payload should be boolean')
  })

  test('bad command -> error string', () => {
    assert.match(applyMemory(new NorsubParser(), { command: 'nope' }) as string, /"get" or "set"/)
  })
})

describe('applyProtocol', () => {
  test('absent input -> undefined', () => {
    assert.equal(applyProtocol(new NorsubParser(), undefined), undefined)
  })

  test('get -> the active protocol plus every selectable one', () => {
    assert.deepEqual(applyProtocol(new NorsubParser(), { command: 'get' }), { protocol: 'nmea', protocols: ['nmea'] })
  })

  test('set to a known protocol reports it back', () => {
    assert.deepEqual(applyProtocol(new NorsubParser(), { command: 'set', payload: 'nmea' }), { protocol: 'nmea', protocols: ['nmea'] })
  })

  test('set to an unknown protocol -> error string listing the valid ones', () => {
    const parser = new NorsubParser()
    const result = applyProtocol(parser, { command: 'set', payload: 'tss1' })
    assert.match(result as string, /protocol\.payload should be one of: nmea/)
    assert.equal(parser.protocol, 'nmea', 'the current protocol is kept')
  })

  test('set with a non-string payload -> error string', () => {
    assert.match(applyProtocol(new NorsubParser(), { command: 'set', payload: 7 }) as string, /should be one of/)
  })

  test('bad command -> error string', () => {
    assert.match(applyProtocol(new NorsubParser(), { command: 'nope' }) as string, /"get" or "set"/)
  })
})

describe('applySentences', () => {
  const YAML = [
    'protocols:',
    '  - protocol: CUSTOM',
    '    standard: false',
    '    sentences:',
    '      - id: PCUST',
    '        payload:',
    '          - name: value',
    '            type: uint16',
  ].join('\n')

  test('absent input -> undefined', () => {
    assert.equal(applySentences(new NorsubParser(), undefined, noop), undefined)
  })

  test('get -> the built-in NorSub and NMEA definitions', () => {
    const result = applySentences(new NorsubParser(), { command: 'get' }, noop) as Record<string, unknown>
    assert.ok('NMEA' in result, 'inherited NMEA definitions are listed')
    assert.ok('NORSUB8' in result, 'NorSub definitions are built in')
  })

  test('set with YAML content registers the sentence', () => {
    const parser = new NorsubParser()
    const result = applySentences(parser, { command: 'set', content: YAML }, noop) as Record<string, unknown>
    assert.ok('CUSTOM' in result)
    assert.equal(parser.parseData(nmea('PCUST,42'))[0].id, 'PCUST')
  })

  test('set reads a file when no content is given', () => {
    const parser = new NorsubParser()
    const result = applySentences(parser, { command: 'set', file: '/whatever.yml' }, () => YAML) as Record<string, unknown>
    assert.ok('CUSTOM' in result)
  })

  test('content takes precedence over file', () => {
    const parser = new NorsubParser()
    applySentences(parser, { command: 'set', content: YAML, file: '/ignored.yml' }, () => 'not: valid: yaml:')
    assert.ok(parser.parser.getSentence('PCUST'))
  })

  test('set without content or file -> error string', () => {
    assert.match(applySentences(new NorsubParser(), { command: 'set' }, noop) as string, /needs a "content" .* or a "file"/)
  })

  test('set with invalid YAML -> error string, never a throw', () => {
    assert.match(applySentences(new NorsubParser(), { command: 'set', content: 'foo: bar' }, noop) as string, /^sentences: /)
  })

  test('set with a file whose reader throws -> cannot read file', () => {
    const thrower = (): string => {
      throw new Error('ENOENT')
    }
    assert.match(applySentences(new NorsubParser(), { command: 'set', file: '/missing.yml' }, thrower) as string, /cannot read file/)
  })

  test('bad command -> error string', () => {
    assert.match(applySentences(new NorsubParser(), { command: 'nope' }, noop) as string, /"get" or "set"/)
  })
})

describe('getSentenceInfo / getFakeSentence', () => {
  test('absent -> undefined', () => {
    assert.equal(getSentenceInfo(new NorsubParser(), undefined), undefined)
    assert.equal(getFakeSentence(new NorsubParser(), undefined), undefined)
  })

  test('non-string -> error string', () => {
    assert.equal(getSentenceInfo(new NorsubParser(), 42), 'sentence must be a string')
    assert.equal(getFakeSentence(new NorsubParser(), 42), 'fake sentence id must be a string')
  })

  test('a NorSub id resolves through the exposed protocol parser', () => {
    const parser = new NorsubParser()
    const info = getSentenceInfo(parser, 'PNORSUB8')
    assert.ok(info !== null && typeof info === 'object', 'a definition, not an error string')
    assert.equal(info.protocol.name, 'NORSUB8')
    const fake = getFakeSentence(parser, 'PNORSUB8')
    assert.ok(typeof fake === 'string' && fake.startsWith('$PNORSUB8'))
  })

  test('an unknown id -> null, not an error', () => {
    assert.equal(getSentenceInfo(new NorsubParser(), 'NOPE'), null)
    assert.equal(getFakeSentence(new NorsubParser(), 'NOPE'), null)
  })
})

describe('parsePayload', () => {
  test('absent -> undefined', () => {
    assert.equal(parsePayload(new NorsubParser(), undefined), undefined)
  })

  test('non-string -> error string', () => {
    assert.equal(parsePayload(new NorsubParser(), 42), 'payload must be an ASCII string')
  })

  test('a PNORSUB8 -> CMA[] with status at BOTH field and payload level', () => {
    const sentences = parsePayload(new NorsubParser(), PNORSUB8)
    assert.ok(Array.isArray(sentences))
    const [cma] = sentences
    assert.equal(cma.id, 'PNORSUB8')
    assert.equal(cma.protocol.name, 'NORSUB8')
    assert.ok(cma.payload.at(-1)?.metadata?.status, 'field-level status')
    assert.ok((cma.metadata.payload as { status?: unknown }).status, 'payload-level status')
  })

  test('a standard NMEA sentence still parses (inherited built-ins)', () => {
    const [cma] = parsePayload(new NorsubParser(), GGA) as { id: string, protocol: { name: string } }[]
    assert.equal(cma.id, 'GGA')
    assert.equal(cma.protocol.name, 'NMEA')
  })

  // Garbage is REPORTED, not dropped: it comes out as a valid CMA whose
  // mandatory values are 'unknown' and whose `errors` say why. Inherited from
  // nmea-parser for free. See docs/CMA.md §"Failed and garbage sentences".
  test('garbage is reported as a garbage sentence rather than dropped', () => {
    const [cma] = parsePayload(new NorsubParser(), 'not a sentence') as {
      raw: string
      id: string
      protocol: { name: string, version: string }
      payload: unknown[]
      errors: string[]
    }[]
    assert.equal(cma.raw, 'not a sentence')
    assert.equal(cma.id, 'unknown')
    assert.deepEqual(cma.protocol, { name: 'unknown', version: 'unknown' })
    assert.deepEqual(cma.payload, [])
    assert.ok(cma.errors.length > 0)
  })
})

describe('cleanUndefined', () => {
  test('drops only undefined keys', () => {
    const msg: Record<string, unknown> = { payload: [], memory: undefined, protocol: null, sentences: 0 }
    cleanUndefined(msg)
    assert.deepEqual(Object.keys(msg).sort((a, b) => a.localeCompare(b)), ['payload', 'protocol', 'sentences'])
  })
})
