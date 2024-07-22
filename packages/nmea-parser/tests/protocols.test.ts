import path from 'node:path'
import { describe, test, expect } from 'vitest'
import { Protocol, StoredSentence } from '../src/types'
import { getStoreSentences, readProtocolsYAMLFile, readProtocolsYAMLString } from '../src/protocols' 
import { ProtocolSchema } from '../src/schemas'
import { PROTOCOLS } from './norsub'

const PROTOCOLS_FILE = path.join(__dirname, '..', 'protocols', 'norsub.yaml')
const EXPECTED_PROTOCOLS: Protocol[] = [
  {
    protocol: 'NORSUB8',
    standard: false,
    sentences: [
      {
        id: 'PNORSUB8',
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
          { name: 'surge_velocity', type: 'float64', units: 'm/s', },
          { name: 'sway_velocity', type: 'float64', units: 'm/s', },
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
          { name: 'status', type: 'uint32' }
        ],
      }
    ]
  },
  {
    protocol: 'GYROCOMPAS1',
    standard: false,
    sentences: [
      {
        id: 'HEHDT',
        payload: [
          { name: 'heading', type: 'float32', units: 'deg' },
          { name: 'symbol', type: 'string' },
        ]
      },
      {
        id: 'PHTRO',
        payload: [
          { name: 'pitch', type: 'float32', units: 'deg' },
          { name: 'pitch_direction', type: 'string', description: 'M bow up, P bow down' },
          { name: 'roll', type: 'float32', units: 'deg' },
          { name: 'roll_direction', type: 'string', description: 'M bow up, P bow down' },
        ]
      },
      { id: 'PHINF', payload: [ { name: 'status', type: 'string' } ] },
    ]
  }
]
const EXPECTED_STORED_SENTECES: Record<string, StoredSentence> = {
  'PNORSUB8': {
    id: EXPECTED_PROTOCOLS[0].sentences[0].id,
    protocol: {
      name: EXPECTED_PROTOCOLS[0].protocol,
      standard: EXPECTED_PROTOCOLS[0].standard,
      version: EXPECTED_PROTOCOLS[0]?.version,
    },
    payload: EXPECTED_PROTOCOLS[0].sentences[0].payload,
    description: EXPECTED_PROTOCOLS[0].sentences[0]?.description
  },
  'HEHDT': {
    id: EXPECTED_PROTOCOLS[1].sentences[0].id,
    protocol: {
      name: EXPECTED_PROTOCOLS[1].protocol,
      standard: EXPECTED_PROTOCOLS[1].standard,
      version: EXPECTED_PROTOCOLS[1]?.version,
    },
    payload: EXPECTED_PROTOCOLS[1].sentences[0].payload,
    description: EXPECTED_PROTOCOLS[1].sentences[0]?.description
  },
  'PHTRO': {
    id: EXPECTED_PROTOCOLS[1].sentences[1].id,
    protocol: {
      name: EXPECTED_PROTOCOLS[1].protocol,
      standard: EXPECTED_PROTOCOLS[1].standard,
      version: EXPECTED_PROTOCOLS[1]?.version,
    },
    payload: EXPECTED_PROTOCOLS[1].sentences[1].payload,
    description: EXPECTED_PROTOCOLS[1].sentences[1]?.description
  },
  'PHINF': {
    id: EXPECTED_PROTOCOLS[1].sentences[2].id,
    protocol: {
      name: EXPECTED_PROTOCOLS[1].protocol,
      standard: EXPECTED_PROTOCOLS[1].standard,
      version: EXPECTED_PROTOCOLS[1]?.version,
    },
    payload: EXPECTED_PROTOCOLS[1].sentences[2].payload,
    description: EXPECTED_PROTOCOLS[1].sentences[2]?.description
  },
}

describe('Protocols Files', () => {
  test('Right protocols file', () => {
    const { protocols } = readProtocolsYAMLFile(PROTOCOLS_FILE)
    protocols.forEach(protocol => {
      const parsed = ProtocolSchema.safeParse(protocol)
      if (!parsed.success) { console.error((parsed.errors as string[])[0]) }
      expect(parsed.success).toBeTruthy()
    })
    // expect(protocols).toStrictEqual(EXPECTED_PROTOCOLS)
  })
})

describe('Protocols File to StoredSentences', () => {
  test('Happy path', () => {
    const { protocols } = readProtocolsYAMLFile(PROTOCOLS_FILE)
    const sentences = getStoreSentences({ protocols })
    Object.keys(EXPECTED_STORED_SENTECES).forEach(key => {
    // sentences.forEach((value, key) => {
      const expected = EXPECTED_STORED_SENTECES[key]
      const value = sentences.get(key)
      expect(value).toEqual(expected)
    })
  })
})

describe('Protocols content to StoredSentences', () => {
  test('Happy path', () => {
    // const content = fs.readFileSync(PROTOCOLS_FILE, 'utf-8')
    const content = JSON.stringify(PROTOCOLS)
    const { protocols } = readProtocolsYAMLString(content)
    const sentences = getStoreSentences({ protocols })
    Object.keys(EXPECTED_STORED_SENTECES).forEach(key => {
    // sentences.forEach((value, key) => {
      const expected = EXPECTED_STORED_SENTECES[key]
      const value = sentences.get(key)
      expect(value).toEqual(expected)
    })
  })
})
