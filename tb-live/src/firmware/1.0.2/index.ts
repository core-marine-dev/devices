import type { FirmwareFrame, ListeningParsingFrame, CommandParsingFrame, ParsingFrame, Parser } from '../../types'
import { parse as listeningFrame } from './listening'
import { parse as commandFrame } from './command'
import { API_END, API_START, FLAGS_COMMAND, FLAGS_LISTENING, PING_END, PING_LENGTH_MAX, PING_START, SAMPLE_START, SERIAL_NUMBER_START } from '../../constants'

export const getFramesIndexListening = (text: string): ListeningParsingFrame | null => {
  const mode = 'listening'
  const frames = [...FLAGS_LISTENING]
    .map(flag => {
      // Flag no Ping
      if (flag !== PING_START) return { index: text.indexOf(flag), flag }
      // Check conflict between ListeningPing - CommandSerialNumber
      let index = -1
      let offset = 0
      while (offset < text.length) {
        index = text.indexOf(flag, offset)
        if (index === -1) { break }
        const subframe = text.slice(index, PING_START.length + PING_LENGTH_MAX + PING_END.length)
        // No conflict
        if (subframe.includes(PING_END)) { break }
        // Conflict
        offset = index + PING_START.length
      }
      return { index, flag }
    })
    .filter(elem => elem.index > -1)
    .sort((a, b) => {
      if (a.index < b.index) return -1
      if (a.index > b.index) return 1
      return 0
    })
  if (frames.length > 1) return { ...frames[0], last: false, mode }
  if (frames.length === 1) {
    const sampleFirstIndex = text.indexOf(SAMPLE_START)
    const sampleLastIndex = text.lastIndexOf(SAMPLE_START)
    const last = (sampleFirstIndex !== -1) ? sampleFirstIndex === sampleLastIndex : true
    return { ...frames[0], last, mode }
  }
  return null
}

export const getFramesIndexCommand = (text: string): CommandParsingFrame | null => {
  const mode = 'command'
  const apiStartIndex = text.indexOf(API_START)
  const apiEndIndex = text.indexOf(API_END, (apiStartIndex !== -1) ? apiStartIndex : 0)

  const frames = [...FLAGS_COMMAND]
    .map(flag => {
      let index = -1
      let offset = 0
      while (offset < text.length) {
        index = text.indexOf(flag, offset)
        if (index === -1) return { index: -1, flag }
        // Jump API
        if ((apiStartIndex !== -1) && (apiEndIndex !== -1) && (index > apiStartIndex) && ((index < apiEndIndex))) {
          offset = apiEndIndex + API_END.length
          continue
        }
        // No Conflict
        if (flag !== SERIAL_NUMBER_START) { break }
        // Check conflict between ListeningPing - CommandSerialNumber
        const subframe = text.slice(index, PING_START.length + PING_LENGTH_MAX + PING_END.length)
        // No conflict
        if (!subframe.includes(PING_END)) { break }
        // Conflict
        offset = index + SERIAL_NUMBER_START.length
      }
      return { index, flag }
    })
    .filter(elem => elem.index > -1)
    .sort((a, b) => {
      if (a.index < b.index) return -1
      if (a.index > b.index) return 1
      return 0
    })
  if (frames.length > 1) return { ...frames[0], last: false, mode }
  if (frames.length === 1) return { ...frames[0], last: true, mode }
  return null
}

export const getFrameToParse = (text: string): ParsingFrame | null => {
  const listening = getFramesIndexListening(text)
  const command = getFramesIndexCommand(text)
  // Just listening
  if (command === null) {
    return (listening === null) ? null : { ...listening }
  }
  // Just command
  if (listening === null) return { ...command }
  // Listening before
  if (listening.index < command.index) return { ...listening, last: false }
  // Command before
  // If firmware change -> last frame
  // if (command.flag === FIRMWARE_START) return { ...command, last: true }
  // Regular command
  return { ...command, last: false }
}

export const parser: Parser = (input: string) => {
  let nonparsed = input
  const frames: FirmwareFrame[] = []
  let firmwareChange = false
  while (nonparsed.length > 0) {
    const frameToParse = getFrameToParse(nonparsed)
    if (frameToParse === null) {
      nonparsed = ''
      break
    }
    const { index, flag, last, mode } = frameToParse
    nonparsed = nonparsed.slice(index)

    const { frame, remainder } = (mode === 'listening')
      ? listeningFrame(nonparsed, flag as typeof FLAGS_LISTENING[number])
      : commandFrame(nonparsed, flag as typeof FLAGS_COMMAND[number])
    
    nonparsed = remainder
    if (frame !== null) {
      frames.push({ ...frame, firmware: '1.0.2', mode })
      if (mode === 'command' && frame.name === 'firmware') {
        firmwareChange = true
        break
    }
    }
    if (last) {
      break
    }
  }
  return { frames, nonparsed, firmwareChange }
}
