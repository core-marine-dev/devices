import type { ParsedFrame } from '../../../types'
import { API_START, FACTORY_RESET, FIRMWARE_START, FREQUENCY_FRAME_LENGTH, LOG_INTERVAL_FRAME_LENGTH, PROTOCOLS_FRAME_LENGTH, RESTART_DEVICE, SERIAL_NUMBER_FRAME_LENGTH_MAX, TIMESTAMP_FRAME_LENGTH, UPGRADE_FIRMWARE, type FLAGS_COMMAND, FREQUENCY_START, LOG_INTERVAL_START, PROTOCOLS_START, SERIAL_NUMBER_START, TIMESTAMP_START, COMMAND_MODE, LISTENING_MODE } from '../../../constants'
import { parseSerialNumber } from './serial-number'
import { parseFrequency } from './frequency'
import { parseLogInterval } from './log-interval'
import { parseProtocols } from './protocol'
import { parseTimestamp } from './timestamp'
import { parseAPI } from './api'
import { parseFirmware } from './firmware'

/** COMMAND MODE
 * 01 - Serial Number -> SN=1234567
 * 02 - Firmware      -> FV=[v]X.Y.Z[.live700]
 * 03 - Frequency     -> FC=XY (63 - 77)
 * 04 - Log Interval  -> LI=XY
 * 05 - Protocols     -> LM=XY
 * 06 - Time          -> UT=<timestamp seconds>
 * 07 - Commands      -> In Command Mode... L is Luhn's verification number.
 *
 * 08 - Restart -> RR!
 * 09 - Factory reset -> FS!
 * 10 - Upgrade FW -> UF!
*/

export const serialNumber = (text: string): ParsedFrame => {
  const endIndex = SERIAL_NUMBER_FRAME_LENGTH_MAX
  const data = text.slice(0, endIndex)
  const parsed = parseSerialNumber(data)
  const remainderIndex = (parsed.error !== undefined) ? SERIAL_NUMBER_START.length : parsed.raw.length
  const remainder = text.slice(remainderIndex)
  return { frame: { ...parsed }, remainder }
}

export const firmware = (text: string): ParsedFrame => {
  const parsed = parseFirmware(text)
  const remainderIndex = (parsed.error !== undefined) ? FIRMWARE_START.length : text.indexOf(parsed.metadata?.firmware as string) + (parsed.metadata?.firmware as string).length
  const remainder = text.slice(remainderIndex)
  return { frame: { ...parsed }, remainder }
}

export const frequency = (text: string): ParsedFrame => {
  const endIndex = FREQUENCY_FRAME_LENGTH
  const data = text.slice(0, endIndex)
  const parsed = parseFrequency(data)
  const remainderIndex = (parsed.error !== undefined) ? FREQUENCY_START.length : parsed.raw.length
  const remainder = text.slice(remainderIndex)
  return { frame: { ...parsed }, remainder }
}

export const logInterval = (text: string): ParsedFrame => {
  const endIndex = LOG_INTERVAL_FRAME_LENGTH
  const data = text.slice(0, endIndex)
  const parsed = parseLogInterval(data)
  const remainderIndex = (parsed.error !== undefined) ? LOG_INTERVAL_START.length : parsed.raw.length
  const remainder = text.slice(remainderIndex)
  return { frame: { ...parsed }, remainder }
}

export const protocols = (text: string): ParsedFrame => {
  const endIndex = PROTOCOLS_FRAME_LENGTH
  const data = text.slice(0, endIndex)
  const parsed = parseProtocols(data)
  const remainderIndex = (parsed.error !== undefined) ? PROTOCOLS_START.length : parsed.raw.length
  const remainder = text.slice(remainderIndex)
  return { frame: { ...parsed }, remainder }
}

export const timestamp = (text: string): ParsedFrame => {
  const endIndex = TIMESTAMP_FRAME_LENGTH
  const data = text.slice(0, endIndex)
  const parsed = parseTimestamp(data)
  const remainderIndex = (parsed.error !== undefined) ? TIMESTAMP_START.length : parsed.raw.length
  const remainder = text.slice(remainderIndex)
  return { frame: { ...parsed }, remainder }
}

export const api = (text: string): ParsedFrame => {
  const parsed = parseAPI(text)
  const remainderIndex = (parsed.error !== undefined) ? API_START.length : parsed.raw.length
  const remainder = text.slice(remainderIndex)
  return { frame: { ...parsed }, remainder }
}

export const restart = (text: string): ParsedFrame => ({
  remainder: text.slice(RESTART_DEVICE.length),
  frame: {
    name: 'restart device',
    raw: RESTART_DEVICE
  }
})

export const factoryReset = (text: string): ParsedFrame => ({
  remainder: text.slice(FACTORY_RESET.length),
  frame: {
    name: 'factory reset',
    raw: FACTORY_RESET
  }
})

export const upgradeFirmware = (text: string): ParsedFrame => ({
  remainder: text.slice(UPGRADE_FIRMWARE.length),
  frame: {
    name: 'upgrade firmware',
    raw: UPGRADE_FIRMWARE
  }
})

export const commandModeON = (text: string): ParsedFrame => ({
  remainder: text.slice(COMMAND_MODE.length),
  frame: {
    name: 'command mode on',
    raw: COMMAND_MODE
  }
})

export const commandModeOFF = (text: string): ParsedFrame => ({
  remainder: text.slice(LISTENING_MODE.length),
  frame: {
    name: 'command mode off',
    raw: LISTENING_MODE
  }
})

export const commands = {
  'SN=': serialNumber,
  'FV=': firmware,
  'FC=': frequency,
  'LI=': logInterval,
  'LM=': protocols,
  'UT=': timestamp,
  'In Command Mode': api,
  'RR!': restart,
  'FS!': factoryReset,
  'UF!': upgradeFirmware,
  'LIVECM': commandModeON,
  'TBRC': commandModeON,
  'EX!': commandModeOFF,
}

export const parse = (input: string, flag: typeof FLAGS_COMMAND[number]): ParsedFrame => {
  if (!Object.keys(commands).includes(flag)) { return { frame: null, remainder: input } }
  return commands[flag](input)
}
