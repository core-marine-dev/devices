// installed
import type { DeviceParser } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { attEulerFrame, capture } from './fixtures'

import { firmwares, isFirmware } from '../src/firmware'
import { SeptentrioParser } from '../src/parser'
import { SBFParser } from '../src/protocol-sbf'

// The device facade. A Septentrio receiver can emit SBF, NMEA or RTCM on the
// same port, so the device is not the protocol: this composes a protocol parser
// instead of being one. Only `sbf` exists today.

describe('DeviceParser conformance', () => {
  test('the facade and the protocol parser are interchangeable', () => {
    const parsers: DeviceParser<Uint8Array>[] = [new SeptentrioParser(), new SBFParser()]
    for (const parser of parsers) {
      expect(parser.parseData(attEulerFrame())).toHaveLength(1)
      expect(parser.buffer).toBeInstanceOf(Uint8Array)
      expect(typeof parser.memory).toBe('boolean')
      expect(typeof parser.bufferLimit).toBe('number')
    }
  })

  test('addData then parseData drains, and drains only once', () => {
    const parser = new SeptentrioParser()
    parser.addData(capture())
    expect(parser.parseData()).toHaveLength(195)
    expect(parser.parseData()).toStrictEqual([])
  })
})

describe('protocol selection', () => {
  test('sbf is the default and the only protocol so far', () => {
    const parser = new SeptentrioParser()
    expect(parser.protocol).toBe('sbf')
    expect([...parser.protocols]).toStrictEqual(['sbf'])
    expect(parser.parser).toBeInstanceOf(SBFParser)
  })

  test('an unknown protocol is ignored, never thrown', () => {
    const parser = new SeptentrioParser({ protocol: 'nmea' as 'sbf' })
    expect(parser.protocol).toBe('sbf')
    // @ts-expect-error — deliberately invalid at runtime, as a wrapper might pass
    parser.protocol = 'rtcm'
    expect(parser.protocol).toBe('sbf')
    expect(parser.parseData(attEulerFrame())).toHaveLength(1)
  })

  // The "switching protocol discards the buffer" branch cannot be exercised
  // while SeptentrioProtocol has a single member — there is nothing to switch
  // to. It gets its test when NMEA is added (see docs/STATUS.md §QUEUED).
  test('assigning the SAME protocol keeps the buffer intact', () => {
    const parser = new SeptentrioParser()
    parser.addData(attEulerFrame().subarray(0, 12))
    expect(parser.buffer.byteLength).toBe(12)
    parser.protocol = 'sbf'
    expect(parser.buffer.byteLength).toBe(12)
  })
})

describe('firmware', () => {
  test('4.10.1 is the default and the only one registered', () => {
    expect(firmwares()).toStrictEqual(['4.10.1'])
    expect(isFirmware('4.10.1')).toBe(true)
    expect(isFirmware('9.9.9')).toBe(false)
    expect(new SeptentrioParser().firmware).toBe('4.10.1')
  })

  test('it is reported as protocol.version on every sentence', () => {
    const [sentence] = new SeptentrioParser().parseData(attEulerFrame())
    expect(sentence.protocol).toStrictEqual({ name: 'SBF', version: '4.10.1' })
  })

  test('an unsupported firmware keeps the current one instead of throwing', () => {
    const parser = new SeptentrioParser({ firmware: '1.2.3' })
    expect(parser.firmware).toBe('4.10.1')
    parser.firmware = 'nonsense'
    expect(parser.firmware).toBe('4.10.1')
  })
})

describe('options and setters never throw', () => {
  test('memory and bufferLimit round-trip through the facade', () => {
    const parser = new SeptentrioParser({ memory: false, bufferLimit: 512 })
    expect(parser.memory).toBe(false)
    expect(parser.bufferLimit).toBe(512)
    parser.memory = true
    parser.bufferLimit = 1024
    expect(parser.memory).toBe(true)
    expect(parser.bufferLimit).toBe(1024)
  })

  test('invalid values are discarded, the current ones kept', () => {
    const parser = new SeptentrioParser()
    const { memory, bufferLimit } = parser
    // @ts-expect-error — a Node-RED config field can hand us anything
    parser.memory = 'yes'
    // @ts-expect-error — likewise
    parser.bufferLimit = 'lots'
    parser.bufferLimit = -1
    expect(parser.memory).toBe(memory)
    expect(parser.bufferLimit).toBe(bufferLimit)
  })
})

// The introspection surface is part of the shared DeviceParser contract in
// @coremarine/protocol-core: every parser lists what it knows, describes it and
// can fabricate it, all Result-returning.
describe('getSentenceDefinition', () => {
  test('describes a known block, one entry per revision', () => {
    const result = new SeptentrioParser().getSentenceDefinition(5938)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value).toHaveLength(1)
    const [definition] = result.value
    expect(definition.name).toBe('AttEuler')
    expect(definition.id).toBe('5938')
    expect(definition.revision).toBe(0)
    expect(definition.timestamp).toBe('receiver')
    expect(definition.protocol).toStrictEqual({ name: 'SBF', version: '4.10.1' })
    // Field DEFINITIONS, not values: no raw, no value.
    expect(definition.payload[0]).toStrictEqual({
      name: 'NrSV',
      type: 'uint8',
      doNotUse: 255,
      description: 'The average over all antennas of the number of satellites currently included in the attitude calculations',
    })
  })

  test('a block with revisions describes each of them, newest last', () => {
    const result = new SeptentrioParser().getSentenceDefinition('4007')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.value.map((definition) => definition.revision)).toStrictEqual([0, 1, 2])
    // §4.1.6: each revision is a superset of the previous one.
    expect(result.value[0].payload).toHaveLength(20)
    expect(result.value[1].payload).toHaveLength(22)
    expect(result.value[2].payload).toHaveLength(26)
  })

  test('a sub-block is described with its nested field list', () => {
    const result = new SeptentrioParser().getSentenceDefinition(5942)
    expect(result.success).toBe(true)
    if (!result.success) return
    const sub = result.value[0].payload[2] as { name: string, count: string, length: string, fields: unknown[] }
    expect(sub).toMatchObject({ name: 'AuxAntPositionSub', count: 'N', length: 'SBLength' })
    expect(sub.fields).toHaveLength(10)
  })

  test('explains itself for a block that is not modelled', () => {
    const result = new SeptentrioParser().getSentenceDefinition(4999)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error[0].kind).toBe('unknown-block')
    expect(result.error[0].message).toBe('Block 4999 is not modelled for firmware 4.10.1')
  })

  test('sentenceIds lists every block the parser can describe or fabricate', () => {
    const ids = new SeptentrioParser().sentenceIds
    expect(ids).toContain('5938')
    expect(ids).toContain('4007')
    // Grows with every Phase B block; the assertion is that it matches the
    // registry exactly, not a number someone has to remember to bump.
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => new SeptentrioParser().getSentenceDefinition(id).success)).toBe(true)
  })
})

describe('getFakeSentence', () => {
  test('every modelled block fabricates a frame that parses straight back', () => {
    const parser = new SeptentrioParser()
    for (const id of parser.sentenceIds) {
      const fake = parser.getFakeSentence(id)
      expect(fake.success).toBe(true)
      if (!fake.success) continue
      const [sentence, ...rest] = parser.parseData(fake.value)
      expect(rest).toStrictEqual([])
      expect(sentence.id).toBe(id)
      // A real CRC and a real Length, so no error of any kind on the way back.
      expect(sentence.errors).toBeUndefined()
      expect(fake.value.byteLength % 4).toBe(0)
    }
  })

  test('it is deterministic — the same call twice gives identical bytes', () => {
    const parser = new SeptentrioParser()
    const first = parser.getFakeSentence(5938)
    const second = parser.getFakeSentence(5938)
    expect(first.success && second.success && first.value).toStrictEqual(second.success ? second.value : null)
  })

  test('fields can be overridden by name, and decode back to what was asked', () => {
    const parser = new SeptentrioParser()
    const fake = parser.getFakeSentence(5938, undefined, { fields: { Heading: 123.5, NrSV: 9 } })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(sentence.payload.find((field) => field.name === 'Heading')?.value).toBeCloseTo(123.5, 4)
    expect(sentence.payload.find((field) => field.name === 'NrSV')?.value).toBe(9)
  })

  test('the revision can be chosen, and the frame reports it', () => {
    const parser = new SeptentrioParser()
    const fake = parser.getFakeSentence(4007, undefined, { revision: 0 })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(sentence.metadata.revision).toBe(0)
    expect(sentence.payload).toHaveLength(20)
  })

  test('the time stamp can be pinned, so a fixture has a fixed date', () => {
    const parser = new SeptentrioParser()
    const fake = parser.getFakeSentence(5938, undefined, { tow: 114_126_000, wnc: 2250 })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(new Date(sentence.timestamp).toISOString()).toBe('2023-02-20T07:41:48.000Z')
  })

  test('an unmodelled block or a revision that does not exist fails with a reason', () => {
    const parser = new SeptentrioParser()
    const unmodelled = parser.getFakeSentence(4999)
    expect(unmodelled.success).toBe(false)
    if (!unmodelled.success) expect(unmodelled.error[0].kind).toBe('unknown-block')
    const badRevision = parser.getFakeSentence(5938, undefined, { revision: 7 })
    expect(badRevision.success).toBe(false)
    if (!badRevision.success) {
      expect(badRevision.error[0].kind).toBe('unknown-revision')
      expect(badRevision.error[0].message).toBe('Block AttEuler has revisions 0-0, not 7')
    }
  })
})

// The shared shape is `(id, protocol, options?)`. For SBF the protocol IS the
// firmware, because that is what selects the knowledge base.
describe('the protocol argument is the firmware', () => {
  test('given explicitly, it selects the table a block is described from', () => {
    const parser = new SeptentrioParser()
    const pinned = parser.getSentenceDefinition(5938, '4.10.1')
    expect(pinned.success).toBe(true)
    if (!pinned.success) return
    expect(pinned.value[0].protocol).toStrictEqual({ name: 'SBF', version: '4.10.1' })
  })

  test('omitted, it is the firmware the parser is set to', () => {
    const parser = new SeptentrioParser()
    const implicit = parser.getSentenceDefinition(5938)
    const explicit = parser.getSentenceDefinition(5938, '4.10.1')
    expect(implicit).toStrictEqual(explicit)
  })

  test('an unsupported firmware is refused, not silently answered from another table', () => {
    const parser = new SeptentrioParser()
    for (const result of [parser.getSentenceDefinition(5938, '9.9.9'), parser.getFakeSentence(5938, '9.9.9')]) {
      expect(result.success).toBe(false)
      if (result.success) continue
      expect(result.error[0].kind).toBe('unknown-firmware')
      expect(result.error[0].message).toContain('4.10.1')
    }
  })

  test('a fake frame can be pinned to a firmware and still round-trips', () => {
    const parser = new SeptentrioParser()
    const fake = parser.getFakeSentence(4007, '4.10.1', { revision: 2 })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    expect(sentence.protocol.version).toBe('4.10.1')
    expect(sentence.metadata.revision).toBe(2)
  })
})

// Same rule as the text parsers: a fake frame with no options is IDEMPOTENT, so
// it can be committed; `{ random: true }` fills the unspecified fields with
// varied values for hammering the decoders.
describe('fake frames are idempotent, with random as an opt-in', () => {
  test('no options: the same bytes every time, for every block', () => {
    const one = new SeptentrioParser()
    const two = new SeptentrioParser()
    for (const id of one.sentenceIds) {
      const a = one.getFakeSentence(id)
      const b = two.getFakeSentence(id)
      expect(a.success && b.success).toBe(true)
      if (!a.success || !b.success) continue
      expect(a.value).toStrictEqual(b.value)
    }
  })

  test('{ random: true } fills the fields with varied values, still round-tripping', () => {
    const parser = new SeptentrioParser()
    const plain = parser.getFakeSentence(5938)
    const varied = parser.getFakeSentence(5938, undefined, { random: true })
    expect(plain.success && varied.success).toBe(true)
    if (!plain.success || !varied.success) return
    expect(varied.value).not.toStrictEqual(plain.value)
    const [sentence] = parser.parseData(varied.value)
    expect(sentence.metadata.name).toBe('AttEuler')
    expect(sentence.errors).toBeUndefined()
    // the zero-filled frame has a heading of 0; the varied one should not
    const heading = sentence.payload.find((field) => field.name === 'Heading')?.value
    expect(heading).not.toBe(0)
  })

  test('random is still reproducible for the same block — seeded, not chaotic', () => {
    const a = new SeptentrioParser().getFakeSentence(4007, undefined, { random: true })
    const b = new SeptentrioParser().getFakeSentence(4007, undefined, { random: true })
    expect(a.success && b.success).toBe(true)
    if (!a.success || !b.success) return
    expect(a.value).toStrictEqual(b.value)
  })
})
