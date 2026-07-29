// installed
import { describe, expect, test } from 'vitest'

// coded
import { NMEAParser } from '../src'
import { BUILTIN_SENTENCE_RESOLVERS, resolveSentenceId } from '../src/resolvers'
import type { SentenceResolvers } from '../src/resolvers'
import type { DraftCMA } from '../src/types'

// Kongsberg Seatex sends BOTH variants as `$PSXN,...` with the same field count,
// so the knowledge base (keyed `id + payload length`) cannot tell them apart.
// A resolver rewrites the id BEFORE the lookup, which lets the variants live in
// nmea.yml as ordinary definitions. Source: MGC COMPASS manual Rev. 15, p108-109.
// Real sentences, taken from a live MGC capture.
const PSXN20 = '$PSXN,20,0,0,0,0*3B\r\n'
const PSXN23 = '$PSXN,23,0.231,0.174,309.56,-0.033*2E\r\n'

const draft = (id: string, raws: string[]): DraftCMA => ({
  raw: '',
  timestamp: 0,
  id,
  protocol: { name: 'NMEA', version: 'unknown' },
  payload: raws.map((raw) => ({ raw, name: 'unknown', type: 'string', value: raw })),
  metadata: {},
})

describe('resolveSentenceId', () => {
  test('PSXN with message number 20 resolves to PSXN20', () => {
    expect(resolveSentenceId(draft('PSXN', ['20', '0', '0', '0', '0'])).id).toBe('PSXN20')
  })

  test('PSXN with message number 23 resolves to PSXN23', () => {
    expect(resolveSentenceId(draft('PSXN', ['23', '1', '2', '3', '4'])).id).toBe('PSXN23')
  })

  test('an UNKNOWN message number leaves the id alone (no invented definition)', () => {
    expect(resolveSentenceId(draft('PSXN', ['99', '1', '2', '3', '4'])).id).toBe('PSXN')
  })

  test('a different field count is not a PSXN candidate at all', () => {
    expect(resolveSentenceId(draft('PSXN', ['20', '1'])).id).toBe('PSXN')
  })

  test('sentences with no resolver pass through untouched', () => {
    const sentence = draft('GGA', ['1', '2'])
    expect(resolveSentenceId(sentence)).toBe(sentence)
  })

  test('a resolver returning the same id does not clone the sentence', () => {
    const resolvers: SentenceResolvers = { 'AAA:1': () => 'AAA' }
    const sentence = draft('AAA', ['x'])
    expect(resolveSentenceId(sentence, resolvers)).toBe(sentence)
  })

  test('the built-in registry is keyed on the id AS RECEIVED', () => {
    expect(Object.keys(BUILTIN_SENTENCE_RESOLVERS)).toContain('PSXN:5')
  })
})

describe('PSXN end to end', () => {
  test('PSXN20 — decoded from YAML, quality labels as field metadata', () => {
    const [cma] = new NMEAParser().parseData(PSXN20)
    expect(cma.id).toBe('PSXN20')
    expect(cma.protocol).toEqual({ name: 'KONGSBERG SEATEX', version: '15' })
    expect(cma.metadata.standard).toBe(false)
    expect(cma.errors).toBeUndefined()
    expect(cma.payload.map((field) => field.name)).toEqual([
      'message_number', 'horizontal_quality', 'height_quality', 'heading_quality', 'roll_pitch_quality',
    ])
    // The message number is KEPT as a field, so payload stays aligned with the raw CSV.
    expect(cma.payload[0].value).toBe(20)
    expect(cma.payload[1].metadata).toEqual({ label: 'Normal' })
    expect(cma.payload[4].metadata).toEqual({ label: 'Normal' })
  })

  test('PSXN20 — each quality code gets its own label', () => {
    const [cma] = new NMEAParser().parseData('$PSXN,20,0,1,2,9*33\r\n')
    expect(cma.payload[1].metadata).toEqual({ label: 'Normal' })
    expect(cma.payload[2].metadata).toEqual({ label: 'Reduced performance' })
    expect(cma.payload[3].metadata).toEqual({ label: 'Invalid data' })
    // An undocumented code is labelled, never guessed.
    expect(cma.payload[4].metadata).toEqual({ label: 'unknown' })
  })

  test('PSXN23 — attitude and heave decoded with units', () => {
    const [cma] = new NMEAParser().parseData(PSXN23)
    expect(cma.id).toBe('PSXN23')
    expect(cma.protocol).toEqual({ name: 'KONGSBERG SEATEX', version: '15' })
    expect(cma.errors).toBeUndefined()
    expect(cma.payload.map((field) => [field.name, field.value, field.units])).toEqual([
      ['message_number', 23, undefined],
      ['roll', 0.231, 'deg'],
      ['pitch', 0.174, 'deg'],
      ['heading', 309.56, 'deg'],
      ['heave', -0.033, 'm'],
    ])
  })

  test('`raw` is NEVER rewritten — it keeps the $PSXN the device sent', () => {
    const [cma] = new NMEAParser().parseData(PSXN23)
    expect(cma.raw).toBe(PSXN23)
    expect(cma.raw.startsWith('$PSXN,23')).toBe(true)
    // ...and the checksum, which is computed over the raw, still verifies.
    expect(cma.metadata.checksum).toBe('2E')
  })

  test('an unknown message number stays a generic PSXN, no error invented', () => {
    const [cma] = new NMEAParser().parseData('$PSXN,99,1,2,3,4*3D\r\n')
    expect(cma.id).toBe('PSXN')
    expect(cma.protocol).toEqual({ name: 'NMEA', version: 'unknown' })
    expect(cma.errors).toBeUndefined()
    expect(cma.payload.every((field) => field.name === 'unknown')).toBe(true)
  })

  // The two fixes composing: cru's device drops the LEADING ZERO of the
  // checksum. The sentence is still resolved and fully decoded, and the only
  // complaint is the format — the value itself matches, so the data is intact.
  test('1-character checksum (dropped leading zero) — resolved, decoded, format-only error', () => {
    const [cma] = new NMEAParser().parseData('$PSXN,23,0.231,0.174,309.56,0.000*3\r\n')
    expect(cma.id).toBe('PSXN23')
    expect(cma.payload[1].value).toBeCloseTo(0.231)
    expect(cma.errors).toHaveLength(1)
    expect(cma.errors?.[0]).toContain('Invalid checksum format')
  })

  test('a genuinely wrong checksum still resolves and decodes, with both errors', () => {
    const [cma] = new NMEAParser().parseData('$PSXN,23,0.231,0.174,309.56,-0.033*2\r\n')
    expect(cma.id).toBe('PSXN23')
    expect(cma.payload[4].value).toBeCloseTo(-0.033)
    expect(cma.errors).toHaveLength(2)
  })

  test('a PSXN missing its terminator is still resolved and flagged', () => {
    const output = new NMEAParser().parseData(`${PSXN20.replace('\r\n', '')}${PSXN23}`)
    expect(output.map((cma) => cma.id)).toEqual(['PSXN20', 'PSXN23'])
    expect(output[0].errors).toEqual(['Missing end flag: expected \\r\\n'])
    expect(output[1].errors).toBeUndefined()
  })

  test('both variants are in the knowledge base as ordinary definitions', () => {
    const parser = new NMEAParser()
    expect(parser.getSentence('PSXN20')?.payload).toHaveLength(5)
    expect(parser.getSentence('PSXN23')?.payload).toHaveLength(5)
    expect('KONGSBERG SEATEX' in parser.getSentencesByProtocol()).toBe(true)
  })
})
