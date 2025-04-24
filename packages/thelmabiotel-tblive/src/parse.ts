import { API_END, API_START, CLOCK_ROUND, CLOCK_SET, COMMAND_MODE, FIRMWARE_START, FREQUENCY_LENGTH, FREQUENCY_START, LISTENING_MODE, LOG_INTERVAL_LENGTH, LOG_INTERVAL_START, PING_END, PING_LENGTH_MAX, PING_START, PROTOCOLS_LENGTH, PROTOCOLS_START, SAMPLE_END, SAMPLE_START, SERIAL_NUMBER_LENGTH_MAX, SERIAL_NUMBER_START, TIMESTAMP_START, UPDATE_MODE } from "./constants"

export const getBoundariesSample = (input: string): { start: number, end: number } => {
  const start = input.indexOf(SAMPLE_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1 }
  // const end = input.indexOf(SAMPLE_END, start + PING_LENGTH_MAX) + SAMPLE_END.length
  const endSample = input.indexOf(SAMPLE_END, start)
  if (endSample === -1) return { start, end: -1 }

  const endPing = input.indexOf(PING_END, start)
  const endClockRound = input.indexOf(CLOCK_ROUND, start)
  const endClockSet = input.indexOf(CLOCK_SET, start)
  const interferenceIndexes = [endPing, endClockRound, endClockSet].filter(value => value > -1)
  // Sample with interferences is dicard
  return (interferenceIndexes.some(value => value < endSample))
    ? { start, end: -1 }
    : { start, end: endSample + SAMPLE_END.length }
}

export const getBoundariesPing = (input: string): { start: number, end: number } => {
  const start = input.indexOf(PING_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1 }
  // Rest
  const tmp = input.indexOf(PING_END, start)
  const end = (tmp === -1 || tmp > (start + PING_LENGTH_MAX)) ? -1 : tmp + PING_END.length
  return { start, end }
}

export const getBoundariesSerialNumber = (input: string): { start: number, end: number } => {
  const start = input.indexOf(SERIAL_NUMBER_START)
  // No Sample
  if (start === -1) return { start: -1, end: -1 }
  // Rest
  const end = (input.slice(start).length <= SERIAL_NUMBER_LENGTH_MAX) ? -1 : start + PING_START.length + SERIAL_NUMBER_LENGTH_MAX
  return { start, end }
}

export const getBoundariesClockRound = (input: string): { start: number, end: number } => {
  const start = input.indexOf(CLOCK_ROUND)
  const end = start + CLOCK_ROUND.length
  return { start, end }
}

export const getBoundariesClockSet = (input: string): { start: number, end: number } => {
  const start = input.indexOf(CLOCK_SET)
  const end = start + CLOCK_SET.length
  return { start, end }
}

export const getBoundariesCommand = (input: string): { start: number, end: number } => {
  const start = input.indexOf(COMMAND_MODE)
  const end = start + COMMAND_MODE.length
  return { start, end }
}

export const getBoundariesListening = (input: string): { start: number, end: number } => {
  const start = input.indexOf(LISTENING_MODE)
  const end = start + LISTENING_MODE.length
  return { start, end }
}

export const getBoundariesUpdate = (input: string): { start: number, end: number } => {
  const start = input.indexOf(UPDATE_MODE)
  const end = start + UPDATE_MODE.length
  return { start, end }
}

export const getBoundariesAPI = (input: string): { start: number, end: number } => {
  const start = input.indexOf(API_START)
  const end = input.indexOf(API_END, start) + API_END.length
  return { start, end }
}

export const getBoundariesFirmware = (input: string): { start: number, end: number } => {
  const start = input.indexOf(FIRMWARE_START)
  const end = -1
  return { start, end }
}

export const getBoundariesFrequency = (input: string): { start: number, end: number } => {
  const start = input.indexOf(FREQUENCY_START)
  const end = start + FREQUENCY_START.length + FREQUENCY_LENGTH
  return { start, end }
}

export const getBoundariesTime = (input: string): { start: number, end: number } => {
  const start = input.indexOf(TIMESTAMP_START)
  const end = -1
  return { start, end }
}

export const getBoundariesProtocols = (input: string): { start: number, end: number } => {
  const start = input.indexOf(PROTOCOLS_START)
  const end = start + PROTOCOLS_START.length + PROTOCOLS_LENGTH
  return { start, end }
}

export const getBoundariesIntervals = (input: string): { start: number, end: number } => {
  const start = input.indexOf(LOG_INTERVAL_START)
  const end = start + LOG_INTERVAL_START.length + LOG_INTERVAL_LENGTH
  return { start, end }
}

export const getRawSentence = (input: string): { sentence: { index: number, id: string }, interference?: { index: number, id: string } } => {
  const boundaries = {
    sample: getBoundariesSample(input),
    ping: getBoundariesPing(input),
    serialNumber: getBoundariesSerialNumber(input),
    clokcRound: getBoundariesClockRound(input),
    clockSet: getBoundariesClockSet(input),
    command: getBoundariesCommand(input),
    listenning: getBoundariesListening(input),
    update: getBoundariesUpdate(input),
    api: getBoundariesAPI(input),
    firmware: getBoundariesFirmware(input),
    frequency: getBoundariesFrequency(input),
    time: getBoundariesTime(input),
    protocols: getBoundariesProtocols(input),
    intervals: getBoundariesIntervals(input)
  }
  let sentences = Object.keys(boundaries)
    .filter((sentence) => boundaries[sentence as keyof typeof boundaries].start !== -1)

  if (['ping', 'serialNumber'].every(sentence => sentences.includes(sentence))) {
    const ping = boundaries.ping
    const serialNumber = boundaries.serialNumber
    if (ping.start === serialNumber.start && ping.end !== -1) {
      sentences = sentences.filter((sentence) => sentence !== 'serialNumber')
    }
  }

  const start = { sentence: '', index: -1 }
  const end = { sentence: '', index: -1 }
  sentences.forEach((sentence) => {
    const { start: boundaryStart, end: boundaryEnd } = boundaries[sentence as keyof typeof boundaries]

    if (
      sentence === 'serialNumber' &&
      start.sentence === 'ping' &&
      boundaryStart === start.index &&
      end.sentence === 'ping' &&
      end.index !== -1
    ) { return }

    if (start.index === -1 || boundaryStart < start.index) {
      start.sentence = sentence
      start.index = boundaryStart
    }
    if (end.index === -1 || (boundaryEnd !== -1 && boundaryEnd < end.index)) {
      end.sentence = sentence
      end.index = boundaryEnd
    }
  })
  const output = { index: start.index, id: start.sentence }
  if (start.sentence === end.sentence) { return { sentence: { index: start.index, id: input.slice(start.index, end.index + 1) } } }
  const interference = { index: boundaries[end.sentence as keyof typeof boundaries].start, id: end.sentence }
  return { sentence: output, interference }
}

// export const parseSentence = ({ id, input }: { id: string, input: string }): { parsed: object, incomplete: boolean, remainder: string } => {
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
// }

// export const parseSentences = (input: string): { sentences: object[], remainder: string } => {
//   let sentences: object[] = []
//   let pivot = 0
//   let remainder = input
//   while (pivot < input.length) {
//     const { sentence: raw, interference } = getRawSentence(remainder)
//     if (interference === undefined) {
//       const { parsed, incomplete } = parseSentence(raw.)
//       if (!incomplete) {
//         sentences.push(parsed)
//         pivot = 
//       }
//     }

//   }
//   return { sentences, remainder }
// }
