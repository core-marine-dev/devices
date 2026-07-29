import fs from 'node:fs'
import path from 'node:path'

import { describe, test, expect } from 'vitest'

import { getStoredSentences, parseProtocols } from '../src/protocols'
import { ProtocolSchema } from '../src/schemas'
import { Protocol, StoredSentence } from '../src/types'

const PROTOCOLS_FILE = path.join(__dirname, '..', 'protocols', 'norsub.yml')
const readNorsub = (): string => fs.readFileSync(PROTOCOLS_FILE, 'utf-8')

const EXPECTED_STORED: Record<string, StoredSentence> = {
  PNORSUB8: {
    id: 'PNORSUB8',
    protocol: { name: 'NORSUB8', standard: false, version: '1.2.0' },
    description: 'The whole regular attitude information from the MRU',
    payload: [
      { name: 'time', type: 'uint32', units: 'us' },
      { name: 'delay', type: 'uint32', units: 'us' },
      { name: 'roll', type: 'float64', units: 'deg' },
      { name: 'pitch', type: 'float64', units: 'deg' },
      { name: 'heading', type: 'float64', units: 'deg', description: 'From 0 to 360' },
      { name: 'surge', type: 'float64', units: 'm' },
      { name: 'sway', type: 'float64', units: 'm' },
      { name: 'heave', type: 'float64', units: 'm', description: 'z-down' },
      { name: 'roll_rate', type: 'float64', units: 'deg/s' },
      { name: 'pitch_rate', type: 'float64', units: 'deg/s' },
      { name: 'yaw_rate', type: 'float64', units: 'deg/s' },
      { name: 'surge_velocity', type: 'float64', units: 'm/s' },
      { name: 'sway_velocity', type: 'float64', units: 'm/s' },
      { name: 'heave_velocity', type: 'float64', units: 'm/s', description: 'z-down' },
      { name: 'acceleration_x', type: 'float64', units: 'm/s2' },
      { name: 'acceleration_y', type: 'float64', units: 'm/s2' },
      { name: 'acceleration_z', type: 'float64', units: 'm/s2' },
      { name: 'period_x', type: 'float64', units: 's' },
      { name: 'period_y', type: 'float64', units: 's' },
      { name: 'period_z', type: 'float64', units: 's' },
      { name: 'amplitude_x', type: 'float64', units: 'm' },
      { name: 'amplitude_y', type: 'float64', units: 'm' },
      { name: 'amplitude_z', type: 'float64', units: 'm' },
      { name: 'status', type: 'uint32' },
    ],
  },
  HEHDT: {
    id: 'HEHDT',
    protocol: { name: 'GYROCOMPAS1', standard: false, version: '1.2.0' },
    description: undefined,
    payload: [
      { name: 'heading', type: 'float64', units: 'deg' },
      { name: 'symbol', type: 'string' },
    ],
  },
}

describe('parseProtocols', () => {
  test('validates every protocol in the file', () => {
    const result = parseProtocols(readNorsub())
    expect(result.success).toBeTruthy()
    if (!result.success) return
    result.value.protocols.forEach((protocol: Protocol) => {
      expect(ProtocolSchema.safeParse(protocol).success).toBeTruthy()
    })
  })

  test('returns a Result error on invalid content (never throws)', () => {
    expect(parseProtocols('').success).toBe(false)
    expect(parseProtocols('foo: bar').success).toBe(false)
    // malformed YAML -> invalid-yaml; valid YAML but wrong shape -> invalid-schema
    const malformed = parseProtocols('foo: [')
    expect(malformed.success).toBe(false)
    if (!malformed.success) expect(malformed.error.kind).toBe('invalid-yaml')
    const wrongShape = parseProtocols('foo: bar')
    if (!wrongShape.success) expect(wrongShape.error.kind).toBe('invalid-schema')
  })
})

describe('getStoredSentences', () => {
  test('builds a multi-definition knowledge base keyed by id', () => {
    const result = parseProtocols(readNorsub())
    expect(result.success).toBeTruthy()
    if (!result.success) return
    const store = getStoredSentences(result.value)
    Object.keys(EXPECTED_STORED).forEach((key) => {
      const definitions = store.get(key)
      expect(Array.isArray(definitions)).toBeTruthy()
      expect(definitions).toHaveLength(1)
      expect(definitions?.[0]).toEqual(EXPECTED_STORED[key])
    })
  })
})
