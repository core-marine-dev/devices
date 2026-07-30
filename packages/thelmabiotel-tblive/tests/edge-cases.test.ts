// installed
import { CMASchema, UNKNOWN } from '@coremarine/protocol-core'
import type { CMA, Field, Metadata } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { TBLiveParser } from '../src/index'

// The awkward inputs. This device is badly behaved and poorly documented, so these
// are the cases that decide whether the parser stays honest under real noise.

const parse = (input: string, options = {}): CMA[] => new TBLiveParser(options).parseData(input)

const one = (input: string, options = {}): CMA => {
  const sentences = parse(input, options)
  expect(sentences).toHaveLength(1)
  return sentences[0]
}

const field = (sentence: CMA, name: string): Field | undefined => sentence.payload.find((f) => f.name === name)
const payloadMetadata = (sentence: CMA): Metadata => (sentence.metadata.payload ?? {}) as Metadata

describe('missing identifiers degrade to unknown rather than lying', () => {
  test('a detection with an empty receiver serial', () => {
    const sentence = one('$,1589557202,615,S64K,1285,0,24,69,11\r')
    expect(sentence.id).toBe('emitter')
    expect(field(sentence, 'receiver_serial_number')?.value).toBeNull()
    expect(field(sentence, 'receiver_serial_number')?.errors).toBeUndefined()
    expect(payloadMetadata(sentence).receiver).toBe(UNKNOWN)
  })

  test('a detection with an empty emitter serial', () => {
    const sentence = one('$1000042,1589557202,615,S64K,,0,24,69,11\r')
    expect(field(sentence, 'emitter')?.value).toBeNull()
    expect(payloadMetadata(sentence).emitter).toBe(UNKNOWN)
  })

  test('a log with an empty receiver serial', () => {
    const sentence = one('$,1589557600,TBR Sensor,297,15,29,69,6\r')
    expect(sentence.id).toBe('receiver')
    expect(payloadMetadata(sentence).receiver).toBe(UNKNOWN)
  })

  test('a ping with no serial at all', () => {
    const sentence = one('SN=><>\r')
    expect(sentence.id).toBe('ping')
    expect(sentence.payload[0].value).toBeNull()
    expect(payloadMetadata(sentence).receiver).toBe(UNKNOWN)
  })
})

describe('missing measurements produce no metadata rather than a substitute', () => {
  test('a log with no temperature', () => {
    const sentence = one('$1000042,1589557600,TBR Sensor,,15,29,69,6\r')
    expect(field(sentence, 'temperature')?.value).toBeNull()
    expect(field(sentence, 'temperature')?.metadata).toBeUndefined()
    expect(payloadMetadata(sentence)).not.toHaveProperty('temperature')
  })

  test('a log with neither noise reading', () => {
    const sentence = one('$1000042,1589557600,TBR Sensor,297,,,69,6\r')
    expect(payloadMetadata(sentence)).not.toHaveProperty('noise')
  })

  test('a log with only one noise reading still aggregates', () => {
    const sentence = one('$1000042,1589557600,TBR Sensor,297,15,,69,6\r')
    expect(payloadMetadata(sentence).noise).toEqual({ average: 15, peak: undefined })
  })

  test('a log with no seconds gets no time metadata', () => {
    const sentence = one('$1000042,,TBR Sensor,297,15,29,69,6\r')
    expect(payloadMetadata(sentence)).not.toHaveProperty('time')
  })

  test('a detection with no snr gets no snr metadata', () => {
    const sentence = one('$1000042,1589557202,615,S64K,1285,0,,69,11\r')
    expect(field(sentence, 'snr')?.metadata).toBeUndefined()
    expect(payloadMetadata(sentence)).not.toHaveProperty('snr')
  })
})

describe('the declared type is the range check', () => {
  test('a value beyond its declared type is null plus an error', () => {
    // `frequency` is uint8, so 999 does not fit. This is a TYPE failure, not a
    // plausibility judgement — the parser never decides whether 69 kHz is sensible.
    const sentence = one('$1000042,1589557202,615,S64K,1285,0,24,999,11\r')
    expect(field(sentence, 'frequency')?.value).toBeNull()
    expect(field(sentence, 'frequency')?.errors).toEqual(['Invalid frequency: 999'])
    expect(sentence.errors).toEqual(['Invalid frequency: 999'])
  })

  test('a timestamp beyond uint32 is reported rather than silently wrapped', () => {
    const sentence = one('UT=9999999999')
    expect(sentence.payload[0].value).toBeNull()
    expect(sentence.errors).toEqual(['Invalid time: 9999999999'])
    expect(sentence.metadata.payload).toBeUndefined()
  })

  test('several bad fields are all reported', () => {
    const sentence = one('$1000042,1589557202,615,S64K,1285,0,999,999,11\r')
    expect(sentence.errors).toHaveLength(2)
  })
})

describe('unknown command values are not guessed', () => {
  test('an unknown log interval yields no metadata', () => {
    const sentence = one('LI=99')
    expect(sentence.payload[0].value).toBe('99')
    expect(sentence.metadata.payload).toBeUndefined()
    expect(sentence.errors).toBeUndefined()
  })

  test('an unknown firmware version does not poison the learned state', () => {
    const parser = new TBLiveParser({ firmware: '1.0.1' })
    const sentence = parser.parseData('FV=9.9.9')[0]
    expect(sentence.id).toBe('firmware')
    expect(sentence.payload[0].value).toBe('9.9.9')
    // The sentence reports what the device said; the parser keeps what it trusts.
    expect(parser.firmware).toBe('1.0.1')
  })

  test('the firmware setter accepts a valid value', () => {
    const parser = new TBLiveParser()
    parser.firmware = '1.0.2'
    expect(parser.firmware).toBe('1.0.2')
    expect(parser.parseData('FC=69')[0].protocol.version).toBe('1.0.2')
  })
})

describe('unrecognised sample shapes keep their data', () => {
  test('empty fields inside an unknown shape stay null', () => {
    const sentence = one('$1,,3\r')
    expect(sentence.id).toBe(UNKNOWN)
    expect(sentence.errors).toEqual(['Unknown field count: 3'])
    expect(sentence.payload.map((f) => f.value)).toEqual(['1', null, '3'])
  })

  test('a bare terminator is an empty single field, not a crash', () => {
    const sentence = one('$\r')
    expect(sentence.id).toBe(UNKNOWN)
    expect(sentence.errors).toEqual(['Unknown field count: 1'])
  })

  test('too many fields is reported, not truncated to a known shape', () => {
    const sentence = one('$1000042,1589557202,615,S64K,1285,0,24,69,11,99\r')
    expect(sentence.id).toBe(UNKNOWN)
    expect(sentence.errors).toEqual(['Unknown field count: 10'])
    expect(sentence.payload).toHaveLength(10)
  })
})

describe('partially received tokens wait instead of failing', () => {
  test.each([
    ['ack0'],
    ['LIVE'],
    ['UF'],
    ['SN=0007'],
    ['FV=1.0'],
    // A serial too short to meet the 6-digit minimum could still be completed.
    ['SN=12'],
    // Split INSIDE a start flag. The device sends one character per millisecond, so
    // this is routine — treating it as junk would consume it and lose the sentence.
    ['In Command Mo'],
    ['SN'],
    ['ac'],
    ['F'],
  ])('%s is held on the buffer', (partial) => {
    const parser = new TBLiveParser()
    expect(parser.parseData(partial)).toEqual([])
    expect(parser.buffer).toBe(partial)
  })

  test('a held partial completes on the next write', () => {
    const parser = new TBLiveParser()
    parser.parseData('ack0')
    const sentences = parser.parseData('1\r')
    expect(sentences).toHaveLength(1)
    expect(sentences[0].id).toBe('clock_round')
  })

  test.each([
    [['SN', '=1000045'], 'serial_number'],
    [['I', 'n Command Mode\nEX!\nL is Luhn\'s verification number.'], 'api'],
    [['a', 'c', 'k', '0', '1', '\r'], 'clock_round'],
    [['FV', '=1.0.2'], 'firmware'],
  ])('a sentence split inside its start flag survives: %j', (writes, id) => {
    // Regression: these fragments used to be emitted as garbage and CONSUMED, so
    // the sentence was destroyed. At one character per millisecond that is not an
    // edge case, it is the normal case.
    const parser = new TBLiveParser()
    const sentences = writes.flatMap((write) => parser.parseData(write))
    expect(sentences).toHaveLength(1)
    expect(sentences[0].id).toBe(id)
    expect(sentences[0].errors).toBeUndefined()
    expect(parser.buffer).toBe('')
  })

  test('a stream delivered one character at a time decodes intact', () => {
    const input = '$1000042,1589557202,615,S64K,1285,0,24,69,11\rack01\rFC=69'
    const parser = new TBLiveParser()
    const sentences = [...input].flatMap((char) => parser.parseData(char))
    expect(sentences.map((s) => s.id)).toEqual(['emitter', 'clock_round', 'frequency'])
    expect(sentences.every((s) => s.errors === undefined)).toBe(true)
  })
})

describe('malformed tokens are garbage, not pending', () => {
  test.each([
    ['FC=6X', 'a digit token with a non-digit before its minimum'],
    ['FV=abc', 'a version token followed by non-version text'],
  ])('%s (%s)', (input) => {
    const sentence = one(input)
    expect(sentence.id).toBe(UNKNOWN)
    expect(sentence.errors).toEqual(['Unrecognised input'])
    expect(sentence.raw).toBe(input)
  })

  test('a malformed token followed by a good sentence does not swallow it', () => {
    const sentences = parse('FV=abcack01\r')
    expect(sentences.map((s) => s.id)).toEqual([UNKNOWN, 'clock_round'])
  })
})

describe('nested and stacked interference', () => {
  test('a sample opening inside another sample', () => {
    // Corrupted bytes routinely leave a stray `$`. The inner, complete sentence is
    // kept and the outer fragment reported — never recomposed.
    const sentences = parse('$abc$1000042,1589557202,615,S64K,1285,0,24,69,11\r')
    expect(sentences).toHaveLength(2)
    expect(sentences[0].id).toBe(UNKNOWN)
    expect(sentences[0].errors).toEqual(['Interrupted by sample'])
    expect(sentences[0].raw).toBe('$abc')
    expect(sentences[1].id).toBe('emitter')
  })

  test('a command echo landing inside a log', () => {
    const sentences = parse('$1000042,1589557600,TBR Sensor,297,FC=69,29,69,6\r')
    expect(sentences[0].errors).toEqual(['Interrupted by frequency'])
    expect(sentences.some((s) => s.id === 'frequency')).toBe(true)
    expect(sentences.some((s) => s.id === 'receiver')).toBe(false)
  })

  test('repeated interference coalesces the wreckage into one report', () => {
    // Each stray `$` wrecks the chunk before it. Consecutive fragments carrying the
    // same error are merged, so cascading corruption is one report, not a flood.
    const sentences = parse('$a$b$1000042,1589557202,615,S64K,1285,0,24,69,11\r')
    expect(sentences).toHaveLength(2)
    expect(sentences[0].errors).toEqual(['Interrupted by sample'])
    expect(sentences[0].raw).toBe('$a$b')
    expect(sentences[1].id).toBe('emitter')
  })

  test('every character survives, whatever the damage', () => {
    const inputs = [
      '$abc$1000042,1589557202,615,S64K,1285,0,24,69,11\r',
      '$1000042,1589557202,615,S64K,ack01\r1285,0,24,69,11\r',
      'FV=abcack01\r',
      '!!!$1,2,3\rjunk',
    ]
    for (const input of inputs) {
      expect(parse(input).map((s) => s.raw).join('')).toBe(input)
    }
  })
})

describe('degenerate input never throws', () => {
  test.each([
    [''],
    ['\r'],
    ['\r\n\r\n'],
    ['   '],
    ['$'],
    ['SN='],
    ['='],
    [','],
    ['\x00\x01\x02'],
    ['$$$$'],
    ['ack01\rack01\rack01\r'],
  ])('%j', (input) => {
    const parser = new TBLiveParser()
    expect(() => parser.parseData(input)).not.toThrow()
    for (const sentence of parser.parseData()) {
      expect(CMASchema.is(sentence)).toBe(true)
    }
  })

  test('a long burst of noise is one report, and the buffer is left clean', () => {
    const parser = new TBLiveParser()
    const sentences = parser.parseData('%'.repeat(2000))
    expect(sentences).toHaveLength(1)
    expect(sentences[0].errors).toEqual(['Unrecognised input'])
    expect(parser.buffer).toBe('')
  })
})
