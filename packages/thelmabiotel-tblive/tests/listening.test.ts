import { describe, expect, test } from 'vitest'
import { PING_END, PING_START } from '../src/constants'
import { parseClockRound, parseClockSet, parseListening, parsePing } from '../src/listening'
import type { Timestamp, RParsedSentence } from '../src/types'

const timestamp: Timestamp = Date.now()

describe('parsePing', () => {
  test('happy path - valid serial number', () => {
    const input = `${PING_START}123456 ${PING_END}`
    const result = parsePing(input, timestamp)
    const expected: RParsedSentence = {
      raw: input,
      id: 'ping',
      firmware: '1.0.2',
      mode: 'listening',
      timestamp,
      payload: [{
        raw: '123456',
        name: 'serial number',
        type: 'uint16',
        value: 123456,
        description: 'Receiver serial number'
      }],
    }

    expect(result).toEqual(expected)
  })

  test('invalid serial number - not a number', () => {
    const input = `${PING_START}12345a${PING_END}`
    const result = parsePing(input, timestamp)
    const expected: RParsedSentence = {
      raw: input,
      id: 'ping',
      firmware: '1.0.2',
      mode: 'listening',
      timestamp,
      payload: [
        {
          raw: '12345a',
          name: 'serial number',
          type: 'uint16',
          value: '12345a',
          description: 'Receiver serial number',
          errors: ['Invalid serial number -> it should be a number'],
        },
      ],
      errors: ['Invalid serial number -> it should be a number']
    }

    expect(result).toEqual(expected)
  })

  test('invalid serial number - negative number', () => {
    const input = `${PING_START}-123456${PING_END}`
    const result = parsePing(input, timestamp)
    const expected: RParsedSentence = {
      raw: input,
      id: 'ping',
      firmware: '1.0.2',
      mode: 'listening',
      timestamp,
      payload: [
        {
          raw: '-123456',
          name: 'serial number',
          type: 'uint16',
          value: '-123456',
          description: 'Receiver serial number',
          errors: ['Invalid serial number -> it should be a positive integer'],
        },
      ],
      errors: ['Invalid serial number -> it should be a positive integer']
    }

    expect(result).toEqual(expected)
  })
})

describe('parseClockRound', () => {
  test('happy path', () => {
    const input = 'ack01\r'
    const result = parseClockRound(input, timestamp)
    const expected: RParsedSentence = {
      raw: input,
      id: 'clock round',
      firmware: '1.0.2',
      mode: 'listening',
      timestamp,
      payload: [{
        raw: 'ack01',
        name: 'clock round ack',
        type: 'string',
        value: 'ack01'
      }],
    }

    expect(result).toEqual(expected)
  })
})

describe('parseClockSet', () => {
  test('happy path', () => {
    const input = 'ack02\r'
    const result = parseClockSet(input, timestamp)
    const expected: RParsedSentence = {
      raw: input,
      id: 'clock set',
      firmware: '1.0.2',
      mode: 'listening',
      timestamp,
      payload: [{
        raw: 'ack02',
        name: 'clock set ack',
        type: 'string',
        value: 'ack02'
      }],
    }

    expect(result).toEqual(expected)
  })
})

describe('parseListening', () => {
  test('happy path', () => {
    const input = 'EX!'
    const result = parseListening(input, timestamp)
    const expected: RParsedSentence = {
      raw: input,
      id: 'listening',
      firmware: '1.0.2',
      mode: 'listening',
      timestamp,
      payload: [{
        raw: input,
        name: 'listening command',
        type: 'string',
        value: input
      }],
    }
    expect(result).toEqual(expected)
  })
})
