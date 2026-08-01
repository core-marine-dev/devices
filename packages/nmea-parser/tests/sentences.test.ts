// installed
import {
  Float32Schema,
  Float64Schema,
  Int16Schema,
  Int32Schema,
  Int64Schema,
  Int8Schema,
  Uint16Schema,
  Uint32Schema,
  Uint64Schema,
  Uint8Schema,
} from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { DELIMITER, END_FLAG, SEPARATOR, START_FLAG, TALKERS, TALKERS_SPECIAL } from '../src/constants'
import { NMEALikeSchema, StoredSentenceSchema } from '../src/schemas'
import { createFakeSentence, createPayload, createValue, garbageSentence, getIdPayloadAndChecksum, getTalker, hasSameNumberOfFields, lastUncompletedSentence, newestDefinition, parseSentence, parseValue, scanBuffer } from '../src/sentences'
import { GARBAGE_ERROR, INVALID_END_FLAG_ERROR, INVALID_ID_ERROR, MISSING_END_FLAG_ERROR, MISSING_SEPARATOR_ERROR, NO_DELIMITER_ERROR, bufferLimitError } from '../src/sentences'
import { MapStoredSentences, ProtocolFieldType, StoredSentence, Talker } from '../src/types'

const TEST_STORED_SENTENCE: StoredSentence = {
  id: 'TEST',
  protocol: { name: 'TESTING PROTOCOL', standard: false, version: '1.2.3' },
  payload: [
    { name: 'latitude', type: 'float64', units: 'deg' },
    { name: 'longitude', type: 'float32', units: 'deg' },
    { name: '2', type: 'int8' },
    { name: '3', type: 'int16' },
    { name: '4', type: 'int32' },
    { name: '5', type: 'int64' },
    { name: '6', type: 'uint8' },
    { name: '7', type: 'uint16' },
    { name: '8', type: 'uint32' },
    { name: '9', type: 'uint64' },
    { name: '10', type: 'boolean' },
    { name: '11', type: 'string' },
  ],
  description: 'This is just an invented sentence for testing',
}

const HDT: StoredSentence = {
  id: 'HDT',
  protocol: { name: 'NMEA', standard: true, version: '4.11' },
  description: 'Heading - True',
  payload: [
    { name: 'heading', type: 'float32', description: 'Heading, degrees True' },
    { name: 'true', type: 'string', description: 'T = True' },
  ],
}
const HDT_DEFINITIONS: MapStoredSentences = new Map([['HDT', [HDT]]])

describe('lastUncompletedSentence', () => {
  test('returns the trailing incomplete sentence', () => {
    expect(lastUncompletedSentence('garbage$HDT,123.4,T')).toBe('$HDT,123.4,T')
  })

  test('null when the last sentence is complete', () => {
    expect(lastUncompletedSentence('$HDT,123.4,T*25\r\n')).toBeNull()
  })

  test('null when there is no start flag', () => {
    expect(lastUncompletedSentence('no start flag here')).toBeNull()
  })
})

// The scanner must account for EVERY character of the buffer: nothing is
// dropped silently — bad input surfaces as a sentence carrying `errors` or as a
// garbage sentence. See docs/CMA.md §"Failed and garbage sentences".
describe('scanBuffer', () => {
  const sample1 = '$TEST,a,b,c*5A\r\n'
  const sample2 = '$TEST,-1,3,4,T*59\r\n'
  const LIMIT = 1024
  const scan = (text: string): ReturnType<typeof scanBuffer> => scanBuffer(text, LIMIT)

  test('Happy path — two clean sentences, no errors, nothing pending', () => {
    const { chunks, remainder } = scan(`${sample1}${sample2}`)
    expect(chunks).toEqual([
      { raw: sample1, garbage: false, errors: [] },
      { raw: sample2, garbage: false, errors: [] },
    ])
    expect(remainder).toBe('')
  })

  test('every character is accounted for — the concatenation of all chunks plus the remainder IS the buffer', () => {
    const text = `noise${sample1}\r\n**junk${sample2}$TEST,pend`
    const { chunks, remainder } = scan(text)
    expect(chunks.map((chunk) => chunk.raw).join('') + remainder).toBe(text)
  })

  test('garbage BETWEEN sentences is reported, sentences still parse', () => {
    const { chunks } = scan(`${sample1}hello world${sample2}`)
    expect(chunks).toEqual([
      { raw: sample1, garbage: false, errors: [] },
      { raw: 'hello world', garbage: true, errors: [GARBAGE_ERROR] },
      { raw: sample2, garbage: false, errors: [] },
    ])
  })

  test('pure garbage is emitted immediately (no "$" can never become a sentence)', () => {
    const { chunks, remainder } = scan('hello world\r\n')
    expect(chunks).toEqual([{ raw: 'hello world\r\n', garbage: true, errors: [GARBAGE_ERROR] }])
    expect(remainder).toBe('')
  })

  test('adjacent junk is COALESCED into a single garbage chunk (no flood)', () => {
    const { chunks } = scan(`$$as;dfj;aklsfj${sample1}`)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toEqual({ raw: '$$as;dfj;aklsfj', garbage: true, errors: [NO_DELIMITER_ERROR] })
    expect(chunks[1].garbage).toBe(false)
  })

  test('blank space between sentences is ignored, NOT reported as garbage', () => {
    const { chunks } = scan(`${sample1}\r\n \t\r\n${sample2}`)
    expect(chunks.every((chunk) => !chunk.garbage)).toBe(true)
    expect(chunks).toHaveLength(2)
  })

  // cru's case: two sentences in a row where the first lost its terminator.
  test('missing \\r\\n between two sentences — BOTH are emitted, the first flagged', () => {
    const { chunks } = scan(`$TEST,a,b,c*5A${sample2}`)
    expect(chunks).toEqual([
      { raw: '$TEST,a,b,c*5A', garbage: false, errors: [MISSING_END_FLAG_ERROR] },
      { raw: sample2, garbage: false, errors: [] },
    ])
  })

  test('a lone \\n is a MALFORMED terminator, not a missing one', () => {
    const { chunks } = scan('$TEST,a,b,c*5A\n')
    expect(chunks).toEqual([{ raw: '$TEST,a,b,c*5A\n', garbage: false, errors: [INVALID_END_FLAG_ERROR] }])
  })

  test('an unterminated tail is PENDING — never an error (it is still streaming)', () => {
    const { chunks, remainder } = scan(`${sample1}$TEST,a,b`)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].errors).toEqual([])
    expect(remainder).toBe('$TEST,a,b')
  })

  test('a "$" chunk with NO "*" is garbage — the sentence length is unknowable', () => {
    const { chunks } = scan('$HEHDT,123.4,T\r\n')
    expect(chunks).toEqual([{ raw: '$HEHDT,123.4,T\r\n', garbage: true, errors: [NO_DELIMITER_ERROR] }])
  })

  test('a malformed 1-character checksum is still a SENTENCE (no framing error)', () => {
    const { chunks } = scan('$TEST,a,b,c*5\r\n')
    expect(chunks).toEqual([{ raw: '$TEST,a,b,c*5\r\n', garbage: false, errors: [] }])
  })

  // A comma-less sentence (some proprietary commands look like this). The `*`
  // bounds it, so the extent IS known — it is reported, not treated as garbage.
  test('no field separator — a sentence with no fields, flagged', () => {
    const { chunks } = scan('$PSTOP*48\r\n')
    expect(chunks).toEqual([{ raw: '$PSTOP*48\r\n', garbage: false, errors: [] }])
    const cma = parseSentence('$PSTOP*48\r\n', HDT_DEFINITIONS)
    expect(cma.id).toBe('PSTOP')
    expect(cma.payload).toEqual([])
    expect(cma.errors).toEqual([MISSING_SEPARATOR_ERROR])
  })

  test('an unusable id is garbage', () => {
    const { chunks } = scan('$*de\r\n')
    expect(chunks).toEqual([{ raw: '$*de\r\n', garbage: true, errors: [INVALID_ID_ERROR] }])
  })

  test('a bad checksum VALUE is a sentence — the error is added when the body is parsed', () => {
    const badChecksum = sample1.replace('5A', '5B')
    expect(scan(badChecksum)).toEqual({ chunks: [{ raw: badChecksum, garbage: false, errors: [] }], remainder: '' })
  })

  // Q4: binary protocols routinely contain "$" bytes, so an unterminated chunk
  // could otherwise grow forever and the wrong-device case would stay silent.
  test('buffer limit exceeded — the unterminated input is flushed as garbage', () => {
    const long = `$${'A'.repeat(40)}`
    const { chunks, remainder } = scanBuffer(long, 10)
    expect(chunks).toEqual([{ raw: long, garbage: true, errors: [bufferLimitError(10)] }])
    expect(remainder).toBe('')
  })

  test('under the limit the same input is still pending', () => {
    const short = '$ABCDE'
    expect(scanBuffer(short, 10)).toEqual({ chunks: [], remainder: short })
  })
})

describe('garbageSentence', () => {
  test('is a valid CMA with every mandatory value UNKNOWN and an empty payload', () => {
    const garbage = garbageSentence('binary junk', [GARBAGE_ERROR])
    expect(garbage.raw).toBe('binary junk')
    expect(garbage.id).toBe('unknown')
    expect(garbage.protocol).toEqual({ name: 'unknown', version: 'unknown' })
    expect(garbage.payload).toEqual([])
    expect(garbage.metadata).toEqual({ checksum: 'unknown', standard: false })
    expect(garbage.errors).toEqual([GARBAGE_ERROR])
    expect(typeof garbage.timestamp).toBe('number')
  })
})

test('getIdPayloadAndChecksum', () => {
  const id = 'TEST'
  const payload = '1,2.3,a,,'
  const checksum = 'ad'
  const sentence = `${START_FLAG}${id},${payload}${DELIMITER}${checksum}${END_FLAG}` as never
  expect(getIdPayloadAndChecksum(sentence)).toEqual({ id, payload, checksum })
})

test('hasSameNumberOfFields', () => {
  expect(hasSameNumberOfFields('1,2', HDT)).toBeTruthy()
  expect(hasSameNumberOfFields('1,2,3', HDT)).toBeFalsy()
})

describe('parseValue', () => {
  test('string', () => {
    expect(parseValue('', 'string')).toBeNull()
    expect(parseValue('8', 'string')).toBe('8')
  })

  test('boolean', () => {
    ([['', null], ['false', false], ['0', false], ['True', true], ['1', true]] as const)
      .forEach(([input, expected]) => expect(parseValue(input, 'boolean')).toBe(expected));
    (['falsee', '00', 'Trrue', '1.2'])
      .forEach((input) => expect(parseValue(input, 'boolean')).toBeNull())
  })

  test('unsigned integers', () => {
    ['-1', '1.2', '1a', Math.pow(2, 8).toString()].forEach((num) => expect(parseValue(num, 'uint8')).toBeNull())
    expect(parseValue('', 'uint8')).toBeNull()
    expect(parseValue('1', 'uint8')).toBe(1)
    expect(parseValue((Math.pow(2, 16) - 1).toString(), 'uint16')).toBe(65535)
    expect(parseValue((Math.pow(2, 32) - 1).toString(), 'uint32')).toBe(4294967295)
  })

  test('signed integers', () => {
    ['1.2', '1a', Math.pow(2, 8).toString()].forEach((num) => expect(parseValue(num, 'int8')).toBeNull())
    expect(parseValue('1', 'int8')).toBe(1)
    expect(parseValue('-128', 'int8')).toBe(-128)
    expect(parseValue((Math.pow(2, 15) - 1).toString(), 'int16')).toBe(32767)
    expect(parseValue((Math.pow(2, 31) - 1).toString(), 'int32')).toBe(2147483647)
  })

  test('floats', () => {
    expect(parseValue('1a', 'float32')).toBeNull()
    expect(parseValue('', 'float64')).toBeNull()
    expect(parseValue('1.2', 'float32')).toBeCloseTo(1.2)
    expect(parseValue('1.2', 'float64')).toBeCloseTo(1.2)
  })

  test('64-bit integers ride as decimal strings', () => {
    expect(parseValue('', 'int64')).toBeNull()
    expect(parseValue('1.2', 'uint64')).toBeNull()
    expect(parseValue('-1', 'uint64')).toBeNull()
    expect(parseValue('4294967296', 'uint64')).toBe('4294967296')
    expect(parseValue('-42', 'int64')).toBe('-42')
  })

  test('null for values that do not match their type', () => {
    ['integer', 'double'].forEach((type) => expect(parseValue('a', type as ProtocolFieldType)).toBeNull())
  })
})

describe('parseSentence', () => {
  test('known sentence -> upgraded CMA', () => {
    const result = parseSentence('$HDT,123.456,T*25\r\n' as never, HDT_DEFINITIONS)
    expect(result.id).toBe('HDT')
    expect(result.protocol).toEqual({ name: 'NMEA', version: '4.11' })
    expect(result.metadata?.standard).toBe(true)
    expect(result.metadata?.checksum).toBe('25')
    expect(result.description).toBe('Heading - True')
    expect(result.errors).toBeUndefined()
    expect(result.payload).toEqual([
      { raw: '123.456', name: 'heading', type: 'float32', value: 123.456, description: 'Heading, degrees True' },
      { raw: 'T', name: 'true', type: 'string', value: 'T', description: 'T = True' },
    ])
  })

  test('unknown sentence -> generic CMA (all string fields, empty is null)', () => {
    const result = parseSentence('$TEST,1,,2,T*89\r\n' as never, new Map())
    expect(result.id).toBe('TEST')
    expect(result.protocol).toEqual({ name: 'NMEA', version: 'unknown' })
    expect(result.metadata?.standard).toBe(false)
    expect(result.payload).toEqual([
      { raw: '1', name: 'unknown', type: 'string', value: '1' },
      { raw: '', name: 'unknown', type: 'string', value: null },
      { raw: '2', name: 'unknown', type: 'string', value: '2' },
      { raw: 'T', name: 'unknown', type: 'string', value: 'T' },
    ])
  })

  test('talker rides in metadata, id is the base id', () => {
    const result = parseSentence('$GPHDT,123.456,T*35\r\n' as never, HDT_DEFINITIONS)
    expect(result.id).toBe('HDT')
    expect((result.metadata?.talker as Talker).value).toBe('GP')
  })

  test('bad checksum is emitted WITH an error (never dropped)', () => {
    const result = parseSentence('$TEST,a,b,c*5B\r\n' as never, new Map())
    expect(result.errors).toBeDefined()
    expect(result.errors?.[0]).toMatch(/checksum/i)
  })
})

describe('getTalker', () => {
  test('Regular Talker', () => {
    const talker = TALKERS.filter((entry) => entry[0] === 'GP')[0]
    expect(getTalker('GPHDT')).toEqual({ value: 'GP', description: talker[1] })
  })

  test('Proprietary Talker', () => {
    expect(getTalker('PNORSUB8')).toEqual({ value: 'PNORSUB8', description: TALKERS_SPECIAL.P })
  })

  test('User Configured', () => {
    expect(getTalker('U8TEST')).toEqual({ value: 'U8', description: TALKERS_SPECIAL.U })
    expect(getTalker('UXTEST')).toBeNull()
  })

  test('Unknown talker', () => {
    ['UXTEXT', 'pNorsub', 'GGGA'].forEach((id) => expect(getTalker(id)).toBeNull())
  })
})

test('newestDefinition picks the highest version', () => {
  const older: StoredSentence = { id: 'X', protocol: { name: 'A', standard: false, version: '1.0' }, payload: [] }
  const newer: StoredSentence = { id: 'X', protocol: { name: 'A', standard: false, version: '2.0' }, payload: [] }
  expect(newestDefinition([older, newer])).toBe(newer)
  expect(newestDefinition([newer, older])).toBe(newer)
})

describe('createValue', () => {
  test('boolean', () => {
    expect(typeof createValue('boolean')).toBe('boolean')
  })

  test('string', () => {
    expect(typeof createValue('string')).toBe('string')
  })

  test('unsigned integers', () => {
    expect(Uint8Schema.is(createValue('uint8'))).toBeTruthy()
    expect(Uint16Schema.is(createValue('uint16'))).toBeTruthy()
    expect(Uint32Schema.is(createValue('uint32'))).toBeTruthy()
    expect(Uint64Schema.is(createValue('uint64'))).toBeTruthy()
  })

  test('signed integers', () => {
    expect(Int8Schema.is(createValue('int8'))).toBeTruthy()
    expect(Int16Schema.is(createValue('int16'))).toBeTruthy()
    expect(Int32Schema.is(createValue('int32'))).toBeTruthy()
    expect(Int64Schema.is(createValue('int64'))).toBeTruthy()
  })

  test('floats', () => {
    expect(Float32Schema.is(createValue('float32'))).toBeTruthy()
    expect(Float64Schema.is(createValue('float64'))).toBeTruthy()
  })
})

test('createPayload / createFakeSentence round-trip', () => {
  expect(StoredSentenceSchema.parse(TEST_STORED_SENTENCE)).toEqual(TEST_STORED_SENTENCE)
  const payload = createPayload(TEST_STORED_SENTENCE)
  expect(payload.split(SEPARATOR)).toHaveLength(TEST_STORED_SENTENCE.payload.length)
  const fake = createFakeSentence(TEST_STORED_SENTENCE)
  expect(NMEALikeSchema.is(fake)).toBeTruthy()
})
