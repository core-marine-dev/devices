// installed
import { CMASchema, UNKNOWN } from '@coremarine/protocol-core'
import type { CMA, Field, Metadata } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { FIRMWARES, PROTOCOL_NAME, SENTENCE_IDS, TBLiveParser } from '../src/index'

// Real sentences from the datasheets, so the suite is anchored to the documents
// rather than to whatever the implementation happens to do.
// `receiver-1.0.1.pdf` §8.2.1/§8.2.2, `receiver-1.0.2.pdf` p.2/p.3.
const DETECTION_101 = '$1000042,1589557202,615,S64K,1285,0,24,69,11\r'
const LOG_101 = '$1000042,1589557600,TBR Sensor,297,15,29,69,6\r'
const DETECTION_102 = '$001129,1551087409,421,OPs,15,2,37,69\r'
const LOG_102 = '$001129,1551087600,Live Sensor,280,7,14,69\r'
// `receiver-1.0.1.pdf` p.10 — an ID-only protocol, so the data field is EMPTY.
const DETECTION_NO_DATA = '$1000042,0000002185,897,R64K,1023,,24,69,9\r'

const parse = (input: string, options = {}): CMA[] => new TBLiveParser(options).parseData(input)

const one = (input: string, options = {}): CMA => {
  const sentences = parse(input, options)
  expect(sentences).toHaveLength(1)
  return sentences[0]
}

const names = (sentence: CMA): string[] => sentence.payload.map((field) => field.name)
const values = (sentence: CMA): unknown[] => sentence.payload.map((field) => field.value)
const field = (sentence: CMA, name: string): Field | undefined => sentence.payload.find((f) => f.name === name)
const payloadMetadata = (sentence: CMA): Metadata => (sentence.metadata.payload ?? {}) as Metadata

describe('CMA conformance', () => {
  const EVERYTHING = [
    DETECTION_101, LOG_101, DETECTION_102, LOG_102, DETECTION_NO_DATA,
    'SN=000745><>\r', 'ack01\r', 'ack02\r', 'LIVECM', 'TBRC',
    'SN=1000045', 'FV=1.0.2', 'FC=69', 'LM=01', 'LI=03', 'UT=1589561768',
    'EX!', 'RR!', 'FS!', 'UF!',
    'garbage bytes', '$1,2,3\r',
  ].join('')

  test('every emitted sentence satisfies the shared CMA schema', () => {
    const sentences = parse(EVERYTHING)
    expect(sentences.length).toBeGreaterThan(20)
    for (const sentence of sentences) {
      expect(CMASchema.is(sentence), `not a CMA: ${JSON.stringify(sentence)}`).toBe(true)
    }
  })

  test('metadata always carries the timestamp block and the mode', () => {
    for (const sentence of parse(EVERYTHING)) {
      expect(sentence.metadata.timestamp).toBeDefined()
      expect(sentence.metadata.mode).toBeDefined()
    }
  })

  test('no top-level mode or firmware key survives from the 1.x shape', () => {
    const sentence = one(DETECTION_101)
    expect(sentence).not.toHaveProperty('mode')
    expect(sentence).not.toHaveProperty('firmware')
  })

  test('every id it can emit is a declared id', () => {
    const declared = new Set<string>([...SENTENCE_IDS, UNKNOWN])
    for (const sentence of parse(EVERYTHING)) {
      expect(declared.has(sentence.id)).toBe(true)
    }
  })
})

describe('detections', () => {
  test('1.0.1 — nine fields', () => {
    const sentence = one(DETECTION_101)
    expect(sentence.id).toBe('emitter')
    expect(sentence.protocol).toEqual({ name: PROTOCOL_NAME, version: '1.0.1' })
    expect(sentence.metadata.mode).toBe('listening')
    expect(names(sentence)).toEqual([
      'receiver_serial_number', 'seconds', 'milliseconds', 'transmit_protocol',
      'emitter', 'data', 'snr', 'frequency', 'sent',
    ])
    expect(values(sentence)).toEqual(['1000042', 1589557202, 615, 'S64K', '1285', 0, 24, 69, 11])
    expect(sentence.errors).toBeUndefined()
  })

  test('1.0.2 — eight fields, no `sent`', () => {
    const sentence = one(DETECTION_102)
    expect(sentence.id).toBe('emitter')
    expect(sentence.protocol.version).toBe('1.0.2')
    expect(names(sentence)).not.toContain('sent')
    expect(values(sentence)).toEqual(['001129', 1551087409, 421, 'OPs', '15', 2, 37, 69])
  })

  test('serial numbers are strings, so inconsistent padding survives', () => {
    // The firmware pads unpredictably; Number() would collapse '001129' to 1129
    // and lose the evidence needed to recognise the device.
    expect(field(one(DETECTION_102), 'receiver_serial_number')?.value).toBe('001129')
    expect(field(one(DETECTION_101), 'receiver_serial_number')?.value).toBe('1000042')
    expect(field(one(DETECTION_101), 'emitter')?.value).toBe('1285')
  })

  test('an empty data field is null with NO error, never a zero', () => {
    // The regression that matters most: ID-only protocols carry no data, and
    // reporting 0 made a missing measurement look like a perfectly vertical line.
    const sentence = one(DETECTION_NO_DATA)
    expect(sentence.id).toBe('emitter')
    expect(field(sentence, 'data')?.value).toBeNull()
    expect(field(sentence, 'data')?.errors).toBeUndefined()
    expect(sentence.errors).toBeUndefined()
    expect(field(sentence, 'data')?.metadata).toBeUndefined()
  })

  test.each([
    [3, 'weak'],
    [6, 'weak'],
    [24, 'regular'],
    [25, 'regular'],
    [37, 'strong'],
  ])('snr %i is %s', (snr, signal) => {
    const sentence = one(`$1000042,1589557202,615,S64K,1285,0,${snr},69,11\r`)
    expect(field(sentence, 'snr')?.metadata).toEqual({ raw: snr, signal })
    expect(payloadMetadata(sentence).snr).toEqual({ raw: snr, signal })
  })

  test('payload metadata mirrors the identity facts', () => {
    expect(payloadMetadata(one(DETECTION_101))).toMatchObject({ receiver: '1000042', emitter: '1285' })
  })
})

describe('logs', () => {
  test('1.0.1 — eight fields', () => {
    const sentence = one(LOG_101)
    expect(sentence.id).toBe('receiver')
    expect(sentence.protocol.version).toBe('1.0.1')
    expect(names(sentence)).toEqual([
      'receiver_serial_number', 'seconds', 'log', 'temperature',
      'noise_average', 'noise_peak', 'frequency', 'sent',
    ])
    expect(values(sentence)).toEqual(['1000042', 1589557600, 'TBR Sensor', 297, 15, 29, 69, 6])
  })

  test('1.0.2 — seven fields', () => {
    const sentence = one(LOG_102)
    expect(sentence.id).toBe('receiver')
    expect(sentence.protocol.version).toBe('1.0.2')
    expect(values(sentence)).toEqual(['001129', 1551087600, 'Live Sensor', 280, 7, 14, 69])
  })

  test('temperature decodes to celsius at field and payload level', () => {
    const sentence = one(LOG_101)
    expect(field(sentence, 'temperature')?.metadata).toEqual({ raw: 297, celsius: 24.7 })
    expect(payloadMetadata(sentence).temperature).toEqual({ raw: 297, celsius: 24.7 })
  })

  test('noise is aggregated from its two fields', () => {
    expect(payloadMetadata(one(LOG_101)).noise).toEqual({ average: 15, peak: 29 })
  })
})

describe('the eight-field ambiguity', () => {
  // A 1.0.1 log and a 1.0.2 detection both have eight fields, so the log
  // identifier breaks the tie — case-insensitively, because the datasheets spell
  // it "TBR Sensor" in one firmware and "Live Sensor" in the other.
  test.each([
    ['TBR Sensor', 'receiver'],
    ['Live Sensor', 'receiver'],
    ['tbr sensor', 'receiver'],
    ['LIVE SENSOR', 'receiver'],
    ['S64K', 'emitter'],
  ])('field 2 %s resolves to %s', (identifier, id) => {
    expect(one(`$1000042,1589557600,${identifier},297,15,29,69,6\r`).id).toBe(id)
  })

  test('a "Live Sensor" log is not misread as a detection', () => {
    // It used to be, shifting every field: temperature 297 became the transmit
    // protocol and peak noise 29 became an inclination of 2.9 degrees.
    const sentence = one('$1000042,1589557600,Live Sensor,297,15,29,69,6\r')
    expect(sentence.id).toBe('receiver')
    expect(field(sentence, 'temperature')?.value).toBe(297)
    expect(field(sentence, 'noise_peak')?.value).toBe(29)
    expect(field(sentence, 'transmit_protocol')).toBeUndefined()
  })
})

describe('the `data` field stays opaque', () => {
  test('it is never interpreted, at any level', () => {
    // Those 16 bits carry a CoreMarine encoding, not anything the TB Live
    // protocol defines, so decoding them belongs to the consumer.
    const sentence = one('$1000042,1589557202,615,HS256,1285,4626,24,69,11\r')
    const data = field(sentence, 'data')
    expect(data?.value).toBe(4626)
    expect(data?.type).toBe('uint16')
    expect(data?.metadata).toBeUndefined()
    expect(payloadMetadata(sentence)).not.toHaveProperty('data')
    expect(payloadMetadata(sentence)).not.toHaveProperty('angle')
  })
})

describe('device time is data, never a claim', () => {
  test('metadata.timestamp carries received and parsed but NEVER sentence', () => {
    for (const sentence of parse([DETECTION_101, LOG_101, DETECTION_NO_DATA].join(''))) {
      const timestamp = sentence.metadata.timestamp as Record<string, unknown>
      expect(timestamp.received).toBeTypeOf('number')
      expect(timestamp.parsed).toBeTypeOf('number')
      expect(timestamp).not.toHaveProperty('sentence')
    }
  })

  test('a detection composes seconds and milliseconds arithmetically', () => {
    // The old parser CONCATENATED the digits, so an unpadded `,50,` produced 1974.
    const sentence = one('$1000042,1589557202,50,S64K,1285,0,24,69,11\r')
    expect(payloadMetadata(sentence).time).toEqual({
      seconds: 1589557202,
      milliseconds: 50,
      total_milliseconds: 1589557202050,
    })
  })

  test('an absent millisecond field composes as 000, visibly', () => {
    const sentence = one('$1000042,1589557202,,S64K,1285,0,24,69,11\r')
    expect(field(sentence, 'milliseconds')?.value).toBeNull()
    expect(payloadMetadata(sentence).time).toEqual({
      seconds: 1589557202,
      milliseconds: 0,
      total_milliseconds: 1589557202000,
    })
  })

  test('an uptime clock is reported as a number, not as 1970', () => {
    const time = payloadMetadata(one(DETECTION_NO_DATA)).time as Record<string, unknown>
    expect(time.seconds).toBe(2185)
    expect(time.total_milliseconds).toBe(2185897)
    expect(JSON.stringify(time)).not.toContain('1970')
  })

  test('no ISO date is emitted anywhere', () => {
    const sentences = parse([DETECTION_101, LOG_101, 'UT=0000000600'].join(''))
    expect(JSON.stringify(sentences)).not.toContain('1970-01-01')
  })

  test('a log has no millisecond field, so none is invented', () => {
    expect(payloadMetadata(one(LOG_101)).time).toEqual({ seconds: 1589557600, total_milliseconds: 1589557600000 })
  })
})

describe('listening-mode commands', () => {
  test('ping wins over a serial-number response at the same offset', () => {
    const sentence = one('SN=000745><>\r')
    expect(sentence.id).toBe('ping')
    expect(sentence.metadata.mode).toBe('listening')
    expect(field(sentence, 'receiver_serial_number')?.value).toBe('000745')
    expect(payloadMetadata(sentence).receiver).toBe('000745')
  })

  test.each([
    ['ack01\r', 'clock_round'],
    ['ack02\r', 'clock_set'],
  ])('%s is %s', (input, id) => {
    const sentence = one(input)
    expect(sentence.id).toBe(id)
    expect(sentence.metadata.mode).toBe('listening')
    expect(sentence.payload).toHaveLength(1)
  })
})

describe('command-mode responses', () => {
  test.each([
    ['SN=1000045', 'serial_number', '1000045'],
    ['FV=1.0.2', 'firmware', '1.0.2'],
    ['FC=69', 'frequency', 69],
    ['LM=01', 'listening_mode', '01'],
    ['LI=03', 'log_interval', '03'],
    ['UT=1589561768', 'time', 1589561768],
    ['EX!', 'listening', 'EX!'],
    ['RR!', 'restart', 'RR!'],
    ['FS!', 'reset', 'FS!'],
    ['UF!', 'upgrade', 'UF!'],
  ])('%s is %s with a single payload element', (input, id, value) => {
    const sentence = one(input)
    expect(sentence.id).toBe(id)
    expect(sentence.payload).toHaveLength(1)
    expect(sentence.payload[0].value).toBe(value)
  })

  test('frequency carries its unit and its documented range as description', () => {
    const sentence = one('FC=69')
    expect(sentence.payload[0].units).toBe('kHz')
    expect(sentence.payload[0].description).toContain('63-77')
  })

  test('an out-of-range frequency is emitted, not rejected', () => {
    // Deliberate: the parser reports structural and type problems only. Whether a
    // frequency is valid for a given receiver is deployment knowledge.
    const sentence = one('FC=99')
    expect(sentence.payload[0].value).toBe(99)
    expect(sentence.errors).toBeUndefined()
  })

  test('listening_mode decodes the protocol set', () => {
    const sentence = one('LM=01')
    expect(payloadMetadata(sentence)).toEqual({
      channel: 'single',
      id: ['R64K', 'R01M'],
      data: ['S256', 'S64K'],
    })
  })

  test('log_interval decodes its label', () => {
    expect(payloadMetadata(one('LI=03'))).toEqual({ interval: '30 minutes' })
  })

  test('an unknown listening_mode value yields no metadata rather than a guess', () => {
    const sentence = one('LM=99')
    expect(sentence.payload[0].value).toBe('99')
    expect(sentence.metadata.payload).toBeUndefined()
  })

  test('the help dump is one sentence, not the API shredded into many', () => {
    const help = 'In Command Mode\nFC=69\nLM=01\nEX!\nRR!\nTBRC\nL is Luhn\'s verification number.'
    const sentence = one(help)
    expect(sentence.id).toBe('api')
    expect(sentence.raw).toBe(help)
  })
})

describe('mode is the API a sentence belongs to, not the state it leaves behind', () => {
  // Deliberately contradictory-looking, and correct: `id` says what the sentence
  // enables, `mode` says which API it came from.
  test.each([
    ['LIVECM', 'command', 'listening'],
    ['TBRC', 'command', 'listening'],
    ['EX!', 'listening', 'command'],
    ['UF!', 'upgrade', 'update'],
  ])('%s has id %s and mode %s', (input, id, mode) => {
    const sentence = one(input)
    expect(sentence.id).toBe(id)
    expect(sentence.metadata.mode).toBe(mode)
  })
})

describe('firmware is learned, never guessed', () => {
  test('it starts unknown', () => {
    const parser = new TBLiveParser()
    expect(parser.firmware).toBe(UNKNOWN)
    expect(one('FC=69').protocol.version).toBe(UNKNOWN)
  })

  test.each([
    ['LIVECM', '1.0.1'],
    ['TBRC', '1.0.2'],
  ])('%s proves firmware %s', (input, firmware) => {
    const parser = new TBLiveParser()
    parser.parseData(input)
    expect(parser.firmware).toBe(firmware)
  })

  test.each([
    ['FV=1.0.1', '1.0.1'],
    ['FV=1.0.2', '1.0.2'],
    ['FV=v1.0.1', '1.0.1'],
  ])('%s states firmware %s', (input, firmware) => {
    const parser = new TBLiveParser()
    parser.parseData(input)
    expect(parser.firmware).toBe(firmware)
  })

  test('once learned, it is applied to sentences that carry no evidence', () => {
    const parser = new TBLiveParser()
    parser.parseData('TBRC')
    expect(parser.parseData('FC=69')[0].protocol.version).toBe('1.0.2')
  })

  test('it can be pinned in the constructor', () => {
    expect(new TBLiveParser({ firmware: '1.0.1' }).firmware).toBe('1.0.1')
    expect(one('FC=69', { firmware: '1.0.1' }).protocol.version).toBe('1.0.1')
  })

  test('an invalid value is discarded rather than thrown', () => {
    const parser = new TBLiveParser({ firmware: '9.9.9' as never })
    expect(parser.firmware).toBe(UNKNOWN)
    parser.firmware = 'nonsense' as never
    expect(parser.firmware).toBe(UNKNOWN)
  })

  test('a sample states its own firmware regardless of what was learned', () => {
    const parser = new TBLiveParser({ firmware: '1.0.2' })
    expect(parser.parseData(DETECTION_101)[0].protocol.version).toBe('1.0.1')
  })

  test('the supported firmwares are exposed', () => {
    expect(new TBLiveParser().firmwares).toEqual(FIRMWARES)
  })
})

describe('nothing is dropped silently', () => {
  test('unrecognised input becomes a garbage sentence', () => {
    const sentence = one('hello world')
    expect(sentence.id).toBe(UNKNOWN)
    expect(sentence.protocol).toEqual({ name: UNKNOWN, version: UNKNOWN })
    expect(sentence.payload).toEqual([])
    expect(sentence.raw).toBe('hello world')
    expect(sentence.errors).toEqual(['Unrecognised input'])
  })

  test('junk before a good sentence is reported, and the sentence still decodes', () => {
    const sentences = parse(`noise${DETECTION_102}`)
    expect(sentences).toHaveLength(2)
    expect(sentences[0].errors).toEqual(['Unrecognised input'])
    expect(sentences[0].raw).toBe('noise')
    expect(sentences[1].id).toBe('emitter')
  })

  test('adjacent junk is coalesced into one report, not a flood', () => {
    expect(parse('!!!???###')).toHaveLength(1)
  })

  test('whitespace between sentences is ignored', () => {
    const sentences = parse('ack01\r\n  \n ack02\r')
    expect(sentences).toHaveLength(2)
    expect(sentences.every((s) => s.errors === undefined)).toBe(true)
  })

  test('an unrecognised field count keeps the data as generic fields', () => {
    const sentence = one('$1,2,3\r')
    expect(sentence.id).toBe(UNKNOWN)
    expect(sentence.errors).toEqual(['Unknown field count: 3'])
    expect(values(sentence)).toEqual(['1', '2', '3'])
    expect(names(sentence)).toEqual([UNKNOWN, UNKNOWN, UNKNOWN])
  })

  test('a non-numeric value in a numeric field is null plus an error', () => {
    const sentence = one('$1000042,1589557202,615,S64K,1285,0,oops,69,11\r')
    expect(sentence.id).toBe('emitter')
    expect(field(sentence, 'snr')?.value).toBeNull()
    expect(field(sentence, 'snr')?.errors).toEqual(['Invalid snr: oops'])
    expect(sentence.errors).toEqual(['Invalid snr: oops'])
    // The rest of the sentence still decodes — that is the point of reporting.
    expect(field(sentence, 'frequency')?.value).toBe(69)
  })

  test('no NaN ever reaches a value', () => {
    const sentences = parse('$1000042,x,y,S64K,1285,0,z,69,w\r')
    for (const sentence of sentences) {
      for (const f of sentence.payload) {
        expect(Number.isNaN(f.value)).toBe(false)
      }
    }
  })
})

describe('half-duplex interference', () => {
  // The intact inner sentence is kept; the sentence it wrecked is reported as
  // garbage and never recomposed, because real collisions arrive as corrupted
  // bytes and the true boundary is unknowable.
  const WRECKED = '$1000042,1589557202,615,S64K,ack01\r1285,0,24,69,11\r'

  test('the interloper is decoded and the wreckage is reported', () => {
    const sentences = parse(WRECKED)
    expect(sentences).toHaveLength(3)
    expect(sentences[0].id).toBe(UNKNOWN)
    expect(sentences[0].errors).toEqual(['Interrupted by clock_round'])
    expect(sentences[0].raw).toBe('$1000042,1589557202,615,S64K,')
    expect(sentences[1].id).toBe('clock_round')
    expect(sentences[2].id).toBe(UNKNOWN)
    expect(sentences[2].raw).toBe('1285,0,24,69,11\r')
  })

  test('the wrecked sentence is never presented as a decoded detection', () => {
    expect(parse(WRECKED).some((sentence) => sentence.id === 'emitter')).toBe(false)
  })

  test('every character of the input is accounted for', () => {
    expect(parse(WRECKED).map((sentence) => sentence.raw).join('')).toBe(WRECKED)
  })
})

describe('buffering', () => {
  test('an incomplete sentence waits on the buffer without an error', () => {
    const parser = new TBLiveParser()
    expect(parser.parseData('$001129,1551087409,421,OPs')).toEqual([])
    expect(parser.buffer).toBe('$001129,1551087409,421,OPs')
    // ... and completes when the rest arrives.
    const sentences = parser.parseData(',15,2,37,69\r')
    expect(sentences).toHaveLength(1)
    expect(sentences[0].id).toBe('emitter')
    expect(parser.buffer).toBe('')
  })

  test('a partially received token also waits', () => {
    const parser = new TBLiveParser()
    expect(parser.parseData('FC=6')).toEqual([])
    expect(parser.buffer).toBe('FC=6')
    expect(parser.parseData('9')[0].payload[0].value).toBe(69)
  })

  test('bufferLimit is enforced, and the overflow is reported', () => {
    // It was stored, validated and used nowhere, so a `$` with no terminator grew
    // the buffer without bound and stayed silent. Binary junk contains `$` often.
    const parser = new TBLiveParser({ bufferLimit: 10 })
    const sentences = parser.parseData(`$${'x'.repeat(5000)}`)
    expect(sentences).toHaveLength(1)
    expect(sentences[0].errors).toEqual(['Buffer limit exceeded'])
    expect(sentences[0].id).toBe(UNKNOWN)
    expect(parser.buffer).toBe('')
  })

  test('memory false discards the previous buffer', () => {
    const parser = new TBLiveParser({ memory: false })
    parser.addData('$001129,1551087409')
    parser.addData(DETECTION_102)
    const sentences = parser.parseData()
    expect(sentences).toHaveLength(1)
    expect(sentences[0].id).toBe('emitter')
  })

  test('parseData drains, so a sentence is delivered exactly once', () => {
    const parser = new TBLiveParser()
    expect(parser.parseData(DETECTION_101)).toHaveLength(1)
    expect(parser.parseData()).toEqual([])
  })
})

describe('streams', () => {
  test('a realistic listening stream decodes in order', () => {
    const sentences = parse([LOG_101, DETECTION_NO_DATA, DETECTION_101].join(''))
    expect(sentences.map((sentence) => sentence.id)).toEqual(['receiver', 'emitter', 'emitter'])
  })

  test('command echoes with no terminators at all still segment', () => {
    const sentences = parse('FC=69LM=01LI=03UT=1589561768FV=1.0.2EX!RR!FS!UF!')
    expect(sentences.map((sentence) => sentence.id)).toEqual([
      'frequency', 'listening_mode', 'log_interval', 'time', 'firmware',
      'listening', 'restart', 'reset', 'upgrade',
    ])
  })

  test('a sentence split across three writes is assembled', () => {
    const parser = new TBLiveParser()
    expect(parser.parseData('$10000')).toEqual([])
    expect(parser.parseData('42,1589557202,615,S64K,1285')).toEqual([])
    const sentences = parser.parseData(',0,24,69,11\r')
    expect(sentences).toHaveLength(1)
    expect(sentences[0].raw).toBe(DETECTION_101)
  })
})
