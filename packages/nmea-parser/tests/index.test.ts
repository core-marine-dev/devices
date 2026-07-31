import fs from 'node:fs'
import path from 'node:path'

import { CMASchema } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

import { NMEAParser as Parser } from '../src'
import { NMEALikeSchema } from '../src/schemas'
import { createFakeSentence } from '../src/sentences'
import type { Talker } from '../src/types'

const NORSUB_FILE = path.join(__dirname, '..', 'protocols', 'norsub.yml')
const NORSUB_YAML = fs.readFileSync(NORSUB_FILE, 'utf-8')

const NORSUB_SENTENCE_IDS = [
  'AAM', 'GGA',
  'HEHDT', 'PHTRO', 'PHINF',
  'PNORSUB', 'PNORSUB2', 'PNORSUB6', 'PNORSUB7', 'PNORSUB7b', 'PNORSUB8', 'PRDID',
  'PTVG', 'PSMCA', 'PSMCC',
]
const NORSUB_PROTOCOL_NAMES = [
  'NMEA',
  'GYROCOMPAS1', 'Tokimek PTVG', 'RDI ADCP', 'SMCA', 'SMCC',
  'NORSUB', 'NORSUB2', 'NORSUB6', 'NORSUB7', 'NORSUB7b', 'NORSUB8',
]

const hasId = (parser: Parser, id: string): boolean => parser.getSentences().some((sentence) => sentence.id === id)

describe('Parser', () => {
  test('Default constructor loads the built-in NMEA standard', () => {
    const parser = new Parser()
    expect(['AAM', 'GGA'].every((id) => hasId(parser, id))).toBeTruthy()
    expect('NMEA' in parser.getSentencesByProtocol()).toBeTruthy()
  })

  test('addSentences loads a protocols YAML string', () => {
    const parser = new Parser()
    parser.addSentences(NORSUB_YAML)
    expect(NORSUB_SENTENCE_IDS.every((id) => hasId(parser, id))).toBeTruthy()
    const protocols = parser.getSentencesByProtocol()
    NORSUB_PROTOCOL_NAMES.forEach((name) => expect(name in protocols).toBeTruthy())
  })

  // The whole reason getSentenceDefinition returns an ARRAY: the knowledge base
  // holds one definition PER VERSION of an id, and the old `getSentence` returned
  // only the newest — so an older revision was impossible to inspect at all.
  test('getSentenceDefinition returns every version of an id', () => {
    const parser = new Parser()
    const before = parser.getSentenceDefinition('AAM')
    expect(before.success ? before.value.length : 0).toBe(1)
    // A second revision of an id the built-in already knows.
    const result = parser.addSentences([
      'protocols:',
      '  - protocol: NMEA',
      '    version: \'4.0\'',
      '    standard: true',
      '    sentences:',
      '      - id: AAM',
      '        description: Waypoint Arrival Alarm, revised',
      '        payload:',
      '          - name: status',
      '            type: string',
    ].join('\n'))
    expect(result.success).toBe(true)
    const after = parser.getSentenceDefinition('AAM')
    expect(after.success).toBe(true)
    const versions = after.success ? after.value.map((d) => d.protocol.version) : []
    expect(versions).toHaveLength(2)
    expect(versions).toContain('3.1')
    expect(versions).toContain('4.0')
    // The fake sentence still uses the NEWEST definition, which now has one field.
    const fake = parser.getFakeSentence('AAM')
    expect(fake.success).toBe(true)
    expect(fake.success ? fake.value.split(',').length : 0).toBe(2)
  })

  test('addSentences returns a Result error on invalid content (never throws)', () => {
    const parser = new Parser()
    expect(parser.addSentences('').success).toBe(false)
    expect(parser.addSentences('foo: bar').success).toBe(false)
  })

  test('Parsing NMEA + NorSub sentences', () => {
    const parser = new Parser()
    parser.addSentences(NORSUB_YAML)
    const stored = parser.getSentences()
    const input = stored.reduce((acc, curr) => acc + createFakeSentence(curr), '')
    expect(parser.parseData(input)).toHaveLength(stored.length)
  })

  // A fragment surrounded by other data is PROVABLY broken (something follows
  // it, so it will never be completed) — it is reported as a garbage sentence
  // instead of being dropped silently. The valid sentence still parses cleanly.
  const brokenInputs = (parser: Parser): string[] => {
    const stored = parser.getSentences()
    const input1 = createFakeSentence(stored.filter((s) => s.id === 'AAM')[0])
    const halfInput1 = input1.slice(0, 10)
    const halfInput2 = input1.slice(10)
    const input2 = createFakeSentence(stored.filter((s) => s.id === 'GGA')[0])
    return [
      halfInput1 + input2,
      halfInput1 + halfInput1 + input2,
      input2 + halfInput2,
      input2 + halfInput2 + halfInput2,
      'asdfasfaf' + input2 + 'lakjs',
    ]
  }

  const expectOneCleanSentenceAndReportedJunk = (output: ReturnType<Parser['parseData']>): void => {
    const clean = output.filter((cma) => cma.errors === undefined)
    const reported = output.filter((cma) => cma.errors !== undefined)
    expect(clean).toHaveLength(1)
    expect(reported.length).toBeGreaterThan(0)
    // Nothing is silently discarded: every non-sentence carries a reason.
    reported.forEach((cma) => {
      expect(cma.id).toBe('unknown')
      expect(cma.payload).toEqual([])
      expect(cma.errors?.length).toBeGreaterThan(0)
    })
  }

  test('Uncompleted sentences WITHOUT memory — the fragment is reported, not dropped', () => {
    const parser = new Parser({ memory: false })
    brokenInputs(parser).forEach((input) => expectOneCleanSentenceAndReportedJunk(parser.parseData(input)))
  })

  test('Uncompleted sentences WITH memory — the fragment is reported, not dropped', () => {
    const parser = new Parser({ memory: true })
    brokenInputs(parser).forEach((input) => expectOneCleanSentenceAndReportedJunk(parser.parseData(input)))
    // Split across two feeds — memory reassembles the sentence, and a trailing
    // fragment with nothing after it is NEVER reported (it is still streaming).
    const stored = parser.getSentences()
    const input1 = createFakeSentence(stored.filter((s) => s.id === 'AAM')[0])
    expect(parser.parseData(input1.slice(0, 10))).toHaveLength(0)
    expect(parser.parseData(input1.slice(10))).toHaveLength(1)
  })

  test('Unknown sentences', () => {
    const parser = new Parser({ memory: false })
    const stored = parser.getSentences()
    const aam = createFakeSentence(stored.filter((s) => s.id === 'AAM')[0], 'XXX')
    const gga = createFakeSentence(stored.filter((s) => s.id === 'GGA')[0], 'YYY');
    [aam, gga].forEach((input) => {
      const output = parser.parseData(input)
      expect(output).toHaveLength(1)
      expect(output[0].protocol).toEqual({ name: 'NMEA', version: 'unknown' })
    })
  })

  test('getSentenceDefinition info + talker', () => {
    const parser = new Parser()
    // Now an ARRAY (one entry per NMEA version of the id) inside a Result.
    const aam = parser.getSentenceDefinition('AAM')
    expect(aam.success).toBe(true)
    const definitions = aam.success ? aam.value : []
    expect(definitions.length).toBeGreaterThan(0)
    expect(definitions[0].protocol.name).toBe('NMEA')
    expect(definitions[0].protocol.standard).toBeTruthy()
    expect(definitions[0].talker).toBeUndefined()
    const talkerOf = (id: string): string | undefined => {
      const found = parser.getSentenceDefinition(id)
      return found.success ? found.value[0].talker?.value : undefined
    }
    expect(talkerOf('GPAAM')).toBe('GP')
    expect(talkerOf('U8AAM')).toBe('U8')
    // A Result rather than null, so the two kinds of failure are distinguishable.
    const unknown = parser.getSentenceDefinition('PdfgsdfAAM')
    expect(unknown.success).toBe(false)
    expect(unknown.success ? '' : unknown.error[0].kind).toBe('unknown-id')
    expect(parser.getSentenceDefinition('XXAAM').success).toBe(false)
    const invalid = parser.getSentenceDefinition('X')
    expect(invalid.success ? '' : invalid.error[0].kind).toBe('invalid-id')
  })

  test('Generate + parse fake sentences without talkers', () => {
    const parser = new Parser({ memory: false })
    parser.getSentences().forEach((sentence) => {
      const result = parser.getFakeSentence(sentence.id)
      expect(result.success).toBe(true)
      const fake = result.success ? result.value : null
      expect(fake).not.toBeNull()
      expect(NMEALikeSchema.is(fake)).toBeTruthy()
      const parsed = parser.parseData(fake as string)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].id).toBe(sentence.id)
    })
  })

  test('Generate + parse fake sentences with talkers', () => {
    const parser = new Parser({ memory: false })
    parser.getSentences().forEach((sentence) => {
      const talker = 'GP'
      const result = parser.getFakeSentence(talker + sentence.id)
      expect(result.success).toBe(true)
      const fake = result.success ? result.value : null
      expect(fake).not.toBeNull()
      expect(NMEALikeSchema.is(fake)).toBeTruthy()
      expect((fake as string).startsWith(talker, 1)).toBeTruthy()
      const parsed = parser.parseData(fake as string)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].id).toBe(sentence.id)
      expect((parsed[0].metadata?.talker as Talker).value).toBe(talker)
    })
  })

  test('Fake sentence for unknown id is null', () => {
    const parser = new Parser();
    ['XXX', 'YYY'].forEach((id) => expect(parser.getFakeSentence(id).success).toBe(false))
  })
})

test('GGA sentence -> CMA', () => {
  const sample = '$INGGA,132247.95,7118.690092,N,02215.039776,E,2,12,0.8,66.48,M,26.96,M,20.0,1006*56\r\n'
  const parser = new Parser()
  const output = parser.parseData(sample)
  expect(output).toHaveLength(1)
  const gga = output[0]
  expect(gga.id).toBe('GGA')
  expect(gga.protocol).toEqual({ name: 'NMEA', version: '3.1' })
  expect(gga.metadata?.standard).toBe(true)
  expect((gga.metadata?.talker as Talker).value).toBe('IN')
  expect(gga.payload).toHaveLength(14)
  // A few decoded field values
  expect(gga.payload.find((f) => f.name === 'satellites')?.value).toBe(12)
  expect(gga.payload.find((f) => f.name === 'gps_quality')?.value).toBe(2)
  expect(gga.payload.find((f) => f.name === 'utc_position')?.value).toBe('132247.95')
})

// FAILED + GARBAGE SENTENCES ------------------------------------------------------------------------------------------
// Real-hardware requirement: input the parser cannot use must never disappear.
// Either it decodes (with `errors` describing what is wrong) or it comes out as
// a garbage sentence — so a consumer sees the problem in the OUTPUT and does not
// have to watch a log full of repeated messages. See docs/CMA.md.
describe('Failed and garbage sentences', () => {
  // A real GGA (checksum 61, verified) — the base for the malformed variants.
  const GGA = '$GPGGA,132247.95,4807.038,N,01131.000,E,2,12,0.9,545.4,M,46.9,M,,*61\r\n'

  test('a clean sentence has NO errors', () => {
    const [cma] = new Parser().parseData(GGA)
    expect(cma.errors).toBeUndefined()
  })

  // cru's device: a checksum with a single character. The sentence is fully
  // parsed and the format problem is reported.
  test('1-character checksum — fully parsed, format error reported', () => {
    const [cma] = new Parser().parseData(GGA.replace('*61', '*6'))
    expect(cma.id).toBe('GGA')
    expect(cma.protocol).toEqual({ name: 'NMEA', version: '3.1' })
    // Still fully decoded: the checksum problem does not stop the decode.
    expect(cma.payload.find((f) => f.name === 'satellites')?.value).toBe(12)
    expect(cma.errors).toHaveLength(2)
    expect(cma.errors?.[0]).toContain('Invalid checksum format')
    expect(cma.errors?.[1]).toContain('Invalid checksum:')
  })

  // A dropped LEADING ZERO is the common real-world cause, and the value still
  // matches — so only the format is wrong, never a false corruption claim.
  test('1-character checksum that still MATCHES — only the format error', () => {
    const [cma] = new Parser().parseData('$GPHDT,10.0,T*4\r\n')
    expect(cma.errors).toHaveLength(1)
    expect(cma.errors?.[0]).toContain('Invalid checksum format')
  })

  test('2-character but WRONG checksum — fully parsed + mismatch error', () => {
    const [cma] = new Parser().parseData(GGA.replace('*61', '*6B'))
    expect(cma.payload.find((f) => f.name === 'satellites')?.value).toBe(12)
    expect(cma.errors).toEqual(['Invalid checksum: computed 61, received 6B'])
  })

  // cru's case: two sentences in a row, the first missing its \r\n.
  test('missing \\r\\n between two sentences — both emitted, the first flagged', () => {
    const output = new Parser().parseData(GGA.replace('\r\n', '') + GGA)
    expect(output).toHaveLength(2)
    expect(output[0].id).toBe('GGA')
    expect(output[0].payload.find((f) => f.name === 'satellites')?.value).toBe(12)
    expect(output[0].errors).toEqual(['Missing end flag: expected \\r\\n'])
    expect(output[1].errors).toBeUndefined()
  })

  test('a lone \\n terminator — parsed, malformed-end-flag error', () => {
    const [cma] = new Parser().parseData(GGA.replace('\r\n', '\n'))
    expect(cma.id).toBe('GGA')
    expect(cma.errors).toEqual(['Invalid end flag: expected \\r\\n, received \\n'])
  })

  test('garbage between two sentences — reported as a garbage sentence', () => {
    const output = new Parser().parseData(`${GGA}some binary junk${GGA}`)
    expect(output).toHaveLength(3)
    expect(output[1].raw).toBe('some binary junk')
    expect(output[1].id).toBe('unknown')
    expect(output[1].protocol).toEqual({ name: 'unknown', version: 'unknown' })
    expect(output[1].payload).toEqual([])
    expect(output[1].metadata.checksum).toBe('unknown')
    expect(output[1].errors).toEqual(['Unparseable input: not an NMEA sentence'])
    // Still a valid CMA — the contract is never bent.
    expect(output[1].metadata.timestamp.received).toBeTypeOf('number')
    expect(output[1].metadata.timestamp.parsed).toBeTypeOf('number')
  })

  test('pure garbage alone — a wrong device is not silent', () => {
    const output = new Parser().parseData('\x00\x01binary protocol data\x02')
    expect(output).toHaveLength(1)
    expect(output[0].id).toBe('unknown')
    expect(output[0].errors).toEqual(['Unparseable input: not an NMEA sentence'])
  })

  test('a sentence with no checksum delimiter is garbage — its length is unknowable', () => {
    const [cma] = new Parser().parseData('$HEHDT,123.4,T\r\n')
    expect(cma.id).toBe('unknown')
    expect(cma.raw).toBe('$HEHDT,123.4,T\r\n')
    expect(cma.errors?.[0]).toContain('no checksum delimiter')
  })

  test('blank lines between sentences are NOT reported (no noise)', () => {
    const output = new Parser().parseData(`${GGA}\r\n\r\n${GGA}`)
    expect(output).toHaveLength(2)
    expect(output.every((cma) => cma.errors === undefined)).toBe(true)
  })

  test('a trailing incomplete sentence is never reported — it is still streaming', () => {
    const parser = new Parser()
    expect(parser.parseData(`${GGA}$GPGGA,1322`)).toHaveLength(1)
    expect(parser.buffer).toBe('$GPGGA,1322')
  })

  // Q4: binary protocols routinely contain '$' bytes, so without a limit the
  // buffer would grow forever and the wrong-device case would stay SILENT.
  test('buffer limit exceeded — the unterminated input is flushed as garbage', () => {
    const parser = new Parser({ bufferLimit: 32 })
    const output = parser.parseData(`$${'\x01binary'.repeat(20)}`)
    expect(output).toHaveLength(1)
    expect(output[0].id).toBe('unknown')
    expect(output[0].errors?.[0]).toContain('Buffer limit exceeded (32 characters)')
    // The buffer is reset, so the parser recovers and the next sentence is clean.
    expect(parser.buffer).toBe('')
    const [next] = parser.parseData(GGA)
    expect(next.errors).toBeUndefined()
  })

  test('every emitted sentence — clean, failed or garbage — is a valid CMA', () => {
    const output = new Parser().parseData(`junk${GGA.replace('*61', '*6')}$HEHDT,1,T\r\n${GGA}`)
    expect(output.length).toBeGreaterThan(3)
    output.forEach((cma) => expect(CMASchema.is(cma)).toBe(true))
  })
})

// The shared API shape is `(id, protocol, options?)` — see docs/STATUS.md. For
// NMEA the protocol SELECTS which definition of an id to use, because the same
// id can be defined by several protocols and versions.
describe('the protocol argument selects which definition of an id is used', () => {
  const parser = (): Parser => new Parser()

  test('omitted, every definition of the id comes back', () => {
    const found = parser().getSentenceDefinition('GGA')
    expect(found.success).toBe(true)
    if (!found.success) return
    expect(found.value.length).toBeGreaterThan(0)
    expect(found.value.every((definition: { id: string }) => definition.id === 'GGA')).toBe(true)
  })

  test('given, only the definitions of that protocol come back', () => {
    const found = parser().getSentenceDefinition('GGA', 'NMEA')
    expect(found.success).toBe(true)
    if (!found.success) return
    expect(found.value.every((definition: { protocol: { name: string } }) => definition.protocol.name === 'NMEA')).toBe(true)
  })

  test('a version works as well as a name', () => {
    const byName = parser().getSentenceDefinition('GGA', 'NMEA')
    const byVersion = parser().getSentenceDefinition('GGA', '3.1')
    expect(byName.success && byVersion.success).toBe(true)
    if (!byName.success || !byVersion.success) return
    expect(byVersion.value).toStrictEqual(byName.value)
  })

  test('a protocol that does not define the id fails, and says which ones do', () => {
    const found = parser().getSentenceDefinition('GGA', 'NORSUB8')
    expect(found.success).toBe(false)
    if (found.success) return
    expect(found.error[0].kind).toBe('unknown-protocol')
    expect(found.error[0].message).toContain('NMEA')
  })

  test('a fake sentence can be pinned to a protocol too', () => {
    const fake = parser().getFakeSentence('GGA', 'NMEA')
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser().parseData(fake.value)
    expect(sentence.id).toBe('GGA')
    expect(sentence.errors).toBeUndefined()
  })
})

// A fake sentence is meant to be COMMITTED — into a spec, an example flow, a bug
// report — so with no options it has to be idempotent (cru, 2026-07-31). The old
// generator used Math.random() on every field, which made every fixture drift.
describe('fake sentences are idempotent by default', () => {
  const parser = (): Parser => new Parser()

  test('the same call returns the same string, twice and across instances', () => {
    const first = parser().getFakeSentence('GGA')
    const second = parser().getFakeSentence('GGA')
    expect(first.success && second.success).toBe(true)
    if (!first.success || !second.success) return
    expect(first.value).toBe(second.value)
  })

  test('every id the parser advertises is stable', () => {
    const one = parser()
    const two = parser()
    for (const id of one.sentenceIds) {
      const a = one.getFakeSentence(id)
      const b = two.getFakeSentence(id)
      expect(a.success).toBe(true)
      if (!a.success || !b.success) continue
      expect(a.value).toBe(b.value)
    }
  })

  test('different sentences and different fields get different values', () => {
    const gga = parser().getFakeSentence('GGA')
    const hdt = parser().getFakeSentence('HDT')
    expect(gga.success && hdt.success && gga.value === hdt.value).toBe(false)
    // fields within one sentence are seeded per index, so they are not all equal
    if (!gga.success) return
    const fields = gga.value.slice(1, gga.value.indexOf('*')).split(',').slice(1)
    expect(new Set(fields).size).toBeGreaterThan(1)
  })

  test('a deterministic fake still parses back cleanly', () => {
    const fake = parser().getFakeSentence('GGA')
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser().parseData(fake.value)
    expect(sentence.id).toBe('GGA')
    expect(sentence.errors).toBeUndefined()
    expect(NMEALikeSchema.is(fake.value)).toBe(true)
  })

  test('{ random: true } opts back into varied values', () => {
    const first = parser().getFakeSentence('GGA', undefined, { random: true })
    const second = parser().getFakeSentence('GGA', undefined, { random: true })
    expect(first.success && second.success).toBe(true)
    if (!first.success || !second.success) return
    expect(first.value).not.toBe(second.value)
    // ...and it must still be a valid sentence
    const [sentence] = parser().parseData(first.value)
    expect(sentence.id).toBe('GGA')
    expect(sentence.errors).toBeUndefined()
  })
})
