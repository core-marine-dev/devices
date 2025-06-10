import { describe, expect, test } from 'vitest'
import { API_START, API_TYPICAL_CONTENT_101, API_TYPICAL_CONTENT_102, CLOCK_ROUND, CLOCK_SET, COMMAND_MODE_101, FACTORY_RESET, FIRMWARE_START, FREQUENCY_START, LISTENING_MODE, LOG_INTERVAL_START, PING_END, PING_START, PROTOCOLS_START, RESTART_DEVICE, SAMPLE_END, SAMPLE_START, SERIAL_NUMBER_START, TIMESTAMP_START, UPGRADE_FIRMWARE } from '../src/constants'
import { getBoundariesAPI, getBoundariesClockRound, getBoundariesClockSet, getBoundariesCommand, getBoundariesFactoryReset, getBoundariesFirmware, getBoundariesFrequency, getBoundariesIntervals, getBoundariesListening, getBoundariesPing, getBoundariesProtocols, getBoundariesRestartDevice, getBoundariesSample, getBoundariesSerialNumber, getBoundariesTime, getBoundariesUpgradeFirmware, getRawSentence, parseSentences } from '../src/parse'

describe('getBoundariesSample', () => {
  const startFlag = '$'
  const endFlag = '\r'
  const sentence = `${startFlag}1000185,0000073905,745,S64K,30075,3,25,67,2757${endFlag}`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesSample(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start sample', () => {
    const sample = `${sentence} - 2024-07-05T07:13:47.898Z`
    const boundaries = getBoundariesSample(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.indexOf(endFlag) + endFlag.length, incomplete: false })
  })

  test('end sample', () => {
    const sample = `2024-07-05T07:13:47.898Z - ${sentence}`
    const boundaries = getBoundariesSample(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(startFlag), end: sample.length, incomplete: false })
  })

  test('incomplete', () => {
    const sample = `asldfjka${sentence.slice(0, -1)}ASD` // remove the last character to make it incomplete
    const boundaries = getBoundariesSample(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(startFlag), end: -1, incomplete: true })
  })
})

describe('getBoundariesPing', () => {
  const startFlag = PING_START
  const endPing = PING_END
  const ping = `${startFlag}000185 ${endPing}`

  test('happy path ping', () => {
    const sample = ping
    const boundaries = getBoundariesPing(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length , incomplete: false })
  })

  test('start sample ping', () => {
    const sample = `${ping} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesPing(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.indexOf(endPing) + endPing.length, incomplete: false })
  })

  test('end sample ping', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${ping}`
    const boundaries = getBoundariesPing(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(startFlag), end: sample.length, incomplete: false })
  })

  test('incomplete', () => {
    const sample = `saldkjas${ping.slice(0, -1)}sdfs` // remove the last character to make it incomplete
    const boundaries = getBoundariesPing(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(startFlag), end: -1, incomplete: true })
  })
})

describe('getBoundariesClockRound', () => {
  const sentence = `ack01\r`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesClockRound(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start round', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesClockRound(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end round', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesClockRound(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })
})

describe('getBoundariesClockSet', () => {
  const sentence = `ack02\r`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesClockSet(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesClockSet(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesClockSet(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })
})

describe('getBoundariesListening', () => {
  const sentence = LISTENING_MODE

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesListening(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesListening(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesListening(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })
})

describe('getBoundariesCommand', () => {
  const sentence = COMMAND_MODE_101

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesCommand(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesCommand(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesCommand(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })
})

describe('getBoundariesAPI', () => {
  const sentence101 = API_TYPICAL_CONTENT_101
  const sentence102 = API_TYPICAL_CONTENT_102

  test('happy path', () => {
    [sentence101, sentence102].forEach((sentence) => {
      const sample = sentence
      const boundaries = getBoundariesAPI(sample)
      expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
    })
  })

  test('start api', () => {
    [sentence101, sentence102].forEach((sentence) => {
      const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
      const boundaries = getBoundariesAPI(sample)
      expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
    })
  })

  test('end api', () => {
    [sentence101, sentence102].forEach((sentence) => {
      const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
      const boundaries = getBoundariesAPI(sample)
      expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
    })
  })

  test('incomplete', () => {
    [sentence101, sentence102].forEach((sentence) => {
      const sample = `2024-07-05T07:26:49.713Z - ${sentence.slice(0, -2)}`
      const boundaries = getBoundariesAPI(sample)
      const expected = { start: sample.indexOf(API_START), end: -1, incomplete: true }
      expect(boundaries).toEqual(expected)
    })
  })

  test('no api', () => {
    [sentence101, sentence102].forEach((sentence) => {
      const sample = `2024-07-05T07:26:49.713Z - ${sentence.slice(0, -2)}dfsgsdfg`
      const boundaries = getBoundariesAPI(sample)
      expect(boundaries).toEqual({ start: sample.indexOf(API_START), end: -1, incomplete: false })
    })
  })
})

describe('getBoundariesSerialNumber', () => {
  const startFlag = SERIAL_NUMBER_START
  const serialnumber = `${startFlag}1000185`

  test('happy path serialnumber', () => {
    const sample = serialnumber
    const boundaries = getBoundariesSerialNumber(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start sample serialnumber', () => {
    const sample = `${serialnumber} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesSerialNumber(sample)
    expect(boundaries).toEqual({ start: 0, end: serialnumber.length, incomplete: false })
  })

  test('end sample serialnumber', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${serialnumber}`
    const boundaries = getBoundariesSerialNumber(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(startFlag), end: sample.length, incomplete: false})
  })

  test('incomplete', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${serialnumber.slice(0, -2)}dfsgsdfg`
    const boundaries = getBoundariesSerialNumber(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(startFlag), end: -1, incomplete: true})
  })
})

describe('getBoundariesFirmware', () => {
  const sentence = `${FIRMWARE_START}1.0.1alpha`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesFirmware(sample)
    expect(boundaries).toEqual({ start: 0, end: FIRMWARE_START.length + '1.0.1'.length, incomplete: false })
  })

  test('start firmware', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesFirmware(sample)
    expect(boundaries).toEqual({ start: 0, end: FIRMWARE_START.length + '1.0.1'.length, incomplete: false })
  })

  test('end firmware', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesFirmware(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.indexOf(sentence) + FIRMWARE_START.length + '1.0.1'.length, incomplete: false })
  })

  test('incomplete firmware', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence.slice(0, 7)}`
    const boundaries = getBoundariesFirmware(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(FIRMWARE_START), end: -1, incomplete: true })
  })
})

describe('getBoundariesFrequency', () => {
  const sentence = `${FREQUENCY_START}70`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesFrequency(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start frequency', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesFrequency(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end frequency', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesFrequency(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })

  test('incomplete frequency', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence.slice(0, 4)}`
    const boundaries = getBoundariesFrequency(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(FREQUENCY_START), end: -1, incomplete: true })
  })
})

describe('getBoundariesTime', () => {
  const sentence = `${TIMESTAMP_START}${Math.trunc(Date.now() / 1000)}`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesTime(sample)
    expect(boundaries.start).toEqual(0)
    expect(boundaries.end).toBeLessThanOrEqual(sentence.length)
    expect(boundaries.incomplete).toEqual(false)
  })

  test('start time', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesTime(sample)
    expect(boundaries.start).toEqual(0)
    expect(boundaries.end).toBeLessThanOrEqual(sample.slice(TIMESTAMP_START.length).length)
    expect(boundaries.incomplete).toEqual(false)
  })

  test('end time', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesTime(sample)
    expect(boundaries.start).toEqual(sample.indexOf(TIMESTAMP_START))
    expect(boundaries.end).toBeLessThanOrEqual(sample.length)
    expect(boundaries.incomplete).toEqual(false)
  })

  test('incomplete time', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence.slice(0, TIMESTAMP_START.length)}` // remove the last characters to make it incomplete
    const boundaries = getBoundariesTime(sample)
    expect(boundaries.start).toEqual(sample.indexOf(TIMESTAMP_START))
    expect(boundaries.end).toBeLessThanOrEqual(sample.length)
    expect(boundaries.incomplete).toEqual(true)
  })
})

describe('getBoundariesProtocols', () => {
  const sentence = `${PROTOCOLS_START}01`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesProtocols(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start protocols', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesProtocols(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end protocols', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesProtocols(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })

  test('incomplete protocols', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence.slice(0, -2)}`
    const boundaries = getBoundariesProtocols(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(PROTOCOLS_START), end: -1, incomplete: true })
  })
})

describe('getBoundariesIntervals', () => {
  const sentence = `${LOG_INTERVAL_START}01`

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesIntervals(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start intervals', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesIntervals(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end intervals', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesIntervals(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })

  test('incomplete intervals', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence.slice(0, -1)}`
    const boundaries = getBoundariesIntervals(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(LOG_INTERVAL_START), end: -1, incomplete: true })
  })
})

describe('getBoundariesRestartDevice', () => {
  const sentence = RESTART_DEVICE

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesRestartDevice(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesRestartDevice(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesRestartDevice(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })
})

describe('getBoundariesFactoryReset', () => {
  const sentence = FACTORY_RESET

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesFactoryReset(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesFactoryReset(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesFactoryReset(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })
})

describe('getBoundariesUpgradeFirmware', () => {
  const sentence = UPGRADE_FIRMWARE

  test('happy path', () => {
    const sample = sentence
    const boundaries = getBoundariesUpgradeFirmware(sample)
    expect(boundaries).toEqual({ start: 0, end: sample.length, incomplete: false })
  })

  test('start set', () => {
    const sample = `${sentence} - 2024-07-05T07:26:49.713Z`
    const boundaries = getBoundariesUpgradeFirmware(sample)
    expect(boundaries).toEqual({ start: 0, end: sentence.length, incomplete: false })
  })

  test('end set', () => {
    const sample = `2024-07-05T07:26:49.713Z - ${sentence}`
    const boundaries = getBoundariesUpgradeFirmware(sample)
    expect(boundaries).toEqual({ start: sample.indexOf(sentence), end: sample.length, incomplete: false })
  })
})

describe('getRawSentence', () => {
  const sample = `${SAMPLE_START}1000185,0000073905,745,S64K,30075,3,25,67,2757${SAMPLE_END}`
  const ping = `${PING_START}000185 ${PING_END}`

  test('happy path', () => {
    const data = {
      sample,
      ping,
      clockRound: CLOCK_ROUND,
      clockSet: CLOCK_SET,
      listening: LISTENING_MODE,
      command: COMMAND_MODE_101,
      api: API_TYPICAL_CONTENT_101,
      serialNumber: `${SERIAL_NUMBER_START}1000185`,
      firmware: `${FIRMWARE_START}1.0.1alpha`,
      frequency: `${FREQUENCY_START}70`,
      time: `${TIMESTAMP_START}${Math.trunc(Date.now() / 1000)}`,
      protocols: `${PROTOCOLS_START}01`,
      intervals: `${LOG_INTERVAL_START}01`,
      restart: RESTART_DEVICE,
      reset: FACTORY_RESET,
      upgrade: UPGRADE_FIRMWARE
    }
    for (const [key, value] of Object.entries(data)) {
      // const input = `${sample}${ping}`
      const { sentence, interference } = getRawSentence(value)
      expect(sentence.start).toEqual(0)
      expect(sentence.id).toEqual(key)
      if (key !== 'serialNumber') {
        expect(interference).toBeUndefined()
      }
    }
  })

  test('interference', () => {
    const pivot = 15
    const end = sample.length - pivot
    const input = `${sample.slice(0, end)}${ping}${sample.slice(end)}`
    const { sentence, interference } = getRawSentence(input)
    expect(sentence.id).toEqual('sample')
    // expect(interference).not.toBeUndefined()
    expect(interference).toEqual({ id: 'ping', start: end, end: end + ping.length, incomplete: false })
  })
})


describe('parseSentences', () => {
  test('happy path', () => {
    const input = `${SAMPLE_START}1000185,0000073905,745,S64K,30075,3,25,67,2757${SAMPLE_END}`
    const result = parseSentences(input)
    expect(result.sentences).toHaveLength(1)
    expect(result.sentences[0].id).toEqual('emitter')
    expect(result.remainder).toHaveLength(0)
  })

  test('two sentences', () => {
    const input = `${SAMPLE_START}1000185,0000073905,745,S64K,30075,3,25,67,2757${SAMPLE_END}${PING_START}000185 ${PING_END}`
    const result = parseSentences(input)
    expect(result.sentences).toHaveLength(2)
    expect(result.sentences[0].id).toEqual('emitter')
    expect(result.sentences[1].id).toEqual('ping')
  })

  test('interference with clock round', () => {
    const input = `${SAMPLE_START}1000185,0000073905,745,S${CLOCK_ROUND}64K,30075,3,25,67,2757${SAMPLE_END}`
    const result = parseSentences(input)
    expect(result.sentences).toHaveLength(1)
    expect(result.sentences[0].id).toEqual('clock round')
  })
})