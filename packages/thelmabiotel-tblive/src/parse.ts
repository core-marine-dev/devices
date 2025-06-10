import { parseAPI, parseCommand, parseFactoryReset, parseFirmware, parseFrequency, parseLogIntervals, parseProtocols, parseRestartDevice, parseSerialNumber, parseTime, parseUpgradeFirmware } from './command'
import { API_END, API_START, API_TYPICAL_CONTENT_101, API_TYPICAL_CONTENT_102, CLOCK_ROUND, CLOCK_SET, COMMAND_MODE_101, COMMAND_MODE_102, FACTORY_RESET, FIRMWARE_START, FREQUENCY_LENGTH, FREQUENCY_START, LISTENING_MODE, LOG_INTERVAL_LENGTH, LOG_INTERVAL_START, PING_END, PING_LENGTH_MAX, PING_START, PROTOCOLS_LENGTH, PROTOCOLS_START, RESTART_DEVICE, SAMPLE_END, SAMPLE_START, SERIAL_NUMBER_LENGTH_MAX, SERIAL_NUMBER_LENGTH_MIN, SERIAL_NUMBER_START, TIMESTAMP_START, UPGRADE_MODE } from './constants'
import { parseClockRound, parseClockSet, parseListening, parsePing } from './listening'
import { parseSample } from './sample'
import { ParsedSentence, SentenceName, Timestamp } from './types'

export const getBoundariesSample = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(SAMPLE_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // const end = input.indexOf(SAMPLE_END, start + PING_LENGTH_MAX) + SAMPLE_END.length
  const endSample = input.indexOf(SAMPLE_END, start)
  if (endSample === -1) return { start, end: -1, incomplete: true }

  const endPing = input.indexOf(PING_END, start)
  const endClockRound = input.indexOf(CLOCK_ROUND, start)
  const endClockSet = input.indexOf(CLOCK_SET, start)
  const interferenceIndexes = [endPing, endClockRound, endClockSet].filter(value => value > -1)
  // Sample with interferences is discard
  if (interferenceIndexes.some(value => value < endSample)) return { start, end: -1, incomplete: true }
  // Boundaries
  const end = endSample + SAMPLE_END.length
  return { start, end, incomplete: false }
}

export const getBoundariesPing = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(PING_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Rest
  const tmp = input.indexOf(PING_END, start)
  // Incomplete Sample
  if (tmp === -1) return { start, end: -1, incomplete: true }
  // No Sample
  if (tmp > (start + PING_LENGTH_MAX)) return { start, end: -1, incomplete: false }
  // Boundaries
  const end = tmp + PING_END.length
  return { start, end, incomplete: false }
}

export const getBoundariesClockRound = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(CLOCK_ROUND)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Sample
  return { start, end: start + CLOCK_ROUND.length, incomplete: false }
}

export const getBoundariesClockSet = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(CLOCK_SET)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Sample
  return { start, end: start + CLOCK_SET.length, incomplete: false }
}

export const getBoundariesListening = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(LISTENING_MODE)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Sample
  return { start, end: start + LISTENING_MODE.length, incomplete: false }
}

export const getBoundariesCommand = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start101 = input.indexOf(COMMAND_MODE_101)
  const start102 = input.indexOf(COMMAND_MODE_102)
  const start = [start101, start102].filter(value => value > -1).reduce((a, b) => Math.min(a, b), Infinity)
  // No Sample
  if (!Number.isFinite(start)) return { start: -1, end: -1, incomplete: false }
  // Sample
  const FLAG = (start === start101) ? COMMAND_MODE_101 : COMMAND_MODE_102
  return { start, end: start + FLAG.length, incomplete: false }
}

export const getBoundariesAPI = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(API_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  const end = input.indexOf(API_END, start)
  // Not end
  if (end === -1) {
    // No sample
    if (Math.max(API_TYPICAL_CONTENT_101.length, API_TYPICAL_CONTENT_102.length) < input.slice(start).length) {
      return { start, end: -1, incomplete: false }
    }
    // Incomplete
    return { start, end: -1, incomplete: true }
  }
  // Sample
  return { start, end: end + API_END.length, incomplete: false }
}

export const getBoundariesSerialNumber = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(SERIAL_NUMBER_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Incomplete
  const tmp = input.slice(start + SERIAL_NUMBER_START.length)
  if (tmp.length < SERIAL_NUMBER_LENGTH_MIN) { return { start, end: -1, incomplete: true } }
  let sn = ''
  for (const char of tmp) {
    if (Number.isNaN(Number(char))) { break }
    if (sn.length >= SERIAL_NUMBER_LENGTH_MAX) { break }
    sn += char
  }
  if (sn.length < SERIAL_NUMBER_LENGTH_MIN) { return { start, end: -1, incomplete: true } }
  // Rest
  return { start, end: start + SERIAL_NUMBER_START.length + sn.length, incomplete: false }
}

export const getBoundariesFirmware = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(FIRMWARE_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Major
  const majorIndex = input.indexOf('.', start)
  if (majorIndex === -1) return { start, end: -1, incomplete: true }
  // Minor
  const minorIndex = input.indexOf('.', majorIndex + 1)
  if (minorIndex === -1) return { start, end: -1, incomplete: true }
  // Patch
  let end = 0
  for (const char of input.slice(minorIndex + 1)) {
    if (Number.isNaN(Number(char))) { break }
    end++
  }
  // If no end found = no patch, return incomplete
  if (end === 0) return { start, end: -1, incomplete: true }
  // Invalid patch
  if (end > 2) return { start, end: -1, incomplete: false }
  // Sample
  return { start, end: minorIndex + 1 + end, incomplete: false }
}

export const getBoundariesFrequency = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(FREQUENCY_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Incomplete
  if (input.slice(start).length < FREQUENCY_START.length + FREQUENCY_LENGTH) { return { start, end: -1, incomplete: true } }
  // Sample
  return { start, end: start + FREQUENCY_START.length + FREQUENCY_LENGTH, incomplete: false }
}

export const getBoundariesTime = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(TIMESTAMP_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  const MAX_LENGTH = TIMESTAMP_START.length + Math.trunc(Date.now() / 1000).toString().length
  // Incomplete
  if (input.slice(start).length < TIMESTAMP_START.length + 1) { return { start, end: -1, incomplete: true } }
  // Check end
  let seconds = ''
  for (const char of input.slice(start + TIMESTAMP_START.length, start + TIMESTAMP_START.length + MAX_LENGTH)) {
    if (Number.isNaN(Number(char))) { break }
    seconds += char
  }
  // No sample
  if (seconds.length === 0) { return { start, end: -1, incomplete: false } }
  // Sample
  return { start, end: start + TIMESTAMP_START.length + seconds.length, incomplete: false }
}

export const getBoundariesProtocols = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(PROTOCOLS_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Incomplete
  if (input.slice(start).length < PROTOCOLS_START.length + PROTOCOLS_LENGTH) { return { start, end: -1, incomplete: true } }
  // Sample
  return { start, end: start + PROTOCOLS_START.length + PROTOCOLS_LENGTH, incomplete: false }
}

export const getBoundariesIntervals = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(LOG_INTERVAL_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Incomplete
  if (input.slice(start).length < LOG_INTERVAL_START.length + LOG_INTERVAL_LENGTH) { return { start, end: -1, incomplete: true } }
  // Sample
  return { start, end: start + LOG_INTERVAL_START.length + LOG_INTERVAL_LENGTH, incomplete: false }
}

export const getBoundariesRestartDevice = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(RESTART_DEVICE)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Sample
  return { start, end: start + RESTART_DEVICE.length, incomplete: false }
}

export const getBoundariesFactoryReset = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(FACTORY_RESET)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Sample
  return { start, end: start + FACTORY_RESET.length, incomplete: false }
}

export const getBoundariesUpgradeFirmware = (input: string): { start: number, end: number, incomplete: boolean } => {
  const start = input.indexOf(UPGRADE_MODE)
  // No Sample
  if (start === -1) return { start: -1, end: -1, incomplete: false }
  // Sample
  return { start, end: start + UPGRADE_MODE.length, incomplete: false }
}

const bounders: Record<SentenceName, (input: string) => { start: number, end: number, incomplete: boolean }> = {
  sample: getBoundariesSample,
  ping: getBoundariesPing,
  clockRound: getBoundariesClockRound,
  clockSet: getBoundariesClockSet,
  listening: getBoundariesListening,
  command: getBoundariesCommand,
  api: getBoundariesAPI,
  serialNumber: getBoundariesSerialNumber,
  firmware: getBoundariesFirmware,
  frequency: getBoundariesFrequency,
  time: getBoundariesTime,
  protocols: getBoundariesProtocols,
  intervals: getBoundariesIntervals,
  restart: getBoundariesRestartDevice,
  reset: getBoundariesFactoryReset,
  upgrade: getBoundariesUpgradeFirmware
}

export const getRawSentence = (input: string): { sentence: { start: number, end: number, incomplete: boolean, id: SentenceName }, interference?: { start: number, end: number, incomplete: boolean, id: SentenceName } } => {
  // @ts-expect-error
  const boundaries: Record<SentenceName, { start: number, end: number, incomplete: boolean }> = {}
  for (const [key, bounder] of Object.entries(bounders)) {
    boundaries[key as SentenceName] = bounder(input)
  }
  // Filter sentences that are not found
  let sentences = Object.keys(boundaries)
    .filter((sentence) => boundaries[sentence as keyof typeof boundaries].start !== -1)
  // Discard 'ping' or 'serialNumber'
  if (['ping', 'serialNumber'].every(sentence => sentences.includes(sentence))) {
    const ping = boundaries.ping
    const serialNumber = boundaries.serialNumber
    if (ping.start === serialNumber.start) {
      const key = (ping.incomplete) ? 'ping' : 'serialNumber'
      sentences = sentences.filter((sentence) => sentence !== key)
    }
  }
  // Discard sentences inside API
  if (sentences.includes('api')) {
    const api = boundaries.api
    sentences = sentences.filter((sentence) => {
      // Not colision
      if (!['listening', 'command', 'frequency', 'protocols', 'intervals', 'time', 'restart', 'reset', 'upgrade'].includes(sentence)) { return true }
      // colision
      const interference = boundaries[sentence as keyof typeof boundaries]
      // API incomplete === last sentence
      if (api.incomplete && (api.start < interference.start)) { return false }
      // No api
      if (api.end === -1 && (api.start < interference.start)) { return false }
      // Before API
      if (interference.end < api.start) { return true }
      // After API
      if (interference.start > api.end) { return true }
      // In between API
      return false
    })
  }

  const start: { sentence: SentenceName, index: number, incomplete: boolean } = { sentence: '' as SentenceName, index: -1, incomplete: true }
  const end: { sentence: SentenceName, index: number } = { sentence: '' as SentenceName, index: -1 }
  sentences.forEach((sentence) => {
    const { start: boundaryStart, end: boundaryEnd, incomplete: boundaryIncomplete } = boundaries[sentence as keyof typeof boundaries]
    // If the sentence is serialNumber and it starts with ping, we skip it
    if (
      sentence === 'serialNumber' &&
      start.sentence === 'ping' &&
      boundaryStart === start.index &&
      end.sentence === 'ping' &&
      end.index !== -1
    ) { return }
    // Mark as first sentence if it is the first one found and it is not incomplete
    if (start.index === -1 || (boundaryStart < start.index && !boundaryIncomplete)) {
      start.sentence = sentence as SentenceName
      start.index = boundaryStart
      start.incomplete = boundaryIncomplete
    }
    // Mark as last sentence
    if (end.index === -1 || (boundaryEnd !== -1 && boundaryEnd < end.index && !boundaryIncomplete)) {
      end.sentence = sentence as SentenceName
      end.index = boundaryEnd
    }
  })
  const sentence = { start: start.index, end: end.index, incomplete: start.incomplete, id: start.sentence }
  if (start.sentence === end.sentence) { return { sentence } }
  const interference = { start: boundaries[end.sentence].start, end: boundaries[end.sentence].end, incomplete: boundaries[end.sentence].incomplete, id: end.sentence }
  return { sentence, interference }
}

const parsers: Record<SentenceName, (input: string, timestamp: Timestamp) => ParsedSentence> = {
  sample: parseSample,
  ping: parsePing, // parsePing,
  clockRound: parseClockRound, // parseClockRound,
  clockSet: parseClockSet, // parseClockSet,
  listening: parseListening, // parseListening,
  command: parseCommand, // parseCommand,
  api: parseAPI, // parseAPI,
  serialNumber: parseSerialNumber, // parseSerialNumber,
  firmware: parseFirmware, // parseFirmware,
  frequency: parseFrequency, // parseFrequency,
  time: parseTime, // parseTime,
  protocols: parseProtocols, // parseProtocols,
  intervals: parseLogIntervals, // parseIntervals
  restart: parseRestartDevice, // parseRestart,
  reset: parseFactoryReset, // parseReset,
  upgrade: parseUpgradeFirmware // parseUpdate,
}

export const parseSentence = ({ id, input }: { id: SentenceName, input: string }): ParsedSentence => {
  const timestamp = Date.now()
  // Known sentence
  // 01. Sample - Emitter
  // 02. Sample - Receiver
  // 03. Ping
  // 04. Clock Round
  // 05. Clock Set
  // 06. Listening
  // 07. Command
  // 08. API
  // 09. SerialNumber
  // 10. Firmware
  // 11. Frequency
  // 12. Time
  // 13. Protocols
  // 14. Log Intervals
  // 15. Reboot
  // 16. Reset
  // 17. Upgrade
  if (id in parsers) { return parsers[id](input, timestamp) }
  // Unknown sentence
  return {
    timestamp,
    raw: input,
    id,
    mode: 'unknown',
    firmware: 'unknown',
    payload: [],
    errors: [`Unknown sentence '${id}'`]
  }
}

export const parseSentences = (input: string): { sentences: ParsedSentence[], remainder: string } => {
  const sentences: ParsedSentence[] = []
  let pivot = 0
  let remainder = input
  while (remainder.length > 0) {
    remainder = remainder.slice(pivot)
    const { sentence: raw, interference } = getRawSentence(remainder)
    // Jump to interference
    if (interference !== undefined && !interference.incomplete) {
      pivot = interference.start
      continue
    }
    // No sentence
    if (raw.id.length === 0) {
      pivot = remainder.length
      break
    }
    // Incomplete sentence
    if (raw.incomplete) { break }
    // Parse sentence
    const data = remainder.slice(raw.start, raw.end)
    const parsed = parseSentence({ id: raw.id, input: data })
    // Add parsed sentence
    sentences.push(parsed)
    pivot = raw.end
  }
  return { sentences, remainder }
}
