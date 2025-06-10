import { API_TYPICAL_CONTENT_101, API_TYPICAL_CONTENT_102, COMMAND_MODE_101, COMMAND_MODE_102, FACTORY_RESET, FIRMWARE_MIN_LENGTH, FIRMWARE_START, FIRMWARES_AVAILABLE, FREQUENCY_LENGTH, FREQUENCY_START, LOG_INTERVAL_LENGTH, LOG_INTERVAL_START, LOG_INTERVALS, PROTOCOLS, PROTOCOLS_LENGTH, PROTOCOLS_START, RESTART_DEVICE, SERIAL_NUMBER_LENGTH_MAX, SERIAL_NUMBER_START, TIMESTAMP_START, UPGRADE_FIRMWARE } from './constants'
import type { ParsedSentence, Timestamp } from './types'

// 07. Command
export const parseCommand = (input: string, timestamp: Timestamp): ParsedSentence => {
  if (input.toUpperCase() === COMMAND_MODE_101) {
    return {
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
    }
  }
  if (input.toUpperCase() === COMMAND_MODE_102) {
    return {
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
    }
  }
  const errors: string[] = [`Command should be one of the following: ${[COMMAND_MODE_101, COMMAND_MODE_102].join(', ')} -> ${input}`]
  return {
    raw: input,
    id: 'command',
    timestamp,
    firmware: '1.0.2',
    mode: 'command',
    payload: [{
      raw: input,
      name: 'command command',
      type: 'string',
      value: input,
      errors
    }],
    errors
  }
}
// 08. API
export const parseAPI = (input: string, timestamp: Timestamp): ParsedSentence => {
  if (input === API_TYPICAL_CONTENT_101) {
    return {
      raw: input,
      id: 'api',
      timestamp,
      firmware: '1.0.1',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'api command',
        type: 'string',
        value: input
      }]
    }
  }
  if (input === API_TYPICAL_CONTENT_102) {
    return {
      raw: input,
      id: 'api',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'api command',
        type: 'string',
        value: input
      }]
    }
  }
  const errors: string[] = [`API should be one of the following: \n${[API_TYPICAL_CONTENT_101, COMMAND_MODE_102].join('\n\n')}\n\n-> ${input}`]
  return {
    raw: input,
    id: 'api',
    timestamp,
    firmware: '1.0.2',
    mode: 'command',
    payload: [{
      raw: input,
      name: 'api command',
      type: 'string',
      value: input,
      errors
    }],
    errors
  }
}
// 09. SerialNumber
export const parseSerialNumber = (input: string, timestamp: Timestamp): ParsedSentence => {
  // Serial number should start with SN=
  if (!input.startsWith(SERIAL_NUMBER_START)) {
    const errors: string[] = [`Serial number should start with ${SERIAL_NUMBER_START} -> ${input}`]
    return {
      raw: input,
      id: 'serial_number',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'serial_number',
        type: 'string',
        value: input,
        errors
      }],
      errors
    }
  }
  const aux = input.replace(SERIAL_NUMBER_START, '').trim()
  // Serial number should be at least 7 characters
  if (aux.length < SERIAL_NUMBER_LENGTH_MAX) {
    const errors: string[] = [`Serial number should be at most ${SERIAL_NUMBER_LENGTH_MAX} characters -> ${aux}`]
    return {
      raw: input,
      id: 'serial_number',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'serial_number',
        type: 'string',
        value: input,
        errors
      }],
      errors
    }
  }
  const sn = aux.slice(0, SERIAL_NUMBER_LENGTH_MAX)
  const value = Number(sn)
  // Serial number should be a number
  if (Number.isNaN(value)) {
    const errors: string[] = [`Serial number should be a number -> ${aux}`]
    return {
      raw: input,
      id: 'serial_number',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: sn,
        name: 'serial_number',
        type: 'string',
        value: sn,
        errors
      }],
      errors
    }
  }
  // Serial number should be a positive integer
  if (!Number.isInteger(value) || value < 0) {
    const errors: string[] = [`Serial number should be a positive integer -> ${sn}`]
    return {
      raw: input,
      id: 'serial_number',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: sn,
        name: 'serial_number',
        type: 'string',
        value: sn,
        errors
      }],
      errors
    }
  }
  // No errors
  return {
    raw: input,
    id: 'serial_number',
    timestamp,
    firmware: '1.0.2',
    mode: 'command',
    payload: [{
      raw: sn,
      name: 'serial_number',
      type: 'string',
      value: sn
    }]
  }
}
// 10. Firmware
export const parseFirmware = (input: string, timestamp: Timestamp): ParsedSentence => {
  // Firmware should start with FV=
  if (!input.startsWith(FIRMWARE_START)) {
    const errors: string[] = [`Firmware should start with ${FIRMWARE_START} -> ${input}`]
    return {
      raw: input,
      id: 'firmware',
      timestamp,
      firmware: 'unknown',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'firmware',
        type: 'string',
        value: input,
        errors
      }],
      errors
    }
  }
  const tmp = input.replace(FIRMWARE_START, '').trim()
  const aux = (tmp.startsWith('v') ? tmp.slice(1) : tmp)
  // Firmware should be at least 5 characters
  if (aux.length < FIRMWARE_MIN_LENGTH) {
    const errors: string[] = [`Firmware should be at most ${FIRMWARE_MIN_LENGTH} characters -> ${aux}`]
    return {
      raw: input,
      id: 'firmware',
      timestamp,
      firmware: 'unknown',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'firmware',
        type: 'string',
        value: aux,
        errors
      }],
      errors
    }
  }
  // Major
  const majorIndex = aux.indexOf('.')
  if (majorIndex === -1) {
    const errors: string[] = [`Firmware should contain a major version number -> ${aux}`]
    return {
      raw: input,
      id: 'firmware',
      timestamp,
      firmware: 'unknown',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'firmware',
        type: 'string',
        value: aux,
        errors
      }],
      errors
    }
  }
  // Minor
  const minorIndex = aux.indexOf('.', majorIndex + 1)
  if (minorIndex === -1) {
    const errors: string[] = [`Firmware should contain a minor version number -> ${aux}`]
    return {
      raw: input,
      id: 'firmware',
      timestamp,
      firmware: 'unknown',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'firmware',
        type: 'string',
        value: aux,
        errors
      }],
      errors
    }
  }
  // Patch
  let end = 0
  for (const char of aux.slice(minorIndex + 1)) {
    if (Number.isNaN(Number(char))) { break }
    end++
  }
  if (end === 0) {
    const errors: string[] = [`Firmware should contain a patch version number -> ${aux}`]
    return {
      raw: input,
      id: 'firmware',
      timestamp,
      firmware: 'unknown',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'firmware',
        type: 'string',
        value: aux,
        errors
      }],
      errors
    }
  }
  // Supported firmware
  const firmware = aux.slice(0, minorIndex + 1 + end)
  if (!FIRMWARES_AVAILABLE.includes(firmware as typeof FIRMWARES_AVAILABLE[number])) {
    const errors: string[] = [`Firmware should be one of the following: ${FIRMWARES_AVAILABLE.join(', ')} -> ${firmware}`]
    return {
      raw: input,
      id: 'firmware',
      timestamp,
      firmware,
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'firmware',
        type: 'string',
        value: aux,
        errors
      }],
      errors
    }
  }
  // No errors
  return {
    raw: input,
    id: 'firmware',
    timestamp,
    firmware,
    mode: 'command',
    payload: [{
      raw: aux,
      name: 'firmware',
      type: 'string',
      value: firmware
    }]
  }
}
// 11. Frequency
export const parseFrequency = (input: string, timestamp: Timestamp): ParsedSentence => {
  // Frequency should start with FC=
  if (!input.startsWith(FREQUENCY_START)) {
    const errors: string[] = [`Frequency should start with ${FREQUENCY_START} -> ${input}`]
    return {
      raw: input,
      id: 'frequency',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'frequency',
        type: 'string',
        value: input,
        units: 'kHz',
        errors
      }],
      errors
    }
  }
  const aux = input.replace(FREQUENCY_START, '').trim()
  // Frequency should be at most 2 characters
  if (aux.length < FREQUENCY_LENGTH) {
    const errors: string[] = [`Frequency should be at most ${FREQUENCY_LENGTH} characters -> ${aux}`]
    return {
      raw: input,
      id: 'frequency',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'frequency',
        type: 'string',
        value: aux,
        units: 'kHz',
        errors
      }],
      errors
    }
  }
  const raw = aux.slice(0, FREQUENCY_LENGTH)
  const freq = Number(raw)
  // Frequency should be a number
  if (Number.isNaN(freq)) {
    const errors: string[] = [`Frequency should be a number -> ${aux}`]
    return {
      raw: input,
      id: 'frequency',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'frequency',
        type: 'string',
        value: aux,
        units: 'kHz',
        errors
      }],
      errors
    }
  }
  // Frequency should be an integer between 63 and 77
  if (!Number.isInteger(freq) || freq < 63 || freq > 77) {
    const errors: string[] = [`Frequency should be an integer between 63 and 77 -> ${freq}`]
    return {
      raw: input,
      id: 'frequency',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'frequency',
        type: 'string',
        value: aux,
        units: 'kHz',
        errors
      }],
      errors
    }
  }
  // No errors
  return {
    raw: input,
    id: 'frequency',
    timestamp,
    firmware: '1.0.2',
    mode: 'command',
    payload: [{
      raw,
      name: 'frequency',
      type: 'uint8',
      value: freq,
      units: 'kHz'
    }]
  }
}
// 12. Time
export const parseTime = (input: string, timestamp: Timestamp): ParsedSentence => {
  // Time should start with UT=
  if (!input.startsWith(TIMESTAMP_START)) {
    const errors: string[] = [`Time should start with ${TIMESTAMP_START} -> ${input}`]
    return {
      raw: input,
      id: 'time',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'time',
        type: 'string',
        value: input,
        units: 'seconds',
        errors
      }],
      errors
    }
  }
  const MAX_LENGTH = Date.now().toString().length
  const aux = input.replace(TIMESTAMP_START, '').slice(0, MAX_LENGTH).trim()
  // Time should be a number a number
  if (Number.isNaN(Number(aux[0])) || aux.length === 0) {
    const errors: string[] = [`Time should be a number -> ${aux}`]
    return {
      raw: input,
      id: 'time',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'time',
        type: 'string',
        value: aux,
        units: 'seconds',
        errors
      }],
      errors
    }
  }

  let seconds = ''
  for (const c of aux) {
    const number = Number(c)
    if (Number.isNaN(number)) { break }
    seconds += c
  }
  // No errors
  const metadata = {
    seconds: Number(seconds),
    timestamp: Number(seconds) * 1000,
    date: new Date(Number(seconds) * 1000).toISOString()
  }
  return {
    raw: input,
    id: 'time',
    timestamp,
    firmware: '1.0.2',
    mode: 'command',
    payload: [{
      raw: aux,
      name: 'time',
      type: 'uint32',
      value: Number(seconds),
      units: 'seconds',
      metadata
    }],
    metadata
  }
}
// 13. Protocols
export const parseProtocols = (input: string, timestamp: Timestamp): ParsedSentence => {
  // Protocols should start with LM=
  if (!input.startsWith(PROTOCOLS_START)) {
    const errors: string[] = [`Protocols should start with ${PROTOCOLS_START} -> ${input}`]
    return {
      raw: input,
      id: 'protocols',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'protocols',
        type: 'string',
        value: input,
        errors
      }],
      errors
    }
  }
  const aux = input.replace(PROTOCOLS_START, '').trim()
  // Protocols should be at most 2 characters
  if (aux.length < PROTOCOLS_LENGTH) {
    const errors: string[] = [`Protocols should be at most ${PROTOCOLS_LENGTH} characters -> ${aux}`]
    return {
      raw: input,
      id: 'protocols',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'protocols',
        type: 'string',
        value: aux,
        errors
      }],
      errors
    }
  }
  const protocols = aux.slice(0, PROTOCOLS_LENGTH)
  const number = Number(protocols)
  // Protocols should be a number
  if (Number.isNaN(number)) {
    const errors: string[] = [`Protocols should be a number -> ${aux}`]
    return {
      raw: input,
      id: 'protocols',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: protocols,
        name: 'protocols',
        type: 'string',
        value: protocols,
        errors
      }],
      errors
    }
  }
  // Protocols should be a positive integer
  if (!Number.isInteger(number) || number < 0) {
    const errors: string[] = [`Protocols should be a positive integer -> ${number}`]
    return {
      raw: input,
      id: 'protocols',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: protocols,
        name: 'protocols',
        type: 'string',
        value: protocols,
        errors
      }],
      errors
    }
  }
  const content = PROTOCOLS[protocols]
  // Protocols should be one of the available protocols
  if (content === undefined) {
    const errors: string[] = [`Protocols should be one of the following: ${Object.keys(PROTOCOLS).join(', ')} -> ${protocols}`]
    return {
      raw: input,
      id: 'protocols',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: protocols,
        name: 'protocols',
        type: 'string',
        value: protocols,
        errors
      }],
      errors
    }
  }
  // No errors
  return {
    raw: input,
    id: 'protocols',
    timestamp,
    firmware: '1.0.2',
    mode: 'command',
    payload: [{
      raw: protocols,
      name: 'protocols',
      type: 'string',
      value: protocols,
      metadata: { ...content }
    }],
    metadata: { protocols, ...content }
  }
}
// 14. Log Intervals
export const parseLogIntervals = (input: string, timestamp: Timestamp): ParsedSentence => {
  // Log Intervals should start with LI=
  if (!input.startsWith(LOG_INTERVAL_START)) {
    const errors: string[] = [`Log Intervals should start with ${LOG_INTERVAL_START} -> ${input}`]
    return {
      raw: input,
      id: 'log_intervals',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: input,
        name: 'log intervals',
        type: 'string',
        value: input,
        errors
      }],
      errors
    }
  }
  const aux = input.replace(LOG_INTERVAL_START, '').trim()
  // Log Intervals should be at most 2 characters
  if (aux.length < LOG_INTERVAL_LENGTH) {
    const errors: string[] = [`Log Intervals should be at most ${LOG_INTERVAL_LENGTH} characters -> ${aux}`]
    return {
      raw: input,
      id: 'log_intervals',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: aux,
        name: 'log intervals',
        type: 'string',
        value: aux,
        errors
      }],
      errors
    }
  }
  const log = aux.slice(0, LOG_INTERVAL_LENGTH)
  const number = Number(log)
  // Log Intervals should be a number
  if (Number.isNaN(number)) {
    const errors: string[] = [`Log Intervals should be a number -> ${aux}`]
    return {
      raw: input,
      id: 'log_intervals',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: log,
        name: 'log intervals',
        type: 'string',
        value: log,
        errors
      }],
      errors
    }
  }
  // Log Intervals should be a positive integer
  if (!Number.isInteger(number) || number < 0) {
    const errors: string[] = [`Log Intervals should be a positive integer -> ${number}`]
    return {
      raw: input,
      id: 'log_intervals',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: log,
        name: 'log intervals',
        type: 'string',
        value: log,
        errors
      }],
      errors
    }
  }
  const content = LOG_INTERVALS[log as keyof typeof LOG_INTERVALS]
  // Log Intervals should be one of the available intervals
  if (content === undefined) {
    const errors: string[] = [`Log Intervals should be one of the following: ${Object.keys(LOG_INTERVALS).join(', ')} -> ${log}`]
    return {
      raw: input,
      id: 'log_intervals',
      timestamp,
      firmware: '1.0.2',
      mode: 'command',
      payload: [{
        raw: log,
        name: 'log intervals',
        type: 'string',
        value: log,
        errors
      }],
      errors
    }
  }
  // No errors
  return {
    raw: input,
    id: 'log_intervals',
    timestamp,
    firmware: '1.0.2',
    mode: 'command',
    payload: [{
      raw: log,
      name: 'log intervals',
      type: 'string',
      value: log,
      metadata: { intervals: content }
    }],
    metadata: { log, intervals: content }
  }
}
// 15. Restart
export const parseRestartDevice = (input: string, timestamp: Timestamp): ParsedSentence => {
  if (input === RESTART_DEVICE) {
    return {
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
  }
  const errors: string[] = [`Restart device command is ${RESTART_DEVICE} -> not ${input}`]
  return {
    raw: input,
    id: 'restart_device',
    timestamp,
    firmware: '1.0.2',
    mode: 'command',
    payload: [{
      raw: input,
      name: 'restart device command',
      type: 'string',
      value: input,
      errors
    }],
    errors
  }
}
// 16. Reset
export const parseFactoryReset = (input: string, timestamp: Timestamp): ParsedSentence => {
  if (input === FACTORY_RESET) {
    return {
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
  }
  const errors: string[] = [`Factory reset command is ${RESTART_DEVICE} -> not ${input}`]
  return {
    raw: input,
    id: 'factory_reset',
    timestamp,
    firmware: '1.0.2',
    mode: 'command',
    payload: [{
      raw: input,
      name: 'factory reset command',
      type: 'string',
      value: input,
      errors
    }],
    errors
  }
}
// 17. Upgrade
export const parseUpgradeFirmware = (input: string, timestamp: Timestamp): ParsedSentence => {
  if (input === UPGRADE_FIRMWARE) {
    return {
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
  }
  const errors: string[] = [`Upgrade firmware command is ${UPGRADE_FIRMWARE} -> not ${input}`]
  return {
    raw: input,
    id: 'upgrade_firmware',
    timestamp,
    firmware: '1.0.2',
    mode: 'update',
    payload: [{
      raw: input,
      name: 'upgrade firmware command',
      type: 'string',
      value: input,
      errors
    }],
    errors
  }
}
