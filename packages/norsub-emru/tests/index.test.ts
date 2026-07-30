// installed
import type { CMA, DeviceParser, Metadata } from '@coremarine/nmea-parser'
import { describe, expect, test } from 'vitest'

// coded
import { NorsubNMEAParser, NorsubParser } from '../src'
import type { Status } from '../src'

// HELPERS ------------------------------------------------------------------------------------------------------------
// The OEM manual's example checksums are unreliable (`$PRDID,-000.49,-000.14,*61`
// actually computes to 6F, and the PNORSUB2 example reuses PNORSUB's 62), so every
// fixture here is checksummed from its own body.
const checksum = (body: string): string => {
  let result = 0
  for (const character of body) result ^= character.charCodeAt(0)
  return result.toString(16).toUpperCase().padStart(2, '0')
}

const nmea = (body: string): string => `$${body}*${checksum(body)}\r\n`

// A PNORSUB sentence of `fields` payload slots, zero-filled except the trailing
// status value(s) supplied by the caller.
const pnorsub = (id: string, fields: number, ...status: number[]): string => {
  const zeros = Array<string>(fields - status.length).fill('0')
  return nmea([id, ...zeros, ...status.map(String)].join(','))
}

const payloadMetadata = (sentence: CMA): Metadata => (sentence.metadata.payload ?? {}) as Metadata
const fieldStatus = (sentence: CMA): unknown => sentence.payload.at(-1)?.metadata?.status

const ALL_BITS = 0xFFFFFFFF
const ALL_BITS_LOW = 0xFFFF
const ALL_BITS_HIGH = 0xFFFF

// The five sentences carrying the status bitfield in a single trailing uint32,
// with their payload length (the aggregator registry key's second half).
const SINGLE_STATUS: [string, number][] = [
  ['PNORSUB', 7],
  ['PNORSUB2', 8],
  ['PNORSUB6', 18],
  ['PNORSUB7', 24],
  ['PNORSUB8', 24],
]

const PROTOCOLS = [
  'NMEA', 'GYROCOMPAS1', 'NORSUB', 'NORSUB2', 'NORSUB6', 'NORSUB7', 'NORSUB7b', 'NORSUB8',
  'NORSUB PRDID', 'Tokimek PTVG', 'RDI ADCP', 'SMCA', 'SMCC',
]

// FACADE -------------------------------------------------------------------------------------------------------------
describe('NorsubParser — device facade', () => {
  test('defaults: nmea protocol, memory on, empty buffer', () => {
    const parser = new NorsubParser()
    expect(parser.protocol).toBe('nmea')
    expect(parser.protocols).toEqual(['nmea'])
    expect(parser.memory).toBeTruthy()
    expect(parser.buffer).toBe('')
  })

  test('satisfies the shared DeviceParser<string> contract', () => {
    const parsers: DeviceParser<string>[] = [new NorsubParser(), new NorsubNMEAParser()]
    for (const parser of parsers) {
      expect(parser.parseData(nmea('INHDT,123.456,T'))).toHaveLength(1)
    }
  })

  test('constructor options reach the protocol parser', () => {
    const parser = new NorsubParser({ bufferLimit: 512, memory: false })
    expect(parser.memory).toBeFalsy()
    expect(parser.bufferLimit).toBe(512)
    expect(parser.parser.memory).toBeFalsy()
    expect(parser.parser.bufferLimit).toBe(512)
  })

  test('an unknown protocol falls back to the default instead of throwing', () => {
    // A JS consumer has no type checking — the guard is what protects them.
    const parser = new NorsubParser({ protocol: 'tss1' as 'nmea' })
    expect(parser.protocol).toBe('nmea')
  })

  test('setters discard invalid values and keep the current one', () => {
    const parser = new NorsubParser()
    parser.memory = 'yes' as unknown as boolean
    expect(parser.memory).toBeTruthy()
    parser.bufferLimit = -1
    expect(parser.bufferLimit).toBeGreaterThan(0)
  })

  test('assigning the protocol already in use preserves buffered input', () => {
    const parser = new NorsubParser()
    parser.addData('$PNORSUB8,0,0')
    expect(parser.buffer).not.toBe('')
    parser.protocol = 'nmea'
    expect(parser.buffer).not.toBe('')
  })

  // NOTE: the locked "switching protocol DISCARDS the buffer and any undrained
  // sentences" path cannot be exercised while `NorsubProtocol` has a single member —
  // there is nothing to switch to. It gets its test with protocol #2 (tss1 /
  // custom-binary), which is the release that first makes the branch reachable.

  test('protocol-specific extras are reached through .parser, not delegated', () => {
    const parser = new NorsubParser()
    expect(parser.parser).toBeInstanceOf(NorsubNMEAParser)
    const found = parser.parser.getSentenceDefinition('PNORSUB8')
    expect(found.success).toBe(true)
    expect(found.success ? found.value[0].protocol.name : '').toBe('NORSUB8')
    expect(parser).not.toHaveProperty('getSentenceDefinition')
  })
})

// KNOWLEDGE BASE -----------------------------------------------------------------------------------------------------
describe('knowledge base', () => {
  test('registers the NorSub protocols alongside the inherited NMEA built-ins', () => {
    const parser = new NorsubParser()
    const registered = parser.parser.getSentencesByProtocol()
    for (const protocol of PROTOCOLS) expect(registered).toHaveProperty(protocol)
  })

  test('standard NMEA sentences still parse (inherited built-ins)', () => {
    const parser = new NorsubParser()
    const [hdt] = parser.parseData(nmea('INHDT,123.456,T'))
    expect(hdt.id).toBe('HDT')
    expect(hdt.protocol.name).toBe('NMEA')
    expect(hdt.payload[0].value).toBeCloseTo(123.456)
  })

  test('every fake sentence round-trips through the exposed protocol parser', () => {
    const parser = new NorsubParser()
    const registered = parser.parser.getSentencesByProtocol()
    for (const [protocol, sentences] of Object.entries(registered)) {
      if (protocol === 'NMEA') continue
      for (const stored of sentences) {
        const result = parser.parser.getFakeSentence(stored.id)
        expect(result.success).toBe(true)
        const fake = result.success ? result.value : null
        expect(parser.parseData(`${fake}\r\n`)).toHaveLength(1)
      }
    }
  })

  test('the user-facing YAML feed still works through .parser', () => {
    const parser = new NorsubParser()
    const yaml = [
      'protocols:',
      '  - protocol: CUSTOM',
      '    standard: false',
      '    sentences:',
      '      - id: PCUST',
      '        payload:',
      '          - name: value',
      '            type: uint16',
    ].join('\n')
    expect(parser.parser.addSentences(yaml).success).toBeTruthy()
    const [custom] = parser.parseData(nmea('PCUST,42'))
    expect(custom.id).toBe('PCUST')
    expect(custom.payload[0].value).toBe(42)
  })
})

// STATUS METADATA ----------------------------------------------------------------------------------------------------
describe('status metadata placement', () => {
  test.each(SINGLE_STATUS)('%s carries status at BOTH field and payload level', (id, fields) => {
    const parser = new NorsubParser()
    const [sentence] = parser.parseData(pnorsub(id, fields, ALL_BITS))
    expect(sentence.id).toBe(id)
    expect(sentence.payload).toHaveLength(fields)
    expect(sentence.payload.at(-1)?.name).toBe('status')
    // Rule 1 — the uint32 field decodes on its own.
    expect(fieldStatus(sentence)).toBeDefined()
    // Rules 2+3 — mirrored at payload level so every variant reads the same way.
    expect(payloadMetadata(sentence).status).toEqual(fieldStatus(sentence))
  })

  test('PNORSUB7b carries status ONLY at payload level', () => {
    const parser = new NorsubParser()
    const [sentence] = parser.parseData(pnorsub('PNORSUB7b', 25, ALL_BITS_LOW, ALL_BITS_HIGH))
    expect(sentence.id).toBe('PNORSUB7b')
    expect(sentence.payload).toHaveLength(25)
    expect(sentence.payload.at(-2)?.name).toBe('status_a')
    expect(sentence.payload.at(-1)?.name).toBe('status_b')
    // Neither uint16 half decodes alone, so there is deliberately no field metadata.
    expect(sentence.payload.at(-1)?.metadata).toBeUndefined()
    expect(sentence.payload.at(-2)?.metadata).toBeUndefined()
    expect(payloadMetadata(sentence).status).toBeDefined()
  })

  test('a split status decodes to the same value as the combined one', () => {
    const parser = new NorsubParser()
    const [split] = parser.parseData(pnorsub('PNORSUB7b', 25, ALL_BITS_LOW, ALL_BITS_HIGH))
    const [combined] = parser.parseData(pnorsub('PNORSUB8', 24, ALL_BITS))
    expect(payloadMetadata(split).status).toEqual(payloadMetadata(combined).status)
  })

  test('all bits set decodes to all-true, all bits clear to all-false', () => {
    const parser = new NorsubParser()
    const [set] = parser.parseData(pnorsub('PNORSUB8', 24, ALL_BITS))
    const [clear] = parser.parseData(pnorsub('PNORSUB8', 24, 0))
    const flatten = (status: unknown): boolean[] => (
      Object.values(status as Record<string, unknown>).flatMap((value) => (
        typeof value === 'boolean' ? [value] : flatten(value)
      ))
    )
    expect(flatten(payloadMetadata(set).status)).toSatisfy((bits: boolean[]) => bits.every(Boolean))
    expect(flatten(payloadMetadata(clear).status)).toSatisfy((bits: boolean[]) => !bits.some(Boolean))
    expect((payloadMetadata(set).status as Status).main).toEqual({ health: true, ok: true })
  })

  test.each(['HEHDT,123.4,T', 'PHTRO,1.2,M,3.4,P', 'PRDID,-000.49,-000.14', 'PSMCA,1,2,3,4,5'])(
    'non-PNORSUB sentence %s gets no status metadata', (body) => {
      const parser = new NorsubParser()
      const [sentence] = parser.parseData(nmea(body))
      expect(payloadMetadata(sentence).status).toBeUndefined()
      expect(fieldStatus(sentence)).toBeUndefined()
    },
  )

  test('the old top-level metadata.status is gone', () => {
    const parser = new NorsubParser()
    const [sentence] = parser.parseData(pnorsub('PNORSUB8', 24, ALL_BITS))
    expect(sentence.metadata.status).toBeUndefined()
  })
})

// PTVG ---------------------------------------------------------------------------------------------------------------
describe('PTVG decode', () => {
  test('decodes pitch/roll (x100) and heading into field metadata', () => {
    const parser = new NorsubParser()
    const [ptvg] = parser.parseData(nmea('PTVG,-0036P, 0021R,101.8T'))
    expect(ptvg.id).toBe('PTVG')
    // The wire glues the letter to the value, so the raw fields stay strings.
    expect(ptvg.payload.map((field) => field.value)).toEqual(['-0036P', ' 0021R', '101.8T'])
    expect(ptvg.payload[0].metadata).toEqual({ degrees: -0.36 })
    expect(ptvg.payload[1].metadata).toEqual({ degrees: 0.21 })
    expect(ptvg.payload[2].metadata).toEqual({ degrees: 101.8 })
  })

  test('a space sign reads as positive (bow down)', () => {
    const parser = new NorsubParser()
    const [ptvg] = parser.parseData(nmea('PTVG, 0036P,-0021R,000.0T'))
    expect(ptvg.payload[0].metadata).toEqual({ degrees: 0.36 })
    expect(ptvg.payload[1].metadata).toEqual({ degrees: -0.21 })
  })

  test('non-numeric fields produce no metadata instead of throwing', () => {
    const parser = new NorsubParser()
    const [ptvg] = parser.parseData(nmea('PTVG,abcP,defR,ghiT'))
    expect(ptvg.id).toBe('PTVG')
    for (const field of ptvg.payload) expect(field.metadata).toBeUndefined()
  })

  test('a missing unit letter produces no metadata', () => {
    const parser = new NorsubParser()
    const [ptvg] = parser.parseData(nmea('PTVG,-0036,0021,101.8'))
    for (const field of ptvg.payload) expect(field.metadata).toBeUndefined()
  })
})

// PRDID ---------------------------------------------------------------------------------------------------------------
// Same id, two definitions, separated by payload length — exactly what the
// multi-definition knowledge base is for. The OEM manual shows a trailing comma on
// the NORSUB telegram; that is a typo (cru, 2026-07-29), so the 2-field form is the
// real one and the 3-field form belongs to the RDI ADCP.
describe('PRDID — same id, two definitions', () => {
  test('two payload fields match the NORSUB definition', () => {
    const parser = new NorsubParser()
    const [prdid] = parser.parseData(nmea('PRDID,-000.49,-000.14'))
    expect(prdid.protocol.name).toBe('NORSUB PRDID')
    expect(prdid.payload).toHaveLength(2)
    expect(prdid.payload.map((field) => field.name)).toEqual(['pitch', 'roll'])
    expect(prdid.payload[0].value).toBeCloseTo(-0.49)
  })

  test('a trailing comma makes it the 3-field RDI ADCP definition, heading null', () => {
    const parser = new NorsubParser()
    const [prdid] = parser.parseData(nmea('PRDID,-000.49,-000.14,'))
    expect(prdid.protocol.name).toBe('RDI ADCP')
    expect(prdid.payload).toHaveLength(3)
    expect(prdid.payload[2].name).toBe('heading')
    expect(prdid.payload[2].value).toBeNull()
  })
})

// TIMESTAMP ----------------------------------------------------------------------------------------------------------
describe('timestamp metadata', () => {
  test('every sentence carries received + parsed and NO sentence timestamp', () => {
    const parser = new NorsubParser()
    const sentences = parser.parseData([
      pnorsub('PNORSUB8', 24, ALL_BITS),
      nmea('PTVG,-0036P, 0021R,101.8T'),
      nmea('HEHDT,123.4,T'),
    ].join(''))
    expect(sentences).toHaveLength(3)
    for (const sentence of sentences) {
      // T1/T2 are a wrapping internal-clock counter, never a wall clock, so no
      // NorSub sentence can supply `sentence` — datasheet-verified.
      expect(Object.keys(sentence.metadata.timestamp)).toEqual(['received', 'parsed'])
      expect(sentence.metadata.timestamp.sentence).toBeUndefined()
      expect(sentence.metadata.timestamp.received).toBeLessThanOrEqual(sentence.metadata.timestamp.parsed)
    }
  })

  test('T1/T2 keep their raw value with no metadata of their own', () => {
    const parser = new NorsubParser()
    const [sentence] = parser.parseData(pnorsub('PNORSUB8', 24, ALL_BITS))
    const time = sentence.payload.find((field) => field.name === 'time')
    const delay = sentence.payload.find((field) => field.name === 'delay')
    expect(time?.units).toBe('us')
    expect(delay?.units).toBe('us')
    expect(time?.metadata).toBeUndefined()
    expect(delay?.metadata).toBeUndefined()
  })
})

// ROBUSTNESS ---------------------------------------------------------------------------------------------------------
describe('never throws', () => {
  test('a bad checksum is emitted WITH an error, never dropped', () => {
    const parser = new NorsubParser()
    const [sentence] = parser.parseData('$PNORSUB8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1*00\r\n')
    expect(sentence).toBeDefined()
    expect(sentence.errors?.length).toBeGreaterThan(0)
  })

  test.each(['', 'not a sentence', '$\r\n', '$PNORSUB8*FF\r\n', '\r\n\r\n'])(
    'garbage input %j returns without throwing', (input) => {
      const parser = new NorsubParser()
      expect(() => parser.parseData(input)).not.toThrow()
    },
  )

  test('a partial sentence stays buffered until completed', () => {
    const parser = new NorsubParser()
    const complete = pnorsub('PNORSUB8', 24, ALL_BITS)
    const split = complete.length - 6
    expect(parser.parseData(complete.slice(0, split))).toHaveLength(0)
    expect(parser.buffer).not.toBe('')
    const [sentence] = parser.parseData(complete.slice(split))
    expect(sentence.id).toBe('PNORSUB8')
    expect(parser.buffer).toBe('')
  })
})
