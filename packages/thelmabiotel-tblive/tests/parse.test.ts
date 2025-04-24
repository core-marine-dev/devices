import { describe, expect, test } from 'vitest'

import { API_TYPICAL_CONTENT_101, API_TYPICAL_CONTENT_102, COMMAND_MODE, FIRMWARE_START, FREQUENCY_START, LISTENING_MODE, LOG_INTERVAL_START, PING_END, PING_START, PROTOCOLS_START, SAMPLE_END, SAMPLE_START, SERIAL_NUMBER_START, TIMESTAMP_START, UPDATE_MODE } from '../src/constants'
import { getBoundariesAPI, getBoundariesClockRound, getBoundariesClockSet, getBoundariesCommand, getBoundariesFirmware, getBoundariesFrequency, getBoundariesIntervals, getBoundariesListening, getBoundariesPing, getBoundariesProtocols, getBoundariesSample, getBoundariesSerialNumber, getBoundariesTime, getBoundariesUpdate, getRawSentence } from '../src/parse'

describe('getBoundariesSample', () => {
  const startFlag = '$'
  const endFlag = '\r'
  const sentence = `${startFlag}1000185,0000073905,745,S64K,30075,3,25,67,2757${endFlag}`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesSample(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test('end sample', () => {
    const sample = `2024-07-05T07:13:47.898Z - ${sentence}`
    const boundaries = getBoundariesSample(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(startFlag), end: sample.length })
  })

  test('start sample', () => {
    const sample = `${sentence} - 2024-07-05T07:13:47.898Z`
    const boundaries = getBoundariesSample(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.indexOf(endFlag) + endFlag.length })
  })
})

describe('getBoundariesPing', () => {
  const startFlag = PING_START
  const endPing = PING_END
  const ping = `${startFlag}000185 ${endPing}`

  test('happy path ping', () => {
    const sample = ping
    const boundaries = getBoundariesPing(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test('start sample ping', () => {
    const sample = `${ping} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesPing(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.indexOf(endPing) + endPing.length })
  })

  test('end sample ping', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${ping}`
    const boundaries = getBoundariesPing(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(startFlag), end: sample.length })
  })
})

describe('getBoundariesSerialNumber', () => {
  const startFlag = SERIAL_NUMBER_START
  const serialnumber = `${startFlag}1000185`

  test('happy path serialnumber', () => {
    const sample = serialnumber
    const boundaries = getBoundariesSerialNumber(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test('start sample serialnumber', () => {
    const sample = `${serialnumber} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesSerialNumber(sample)
    expect(boundaries).toEqual({ start: 0, end: serialnumber.length })
  })

  test('end sample serialnumber', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${serialnumber}`
    const boundaries = getBoundariesSerialNumber(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(startFlag), end: sample.length })
  })
})

describe('getBoundariesClockRound', () => {
  const sentence = `ack01\r`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesClockRound(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test('start round', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesClockRound(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length })
  })

  test('end round', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesClockRound(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length })
  })
})

describe('getBoundariesClockSet', () => {
  const sentence = `ack02\r`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesClockSet(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesClockSet(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesClockSet(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length })
  })
})

describe('getBoundariesCommand', () => {
  const sentence = COMMAND_MODE

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesCommand(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesCommand(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesCommand(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length })
  })
})

describe('getBoundariesListening', () => {
  const sentence = LISTENING_MODE

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesListening(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesListening(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesListening(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length })
  })
})

describe('getBoundariesUpdate', () => {
  const sentence = UPDATE_MODE

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesUpdate(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesUpdate(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesUpdate(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length })
  })
})

describe('getBoundariesAPI', () => {
  const sentence101 = API_TYPICAL_CONTENT_101
  const sentence102 = API_TYPICAL_CONTENT_102

  test('happy path', () => {
    [sentence101, sentence102].forEach((sentence) => {
      const sample = sentence
      const boundaries = getBoundariesAPI(sample)
      expect(boundaries).toEqual({ start: 0, end: sample.length })
    })
  })

  test('start set', () => {
    [sentence101, sentence102].forEach((sentence) => {
      const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
      const boundaries = getBoundariesAPI(sample)
      expect(boundaries).toEqual({ start: 0, end: sentence.length })
    })
  })

  test('end set', () => {
    [sentence101, sentence102].forEach((sentence) => {
      const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
      const boundaries = getBoundariesAPI(sample)
      expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length })
    })
  })
})

describe("getBoundariesFirmware", () => {
  const sentence = `${FIRMWARE_START}1.0.1alpha`

  test("happy path", () => {
    const sample = sentence
    const boundaries = getBoundariesFirmware(sample)
    expect(boundaries).toEqual({ start: 0, end: -1 })
  })

  test("start set", () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesFirmware(sample)
    expect(boundaries).toEqual({ start: 0, end: -1 })
  })

  test("end set", () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesFirmware(sample)
    expect(boundaries).toEqual({
      start: sample.indexOf(sentence), end: -1
    })
  })
})

describe("getBoundariesFrequency", () => {
  const sentence = `${FREQUENCY_START}70`

  test("happy path", () => {
    const sample = sentence
    const boundaries = getBoundariesFrequency(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test("start set", () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesFrequency(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length })
  })

  test("end set", () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesFrequency(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length })
  })
})

describe("getBoundariesTime", () => {
  const sentence = `${TIMESTAMP_START}${Date.now()}`

  test("happy path", () => {
    const sample = sentence
    const boundaries = getBoundariesTime(sample)
    expect(boundaries).toEqual({ start: 0, end: -1 })
  })

  test("start set", () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesTime(sample)
    expect(boundaries).toEqual({ start: 0, end: -1 })
  })

  test("end set", () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesTime(sample)
    expect(boundaries).toEqual({
      start: sample.indexOf(sentence), end: -1
    })
  })
})

describe("getBoundariesProtocols", () => {
  const sentence = `${PROTOCOLS_START}01`

  test("happy path", () => {
    const sample = sentence
    const boundaries = getBoundariesProtocols(sample);
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test("start set", () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesProtocols(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length })
  })

  test("end set", () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesProtocols(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length })
  })
})

describe("getBoundariesIntervals", () => {
  const sentence = `${LOG_INTERVAL_START}01`

  test("happy path", () => {
    const sample = sentence
    const boundaries = getBoundariesIntervals(sample);
    expect(boundaries).toEqual({ start: 0, end: sample.length })
  })

  test("start set", () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesIntervals(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length })
  })

  test("end set", () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesIntervals(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length })
  })
})

describe('getRawSentence', () => {
  const sample = `${SAMPLE_START}1000185,0000073905,745,S64K,30075,3,25,67,2757${SAMPLE_END}`
  const ping = `${PING_START}000185 ${PING_END}`

  test('happy path', () => {
    const input = `${sample}${ping}`
    const { sentence, interference } = getRawSentence(input)
    expect(sentence.index).toEqual(0)
    expect(sentence.id).toMatch(sample)
    expect(interference).toBeUndefined()
  })

  test('interference', () => {
    const pivot = 15
    const end = sample.length - pivot
    const input = `${sample.slice(0, end)}${ping}${sample.slice(end)}`
    const { sentence, interference } = getRawSentence(input)
    expect(interference).not.toBeUndefined()
    expect(sentence).toEqual({ id: 'sample', index: 0})
    expect(interference).toEqual({ id: "ping", index: end })
  })
})