import * as v from 'valibot'
import { describe, test, expect } from 'vitest'
import { FIRMWARES_AVAILABLE, FREQUENCY_MAX, FREQUENCY_MIN } from '../src/constants'
import { EmitterSchema, FrequencySchema, ReceiverSchema, SerialNumberSchema } from '../src/schemas'
import { Emitter, Firmware, Mode, Receiver } from '../src/types'

describe('Serial Numbers', () => {
  test('Non valid type of inputs', () => {
    [
      [123, 'SerialNumber: It should be a string'],
      ['abc', 'SerialNumber: It should be a positive integer string number'],
      ['12a', 'SerialNumber: It should be a positive integer string number'],
      ['12.7', 'SerialNumber: It should be a positive integer string number'],
      ['-12', 'SerialNumber: It should be a positive integer string number'],
    ].forEach(([serialNumber, message]) => {
      const result = v.safeParse(SerialNumberSchema, serialNumber)
      expect(result.success).toBeFalsy()
      if (!result.success) {
        expect(result.issues[0].message).toBe(message)
      }
    })
  })

  test('Non valid length', () => {
    [
      ['12345', 'SerialNumber: It should have at least 6 digits'],
      ['12345678', 'SerialNumber: It should have 7 digits at most']
    ].forEach(([serialNumber, message]) => {
      const result = v.safeParse(SerialNumberSchema, serialNumber)
      expect(result.success).toBeFalsy()
      if (!result.success) {
        expect(result.issues[0].message).toBe(message)
      }
    })
  })

  test('Valid values', () => {
    ['123456', '1234567'].forEach(serialNumber => expect(v.parse(SerialNumberSchema, serialNumber)).toBe(serialNumber))
  })
})

test('Frequency', () => {
  // Invalid values
  [
    [63.3, 'Frequency: It should be an integer'],
    [62, 'Frequency: It should greater equal to 63'],
    [78, 'Frequency: It should lesser equal to 77']
  ].forEach(([freq, message]) => {
    const result = v.safeParse(FrequencySchema, freq)
    expect(result.success).toBeFalsy()
    if (!result.success) {
      expect(result.issues[0].message).toBe(message)
    }
  });
  // Valid values
  [
    63,
    77,
    Math.floor(Math.random() * (FREQUENCY_MAX - FREQUENCY_MIN + 1) + FREQUENCY_MIN)
  ].forEach(freq => expect(v.safeParse(FrequencySchema, freq).success).toBeTruthy())
})

test('Emitter', () => {
  const emitter: Emitter = { serialNumber: '1234567', frequency: 70 }
  expect(v.safeParse(EmitterSchema, emitter).success).toBeTruthy()
})

describe('Receiver', () => {
  test('Invalid number of emitters', () => {
    let receiver: Receiver = {
      serialNumber: '1234567',
      frequency: 70,
      firmware: '1.0.1',
      mode: 'listening',
      emitters: []
    }
    // None emitters
    let result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeFalsy()
    if (!result.success) {
      expect(result.issues[0].message).toBe('Receiver: It should be at least one emitter')
    }
    // Invalid number of emitters
    const emitters: Emitter[] = [
      { serialNumber: '111111', frequency: 66 },
      { serialNumber: '2222222', frequency: 66 },
      { serialNumber: '333333', frequency: 66 },
      { serialNumber: '4444444', frequency: 66 },
    ]
    receiver.emitters = emitters
    result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeFalsy()
    if (!result.success) {
      expect(result.issues[0].message).toBe('Receiver: It should be only three emitters as maximum')
    }
  })

  test('Invalid emitters', () => {
    let receiver: Receiver = {
      serialNumber: '1234567',
      frequency: 70,
      firmware: '1.0.1',
      mode: 'listening',
      emitters: []
    }
    // Same emitters serial number
    let emitters: Emitter[] = [
      { serialNumber: '111111', frequency: 66 },
      { serialNumber: '111111', frequency: 68 },
      { serialNumber: '111111', frequency: 64 },
    ]
    receiver.emitters = emitters
    let result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeFalsy()
    if (!result.success) {
      expect(result.issues[0].message).toBe('Receiver: All emitters serial number should be different between them')
    }
    // Same emitters frequencies
    receiver.emitters = [
      { serialNumber: '111111', frequency: 66 },
      { serialNumber: '222222', frequency: 66 },
      { serialNumber: '333333', frequency: 66 },
    ]
    result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeFalsy()
    if (!result.success) {
      expect(result.issues[0].message).toBe('Receiver: All emitters frequencies should be different between them')
    }
    // Frequencies should be 62 < freq < 77 KHz
    receiver.emitters = [
      { serialNumber: '111111', frequency: 50 },
      { serialNumber: '222222', frequency: 69 },
      { serialNumber: '333333', frequency: 70 },
    ]
    result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeFalsy()
    if (!result.success) {
      expect(result.issues[0].message).toBe('Frequency: It should greater equal to 63')
    }
    receiver.emitters = [
      { serialNumber: '111111', frequency: 64 },
      { serialNumber: '222222', frequency: 69 },
      { serialNumber: '333333', frequency: 80 },
    ]
    result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeFalsy()
    if (!result.success) {
      expect(result.issues[0].message).toBe('Frequency: It should lesser equal to 77')
    }
    // Frequencies should +- 2 KHz of receiver frequency
    receiver.emitters = [
      { serialNumber: '111111', frequency: 70 },
      { serialNumber: '222222', frequency: 69 },
      { serialNumber: '333333', frequency: 71 },
    ]
    result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeFalsy()
    if (!result.success) {
      expect(result.issues[0].message).toBe('Receiver: All emitters frequencies should be equal to TB-Live frequency or ± 2 kHz')
    }
  })

  test('Firmware', () => {
    // Valid firmware
    const receiver: Receiver = {
      serialNumber: '1234567',
      frequency: 70,
      firmware: '1.0.1',
      mode: 'listening',
      emitters: [
        { serialNumber: '111111', frequency: 68 },
        { serialNumber: '222222', frequency: 70 },
        { serialNumber: '333333', frequency: 72 },
      ]
    }
    expect(v.safeParse(ReceiverSchema, receiver).success).toBeTruthy()
    receiver.firmware = '1.0.2'
    expect(v.safeParse(ReceiverSchema, receiver).success).toBeTruthy();
    // Invalid firmware
    ['1.o.2', '102', 'true'].forEach(fw => {
      receiver.firmware = fw as Firmware
      const result = v.safeParse(ReceiverSchema, receiver)
      expect(result.success).toBeFalsy()
      if (!result.success) {
        expect(result.issues[0].message).toBe(`Firmware: available firmwares are ${FIRMWARES_AVAILABLE}`)
      }
    });
    [102, true, {}].forEach(fw => {
      receiver.firmware = fw as Firmware
      const result = v.safeParse(ReceiverSchema, receiver)
      expect(result.success).toBeFalsy()
    })
  })

  test('Mode', () => {
    // Valid mode
    const receiver: Receiver = {
      serialNumber: '1234567',
      frequency: 70,
      firmware: '1.0.1',
      mode: 'listening',
      emitters: [
        { serialNumber: '111111', frequency: 68 },
        { serialNumber: '222222', frequency: 70 },
        { serialNumber: '333333', frequency: 72 },
      ]
    }
    expect(v.safeParse(ReceiverSchema, receiver).success).toBeTruthy()
    receiver.mode = 'command'
    expect(v.safeParse(ReceiverSchema, receiver).success).toBeTruthy();
    // receiver.mode = 'update'
    // expect(v.safeParse(ReceiverSchema, receiver).success).toBeTruthy();
    // Invalid firmware
    ['upgrade', 'cmd', 'true'].forEach(mode => {
      receiver.mode = mode as Mode
      const result = v.safeParse(ReceiverSchema, receiver)
      expect(result.success).toBeFalsy()
      if (!result.success) {
        expect(result.issues[0].message).toBe('Mode: It should be "listening" or "command" or "update"')
      }
    });
    [102, true, {}].forEach(mode => {
      receiver.mode = mode as Mode
      const result = v.safeParse(ReceiverSchema, receiver)
      expect(result.success).toBeFalsy()
    })
  })

  test('Valid emitters', () => {
    let receiver: Receiver = {
      serialNumber: '1234567',
      frequency: 70,
      firmware: '1.0.1',
      mode: 'listening',
      emitters: []
    }
    // Three emitters
    let emitters: Emitter[] = [
      { serialNumber: '111111', frequency: 68 },
      { serialNumber: '222222', frequency: 70 },
      { serialNumber: '333333', frequency: 72 },
    ]
    receiver.emitters = emitters
    let result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeTruthy()
    // two emitters
    emitters.pop()
    receiver.emitters = emitters
    result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeTruthy()
    // one emitters
    emitters.pop()
    receiver.emitters = emitters
    result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeTruthy()
    // none emitters
    emitters.pop()
    receiver.emitters = emitters
    result = v.safeParse(ReceiverSchema, receiver)
    expect(result.success).toBeFalsy()
  })
})