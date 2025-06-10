import { describe, expect, test } from 'vitest'
import {
  parseAPI,
  parseCommand,
  parseFactoryReset,
  parseFirmware,
  parseFrequency,
  parseLogIntervals,
  parseProtocols,
  parseRestartDevice,
  parseSerialNumber,
  parseTime,
  parseUpgradeFirmware
} from '../src/command'

import {
  API_TYPICAL_CONTENT_101,
  API_TYPICAL_CONTENT_102,
  COMMAND_MODE_101,
  COMMAND_MODE_102,
  FACTORY_RESET,
  FIRMWARE_START,
  FREQUENCY_START,
  LOG_INTERVAL_START,
  PROTOCOLS_START,
  RESTART_DEVICE,
  SERIAL_NUMBER_START,
  TIMESTAMP_START,
  UPGRADE_FIRMWARE
} from '../src/constants'
import type { Timestamp } from '../src/types'

const timestamp: Timestamp = Date.now()

describe('parseCommand', () => {
  test('happy path - should parse command mode 1.0.1', () => {
    const input = COMMAND_MODE_101
    const result = parseCommand(input, timestamp)
    
    expect(result).toEqual({
      raw: input,
      id: 'command',
      timestamp,
      firmware: '1.0.1',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'command command',
        type: 'string',
        value: input
      }]
    })
  })

  test('happy path - should parse command mode 1.0.2', () => {
    const input = COMMAND_MODE_102
    const result = parseCommand(input, timestamp)
    
    expect(result).toEqual({
      raw: input,
      id: 'command',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'command command',
        type: 'string',
        value: input
      }]
    })
  })

  test('error case - should handle invalid command', () => {
    const input = 'INVALID_COMMAND'
    const result = parseCommand(input, timestamp)
    expect(result.errors?.length).toBeGreaterThan(0)
  })

  test('error case - should handle empty command', () => {
    const input = ''
    const result = parseCommand(input, timestamp)
    expect(result.errors?.length).toBeGreaterThan(0)
  })

  test('should be case insensitive for valid commands', () => {
    const input = COMMAND_MODE_102.toLowerCase()
    const result = parseCommand(input, timestamp)
    
    expect(result.errors).toBeUndefined()
    expect(result.firmware).toBe('1.0.2')
  })
})

describe('parseAPI', () => {
  test('should parse API v1.0.1 content correctly', () => {
    const input = API_TYPICAL_CONTENT_101
    const result = parseAPI(input, timestamp)

    expect(result.firmware).toBe('1.0.1')
    expect(result.id).toBe('api')
    expect(result.mode).toBe('command')
    expect(result.payload[0].value).toBe(input)
  })

  test('should parse API v1.0.2 content correctly', () => {
    const input = API_TYPICAL_CONTENT_102
    const result = parseAPI(input, timestamp)

    expect(result.firmware).toBe('1.0.2')
    expect(result.id).toBe('api')
    expect(result.mode).toBe('command')
    expect(result.payload[0].value).toBe(input)
  })
})

describe('parseSerialNumber', () => {
  test('should parse valid serial number', () => {
    const input = `${SERIAL_NUMBER_START}1234567`
    const result = parseSerialNumber(input, timestamp)

    expect(result.id).toBe('serial_number')
    expect(result.payload[0].value).toBe('1234567')
    expect(result.errors).toBeUndefined()
  })

  test('should handle invalid serial number format', () => {
    const input = `${SERIAL_NUMBER_START}ABC1234`
    const result = parseSerialNumber(input, timestamp)
    expect(result.errors as string[]).toContain('Serial number should be a number -> ABC1234')
  })

  test('should handle negative serial number', () => {
    const input = `${SERIAL_NUMBER_START}-123456`
    const result = parseSerialNumber(input, timestamp)

    expect(result.errors).toContain('Serial number should be a positive integer -> -123456')
  })
})

describe('parseFirmware', () => {
  test('should parse valid firmware version', () => {
    const input = `${FIRMWARE_START}1.0.2`
    const result = parseFirmware(input, timestamp)

    expect(result.id).toBe('firmware')
    expect(result.firmware).toBe('1.0.2')
    expect(result.errors).toBeUndefined()
  })

  test('should handle invalid firmware format - no major', () => {
    const input = `${FIRMWARE_START}abcdef`
    const result = parseFirmware(input, timestamp)

    expect(result.errors).toContain('Firmware should contain a major version number -> abcdef')
  })

  test('should handle invalid firmware format - no minor', () => {
    const input = `${FIRMWARE_START}1.abcdef`
    const result = parseFirmware(input, timestamp)

    expect(result.errors).toContain('Firmware should contain a minor version number -> 1.abcdef')
  })

  test('should handle invalid firmware format - no patch', () => {
    const input = `${FIRMWARE_START}1.0.abcdef`
    const result = parseFirmware(input, timestamp)

    expect(result.errors).toContain('Firmware should contain a patch version number -> 1.0.abcdef')
  })
})

describe('parseFrequency', () => {
  test('should parse valid frequency', () => {
    const input = `${FREQUENCY_START}70`
    const result = parseFrequency(input, timestamp)

    expect(result.id).toBe('frequency')
    expect(result.payload[0].value).toBe(70)
    expect(result.payload[0].units).toBe('kHz')
    expect(result.errors).toBeUndefined()
  })

  test('should handle invalid frequency - out of range', () => {
    const input = `${FREQUENCY_START}80`
    const result = parseFrequency(input, timestamp)

    expect(result.errors).toContain('Frequency should be an integer between 63 and 77 -> 80')
  })

  test('should handle invalid frequency - not a number', () => {
    const input = `${FREQUENCY_START}ABC`
    const result = parseFrequency(input, timestamp)
    expect(result.errors).toContain('Frequency should be a number -> ABC')
  })
})

describe('parseTime', () => {
  test('should parse valid timestamp', () => {
    const input = `${TIMESTAMP_START}1685358000` // May 29, 2025 12:00:00
    const result = parseTime(input, timestamp)

    expect(result.id).toBe('time')
    expect(result.payload[0].value).toBe(1685358000)
    expect(result.payload[0].units).toBe('seconds')
    expect(result.metadata?.date).toBeDefined()
    expect(result.errors).toBeUndefined()
  })

  test('should handle invalid timestamp - not a number', () => {
    const input = `${TIMESTAMP_START}ABC`
    const result = parseTime(input, timestamp)

    expect(result.errors).toContain('Time should be a number -> ABC')
  })
})

describe('parseProtocols', () => {
  test('should parse valid protocol number', () => {
    const input = `${PROTOCOLS_START}01`
    const result = parseProtocols(input, timestamp)

    expect(result.id).toBe('protocols')
    expect(result.payload[0].value).toBe('01')
    expect(result.metadata).toBeDefined()
    expect(result.errors).toBeUndefined()
  })

  test('should handle invalid protocol - not a number', () => {
    const input = `${PROTOCOLS_START}ABC`
    const result =parseProtocols(input, timestamp)
    expect(result.errors).toContain('Protocols should be a number -> ABC')
  })

  test('should handle invalid protocol - negative number', () => {
    const input = `${PROTOCOLS_START}-1`
    const result = parseProtocols(input, timestamp)

    expect(result.errors).toContain('Protocols should be a positive integer -> -1')
  })
})

describe('parseLogIntervals', () => {
  test('should parse valid log interval', () => {
    const input = `${LOG_INTERVAL_START}01`
    const result = parseLogIntervals(input, timestamp)

    expect(result.id).toBe('log_intervals')
    expect(result.payload[0].value).toBe('01')
    expect(result.metadata?.intervals).toBeDefined()
    expect(result.errors).toBeUndefined()
  })

  test('should handle invalid log interval - not a number', () => {
    const input = `${LOG_INTERVAL_START}ABC`
    const result = parseLogIntervals(input, timestamp)
    expect(result.errors).toContain('Log Intervals should be a number -> ABC')
  })

  test('should handle invalid log interval - negative number', () => {
    const input = `${LOG_INTERVAL_START}-1`
    const result = parseLogIntervals(input, timestamp)

    expect(result.errors).toContain('Log Intervals should be a positive integer -> -1')
  })
})

describe('parseRestartDevice', () => {
  test('happy path - should parse valid restart command', () => {
    const input = RESTART_DEVICE
    const result = parseRestartDevice(input, timestamp)
    const expected = {
      raw: input,
      id: 'restart_device',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'restart device command',
        type: 'string',
        value: input
      }]
    }
    expect(result).toEqual(expected)
  })

  test('error case - should handle empty command', () => {
    const input = ''
    const result = parseRestartDevice(input, timestamp)
    expect(result.errors?.length).toBeGreaterThan(0)
  })

  test('error case - should handle malformed command', () => {
    const input = 'RESTA RT'
    const result = parseRestartDevice(input, timestamp)
    expect(result.errors?.length).toBeGreaterThan(0)
  })
})

describe('parseFactoryReset', () => {
  test('happy path - should parse valid reset command', () => {
    const input = FACTORY_RESET
    const result = parseFactoryReset(input, timestamp)
    const expected = {
      raw: input,
      id: 'factory_reset',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'factory reset command',
        type: 'string',
        value: input
      }]
    }
    expect(result).toEqual(expected)
  })

  test('error case - should handle empty command', () => {
    const input = ''
    const result = parseFactoryReset(input, timestamp)
    expect(result.errors?.length).toBeGreaterThan(0)
  })

  test('error case - should handle malformed command', () => {
    const input = 'RES ET'
    const result = parseFactoryReset(input, timestamp)
    expect(result.errors?.length).toBeGreaterThan(0)
  })
})

describe('parseUpgradeFirmware', () => {
  test('happy path - should parse valid upgrade command', () => {
    const input = UPGRADE_FIRMWARE
    const result = parseUpgradeFirmware(input, timestamp)
    const expected = {
      raw: input,
      id: 'upgrade_firmware',
      timestamp,
      firmware: '1.0.2',
      mode: 'update',
      payload: [{
        raw: input,
        name: 'upgrade firmware command',
        type: 'string',
        value: input
      }]
    }
    expect(result).toEqual(expected)
  })

  test('error case - should handle empty command', () => {
    const input = ''
    const result = parseUpgradeFirmware(input, timestamp)
    expect(result.mode).toBe('update')
    expect(result.errors?.length).toBeGreaterThan(0)
  })

  test('error case - should handle malformed command', () => {
    const input = 'UP GRADE'
    const result = parseUpgradeFirmware(input, timestamp)
    expect(result.mode).toBe('update')
    expect(result.errors?.length).toBeGreaterThan(0)
  })
})
