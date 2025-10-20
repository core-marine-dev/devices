import { describe, expect, test } from 'vitest'
import { DELIMITER, END_FLAG, SEPARATOR, START_FLAG, TALKERS, TALKERS_SPECIAL } from '../src/constants'
import { Float32Schema, Float64Schema, Int16Schema, Int32Schema, Int64Schema, Int8Schema, NMEALikeSchema, StoredSentenceSchema, StringSchema, Uint16Schema, Uint32Schema, Uint64Schema, Uint8Schema } from '../src/schemas'
import { createFakeSentence, createPayload, createValue, getIdPayloadAndChecksum, getKnownNMEASentence, getTalker, getUnknowNMEASentence, getUnparsedNMEAFrames, hasSameNumberOfFields, parseValue } from '../src/sentences'
import { Checksum, NMEASentence, ProtocolField, ProtocolFieldType, StoredSentence, Talker } from '../src/types'
import { stringChecksumToNumber } from '../src/checksum'

const TEST_STORED_SENTENCE: StoredSentence = {
  id: 'TEST',
  protocol: {
    name: 'TESTING PROTOCOL',
    standard: false,
    version: '1.2.3'
  },
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
    { name: '11', type: 'string' }
  ],
  description: 'This is just an invented sentence for testing'
}

const HDT_SENTENCE: StoredSentence = {
  id: 'HDT',
  protocol: {
    name: 'NMEA',
    standard: false,
    version: '3.1'
  },
  description: 'Heading - True',
  payload: [
    {
      name: 'heading',
      type: 'float32',
      description: 'Heading, degrees True'
    },
    {
      name: 'true',
      type: 'string',
      description: 'T = True'
    }
  ]
}

describe('getUnparsedNMEAFrames', () => {
  const sample1 = '$TEST,a,b,c*5A\r\n'
  const sample2 = '$TEST,-1,3,4,T*59\r\n'

  test('Happy path', () => {
    const sample = `$$as;dfj;aklsfj${sample1}\r\n**aslkjh${sample2}`
    const result = getUnparsedNMEAFrames(sample)
    expect(result).toHaveLength(2)
    expect(result).toEqual([sample1, sample2])
  })

  test('none if not contains "\\r\\n"', () => {
    const sample = sample1.replace(END_FLAG, '')
    const result = getUnparsedNMEAFrames(sample)
    expect(result).toHaveLength(0)
  })

  test('none if not contains minmal length', () => {
    const sample = '$TEST,a,b,c,*de\r\n'
    const result = getUnparsedNMEAFrames(sample)
    expect(result).toHaveLength(0)
  })

  test('none if not contains "$"', () => {
    const sample = sample1.replace(START_FLAG, '')
    const result = getUnparsedNMEAFrames(sample)
    expect(result).toHaveLength(0)
  })

  test('none if not contains "*"', () => {
    const sample = sample1.replace(DELIMITER, '')
    const result = getUnparsedNMEAFrames(sample)
    expect(result).toHaveLength(0)
  })

  test('none if not contains ","', () => {
    const sample = sample1.replace(SEPARATOR, '')
    const result = getUnparsedNMEAFrames(sample)
    expect(result).toHaveLength(0)
  })

  test('none if not contains valid checksum', () => {
    const sample = sample1.replace('5A', '5B')
    const result = getUnparsedNMEAFrames(sample)
    expect(result).toHaveLength(0)
  })

  test('none if info contains invalid characters', () => {
    const sample = sample1.replace('a', '-1\r')
    const result = getUnparsedNMEAFrames(sample)
    expect(result).toHaveLength(0)
  })
})

test('getIdPayloadAndChecksum', () => {
  const id = 'TEST'
  const payload = '1,2.3,a,,'
  const checksum = 'ad'
  const sentence = `${START_FLAG}${id},${payload}${DELIMITER}${checksum}${END_FLAG}`
  expect(getIdPayloadAndChecksum(sentence)).toEqual({ id, payload, checksum })
})

test('hasSameFields', () => {
  const validPayload = '1,2,3,4,5,6,7,8,9,10,11,12'
  expect(hasSameNumberOfFields(validPayload, TEST_STORED_SENTENCE)).toBeTruthy()
  const invalidPayload = '1,2,3,4,5,6,7,8,9,10,11'
  expect(hasSameNumberOfFields(invalidPayload, TEST_STORED_SENTENCE)).toBeFalsy()
})

describe('parseValue', () => {
  test('string', () => {
    expect(parseValue('', 'string')).toBeNull()
    expect(parseValue('8', 'string')).toBe('8')
  })

  test('boolean', () => {
    // Boolean
    [
      ['', null],
      ['false', false],
      ['0', false],
      ['True', true],
      ['1', true]
    ].forEach(([input, expected]) => expect(parseValue(input as string, 'boolean')).toBe(expected));
    // Null
    [
      ['falsee', null],
      ['00', null],
      ['Trrue', null],
      ['1.2', null]
    ].forEach(([input, expected]) => expect(parseValue(input as string, 'boolean')).toBe(expected));
  })

  test('uint8', () => {
    // Bad
    ['-1', '1.2', '1a', Math.pow(2, 8).toString()].forEach(num => expect(parseValue(num, 'uint8')).toBeNull());
    // Good
    expect(parseValue('', 'uint8')).toBeNull();
    ['1', '-0', (Math.pow(2, 8) - 1).toString()].forEach(num => expect(parseValue(num, 'uint8')).toBe(Number(num)))
  })

  test('uint16', () => {
    // Bad
    ['-1', '1.2', '1a', Math.pow(2, 16).toString()].forEach(num => expect(parseValue(num, 'uint16')).toBeNull());
    // Good
    expect(parseValue('', 'uint16')).toBeNull();
    ['1', '-0', (Math.pow(2, 16) - 1).toString()].forEach(num => expect(parseValue(num, 'uint16')).toBe(Number(num)))
  })

  test('uint32', () => {
    // Bad
    ['-1', '1.2', '1a', Math.pow(2, 32).toString()].forEach(num => expect(parseValue(num, 'uint32')).toBeNull());
    // Good
    expect(parseValue('', 'uint32')).toBeNull();
    ['1', '-0', (Math.pow(2, 32) - 1).toString()].forEach(num => expect(parseValue(num, 'uint32')).toBe(Number(num)))
  })

  test('uint64', () => {
    // Bad
    ['-1', '1.2', '1a'].forEach(num => expect(parseValue(num, 'uint64')).toBeNull());
    // Good
    expect(parseValue('', 'uint64')).toBeNull();
    [(Math.pow(2, 32)).toString()].forEach(num => expect(parseValue(num, 'uint64')).toBe(BigInt(num)))
  })

  test('int8', () => {
    // Bad
    ['1.2', '1a', Math.pow(2, 8).toString()].forEach(num => expect(parseValue(num, 'int8')).toBeNull());
    // Good
    expect(parseValue('', 'int8')).toBeNull();
    ['1', '-0', (Math.pow(2, 7) - 1).toString()].forEach(num => expect(parseValue(num, 'int8')).toBe(Number(num)))
  })

  test('int16', () => {
    // Bad
    for (const num of ['1.2', '1a', Math.pow(2, 16).toString(), '']) {
      const received = parseValue(num, 'int16')
      console.log(received)
      expect(received).toBeNull()
    }
    // Good
    for (const num of ['1', '-0', (Math.pow(2, 15) - 1).toString()]) {
      const received = parseValue(num, 'int16')
      const expected = Number(num)
      expect(received).toBe(expected)

    }
  })

  test('int32', () => {
    // Bad
    ['1.2', '1a', Math.pow(2, 32).toString()].forEach(num => expect(parseValue(num, 'int32')).toBeNull());
    // Good
    expect(parseValue('', 'int32')).toBeNull();
    ['1', '-0', (Math.pow(2, 31) - 1).toString()].forEach(num => expect(parseValue(num, 'int32')).toBe(Number(num)))
  })

  test('int64', () => {
    // Bad
    ['1.2', '1a'].forEach(num => expect(parseValue(num, 'int64')).toBeNull());
    // Good
    expect(parseValue('', 'int64')).toBeNull();
    [(Math.pow(2, 32)).toString()].forEach(num => expect(parseValue(num, 'int64')).toBe(BigInt(num)))
  })

  test('float32', () => {
    // Bad
    ['1a'].forEach(num => expect(parseValue(num, 'float32')).toBeNull());
    // Good
    expect(parseValue('', 'float32')).toBeNull();
    ['1.2'].forEach(num => expect(parseValue(num, 'float32')).toBe(Number(num)))
  })

  test('float64', () => {
    // Bad
    ['1a'].forEach(num => expect(parseValue(num, 'float64')).toBeNull());
    // Good
    expect(parseValue('', 'float64')).toBeNull();
    ['1.2'].forEach(num => expect(parseValue(num, 'float64')).toBe(Number(num)))
  })

  test('unknown', () => {
    ['integer', 'float', 'char', 'bool', 'double'].forEach(type => expect(parseValue('a', type as ProtocolFieldType)).toBeNull())
  })
})

describe('getKnownNMEASentence', () => {
  test('Happy path', () => {
    const received = Date.now()
    const sample = '$HDT,123.456,T*25\r\n'
    const sentenceID = 'HDT'
    const sentencePayload = '123.456,T'
    const checksum: Checksum = { sample: '25', value: stringChecksumToNumber('25') }
    const expected: NMEASentence = {
      received,
      sample,
      id: sentenceID,
      checksum,
      protocol: HDT_SENTENCE.protocol,
      payload: [
        { ...HDT_SENTENCE.payload[0], value: 123.456, sample: '123.456', units: 'unknown' },
        { ...HDT_SENTENCE.payload[1], value: 'T' , sample: 'T', units: 'unknown' }
      ]
    }
    const result = getKnownNMEASentence({ received, sample, sentenceID, sentencePayload, checksum, model: HDT_SENTENCE })
    expect(result).toEqual(expected)
  })
})

describe('getTalker', () => {
  test('Regular Talker', () => {
    const sentenceID = 'GPHDT'
    const talker = TALKERS.filter(talker => talker[0] === 'GP')[0]
    const expected: Talker = { value: 'GP', description: talker[1] }
    const result = getTalker(sentenceID)
    expect(result).toEqual(expected)
  })

  test('Propietary Talker', () => {
    const sentenceID = 'PNORSUB8'
    const expected: Talker = { value: sentenceID, description: TALKERS_SPECIAL.P }
    const result = getTalker(sentenceID)
    expect(result).toEqual(expected)
  })

  test('User Configured', () => {
    // Good
    const sentenceID = 'U8TEST'
    const expected: Talker = { value: 'U8', description: TALKERS_SPECIAL.U }
    const result = getTalker(sentenceID)
    expect(result).toEqual(expected)
    // Bad
    expect(getTalker('UXTEST')).toBeNull()
  })

  test('Unknown talker', () => {
    ['UXTEXT', 'pNorsub', 'GGGA'].forEach(id => expect(getTalker(id)).toBeNull())
  })
})

test('getUnknownSentence', () => {
  const received = Date.now()
  const sample = '$TEST,1,,2,T*89\r\n'
  const sentenceID = 'TEST'
  const sentencePayload = '1,,2,T'
  const checksum: Checksum = { sample: '89', value: 137 }
  const expected: NMEASentence = {
    received, sample, id: sentenceID, checksum,
    payload: [
      { name: 'unknown', sample: '1', value: '1', type: 'string', units: 'unknown' },
      { name: 'unknown', sample: '', value: null, type: 'string', units: 'unknown' },
      { name: 'unknown', sample: '2', value: '2', type: 'string', units: 'unknown' },
      { name: 'unknown', sample: 'T', value: 'T', type: 'string', units: 'unknown' },
    ],
    description: 'unknown nmea sentence',
    protocol: { name: 'unknown', standard: false }
  }
  const result = getUnknowNMEASentence({ received, sample, sentenceID, sentencePayload, checksum })
  expect(result).toEqual(expected)
})

describe('createValue', () => {
  test('boolean', () => {
    const value = createValue('boolean')
    expect(typeof value === 'boolean').toBeTruthy()
  })

  test('string', () => {
    const value = createValue('string')
    expect(typeof value === 'string').toBeTruthy()
  })

  test('unsigned integers', () => {
    // Uint8
    let value = createValue('uint8')
    let expected = Uint8Schema.parse(value)
    expect(value).toBe(expected)
    // Uint16
    value = createValue('uint16')
    expected = Uint16Schema.parse(value)
    expect(value).toBe(expected)
    // Uint32
    value = createValue('uint32')
    expected = Uint32Schema.parse(value)
    expect(value).toBe(expected)
    // Uint64
    value = createValue('uint64')
    const bigexpected = Uint64Schema.parse(value)
    expect(value).toBe(bigexpected)
  })

  test('integers', () => {
    // Int8
    let value = createValue('int8')
    let expected = Int8Schema.parse(value)
    expect(value).toBe(expected)
    // Int16
    value = createValue('int16')
    expected = Int16Schema.parse(value)
    expect(value).toBe(expected)
    // Int32
    value = createValue('int32')
    expected = Int32Schema.parse(value)
    expect(value).toBe(expected)
    // Int64
    value = createValue('int64')
    const bigexpected = Int64Schema.parse(value)
    expect(value).toBe(bigexpected)
  })

  test('floats', () => {
    // Float32
    let value = createValue('float32')
    let expected = Float32Schema.parse(value)
    expect(value).toBe(expected)
    // Float64
    value = createValue('float64')
    expected = Float64Schema.parse(value)
    expect(value).toBe(expected)
  })

  test('invalid', () => {
    ['bool', 'number', 'float', 'String'].forEach(type => {
      // @ts-expect-error
      const value = createValue(type as ProtocolField)
      expect(value).toBeNull()
    })
  })
})

test('createPayload', () => {
  const testSentence: StoredSentence = {
    id: 'TEST',
    protocol: {
      name: 'TESTING PROTOCOL',
      standard: false,
      version: '1.2.3'
    },
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
      { name: '11', type: 'string' }
    ],
    description: 'This is just an invented sentence for testing'
  }
  expect(StoredSentenceSchema.parse(testSentence)).toEqual(testSentence)
  const payload = createPayload(testSentence)
  const fields = payload.split(SEPARATOR)
  expect(Float64Schema.is(Number(fields[0]))).toBeTruthy()
  expect(Float32Schema.is(Number(fields[1]))).toBeTruthy()
  expect(Int8Schema.is(Number(fields[2]))).toBeTruthy()
  expect(Int16Schema.is(Number(fields[3]))).toBeTruthy()
  expect(Int32Schema.is(Number(fields[4]))).toBeTruthy()
  expect(Int64Schema.is(BigInt(fields[5]))).toBeTruthy()
  expect(Uint8Schema.is(Number(fields[6]))).toBeTruthy()
  expect(Uint16Schema.is(Number(fields[7]))).toBeTruthy()
  expect(Uint32Schema.is(Number(fields[8]))).toBeTruthy()
  expect(Uint64Schema.is(BigInt(fields[9]))).toBeTruthy()
  expect(fields[10] === 'true' || fields[10] === 'false').toBeTruthy()
  expect(StringSchema.is(fields[11])).toBeTruthy()
})

test('createFakeSentence', () => {
  const sample = createFakeSentence(TEST_STORED_SENTENCE)
  expect(NMEALikeSchema.is(sample)).toBeTruthy()
  // Check that fake sentence can be parsed
  const received = Date.now()
  const aux = sample.slice(START_FLAG.length, -END_FLAG.length)
  const [info, cs] = aux.split(DELIMITER)
  const [sentenceID, ...rest] = info.split(SEPARATOR)
  const sentencePayload = rest.join(SEPARATOR)
  const checksum: Checksum = { value: stringChecksumToNumber(cs), sample: cs}
  const parsed = getUnknowNMEASentence({ received, sample, sentenceID, sentencePayload, checksum })
  expect(parsed.sample).toBe(sample)
  expect(parsed.checksum).toEqual(checksum)
})
