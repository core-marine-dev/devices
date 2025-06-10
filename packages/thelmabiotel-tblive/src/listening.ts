import { PING_END, PING_START } from './constants'
import { ParsedSentence, Timestamp } from './types'

// 03. Ping
export const parsePing = (input: string, timestamp: Timestamp): ParsedSentence => {
  const sentence: ParsedSentence = {
    raw: input,
    id: 'ping',
    timestamp,
    firmware: '1.0.2',
    mode: 'listening',
    payload: []
  }
  const sn = input.replace(PING_START, '').replace(PING_END, '').trim()
  const number = Number(sn)
  const errors: string[] = []
  if (Number.isNaN(number)) {
    errors.push('Invalid serial number -> it should be a number')
  } else if (!Number.isInteger(number) || number < 0) {
    errors.push('Invalid serial number -> it should be a positive integer')
  }
  const value = (errors.length > 0) ? sn : number

  sentence.payload.push({
    raw: sn,
    name: 'serial number',
    type: 'uint16',
    value,
    description: 'Receiver serial number',
    errors: errors.length > 0 ? errors : undefined
  })

  if (errors.length > 0) {
    sentence.errors = errors
  }
  return sentence
}
// 04. Clock Round
export const parseClockRound = (input: string, timestamp: Timestamp): ParsedSentence => {
  const ack = input.replace('\r', '').trim()
  return {
    raw: input,
    id: 'clock round',
    timestamp,
    firmware: '1.0.2',
    mode: 'listening',
    payload: [{
      raw: ack,
      name: 'clock round ack',
      type: 'string',
      value: ack
    }]
  }
}
// 05. Clock Set
export const parseClockSet = (input: string, timestamp: Timestamp): ParsedSentence => {
  const ack = input.replace('\r', '').trim()
  return {
    raw: input,
    id: 'clock set',
    timestamp,
    firmware: '1.0.2',
    mode: 'listening',
    payload: [{
      raw: ack,
      name: 'clock set ack',
      type: 'string',
      value: ack
    }]
  }
}
// 06. Listening
export const parseListening = (input: string, timestamp: Timestamp): ParsedSentence => ({
  raw: input,
  id: 'listening',
  timestamp,
  firmware: '1.0.2',
  mode: 'listening',
  payload: [{
    raw: input,
    name: 'listening command',
    type: 'string',
    value: input
  }]
})
