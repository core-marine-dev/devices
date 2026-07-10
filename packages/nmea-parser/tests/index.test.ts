import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { NMEAParser as Parser } from '../src'
import { NMEALikeSchema } from '../src/schemas'
import { createFakeSentence } from '../src/sentences'
import type { Talker } from '../src/types'

const NORSUB_FILE = path.join(__dirname, '..', 'protocols', 'norsub.yaml')
const NORSUB_YAML = fs.readFileSync(NORSUB_FILE, 'utf-8')

const NORSUB_SENTENCE_IDS = [
  'AAM', 'GGA',
  'HEHDT', 'PHTRO', 'PHINF',
  'PNORSUB', 'PNORSUB2', 'PNORSUB6', 'PNORSUB7', 'PNORSUB7b', 'PNORSUB8', 'PRDID',
  'PTVG', 'PSMCA', 'PSMCC',
]
const NORSUB_PROTOCOL_NAMES = [
  'NMEA',
  'GYROCOMPAS1', 'Tokimek PTVG', 'RDI ADCP', 'SMCA', 'SMCC',
  'NORSUB', 'NORSUB2', 'NORSUB6', 'NORSUB7', 'NORSUB7b', 'NORSUB8',
]

const hasId = (parser: Parser, id: string): boolean => parser.getSentences().some((sentence) => sentence.id === id)

describe('Parser', () => {
  test('Default constructor loads the built-in NMEA standard', () => {
    const parser = new Parser()
    expect(['AAM', 'GGA'].every((id) => hasId(parser, id))).toBeTruthy()
    expect('NMEA' in parser.getSentencesByProtocol()).toBeTruthy()
  })

  test('addSentences loads a protocols YAML string', () => {
    const parser = new Parser()
    parser.addSentences(NORSUB_YAML)
    expect(NORSUB_SENTENCE_IDS.every((id) => hasId(parser, id))).toBeTruthy()
    const protocols = parser.getSentencesByProtocol()
    NORSUB_PROTOCOL_NAMES.forEach((name) => expect(name in protocols).toBeTruthy())
  })

  test('addSentences throws on invalid content', () => {
    const parser = new Parser()
    expect(() => parser.addSentences('')).toThrow()
    expect(() => parser.addSentences('foo: bar')).toThrow()
  })

  test('Parsing NMEA + NorSub sentences', () => {
    const parser = new Parser()
    parser.addSentences(NORSUB_YAML)
    const stored = parser.getSentences()
    const input = stored.reduce((acc, curr) => acc + createFakeSentence(curr), '')
    expect(parser.parseData(input)).toHaveLength(stored.length)
  })

  test('Uncompleted sentences WITHOUT memory', () => {
    const parser = new Parser({ memory: false })
    const stored = parser.getSentences()
    const input1 = createFakeSentence(stored.filter((s) => s.id === 'AAM')[0])
    const halfInput1 = input1.slice(0, 10)
    const halfInput2 = input1.slice(10)
    const input2 = createFakeSentence(stored.filter((s) => s.id === 'GGA')[0]);
    [
      halfInput1 + input2,
      halfInput1 + halfInput1 + input2,
      input2 + halfInput2,
      input2 + halfInput2 + halfInput2,
      'asdfasfaf' + input2 + 'lakjs',
    ].forEach((input) => expect(parser.parseData(input)).toHaveLength(1))
  })

  test('Uncompleted sentences WITH memory', () => {
    const parser = new Parser({ memory: true })
    const stored = parser.getSentences()
    const input1 = createFakeSentence(stored.filter((s) => s.id === 'AAM')[0])
    const halfInput1 = input1.slice(0, 10)
    const halfInput2 = input1.slice(10)
    const input2 = createFakeSentence(stored.filter((s) => s.id === 'GGA')[0]);
    [
      halfInput1 + input2,
      halfInput1 + halfInput1 + input2,
      input2 + halfInput2,
      input2 + halfInput2 + halfInput2,
      'asdfasfaf' + input2 + 'lakjs',
    ].forEach((input) => expect(parser.parseData(input)).toHaveLength(1))
    // Split across two feeds — memory reassembles the sentence
    parser.parseData(halfInput1)
    expect(parser.parseData(halfInput2)).toHaveLength(1)
  })

  test('Unknown sentences', () => {
    const parser = new Parser({ memory: false })
    const stored = parser.getSentences()
    const aam = createFakeSentence(stored.filter((s) => s.id === 'AAM')[0], 'XXX')
    const gga = createFakeSentence(stored.filter((s) => s.id === 'GGA')[0], 'YYY');
    [aam, gga].forEach((input) => {
      const output = parser.parseData(input)
      expect(output).toHaveLength(1)
      expect(output[0].protocol).toEqual({ name: 'NMEA', version: 'unknown' })
    })
  })

  test('getSentence info + talker', () => {
    const parser = new Parser()
    expect(parser.getSentence('AAM')?.protocol.name).toBe('NMEA')
    expect(parser.getSentence('AAM')?.protocol.standard).toBeTruthy()
    expect(parser.getSentence('AAM')?.talker).toBeUndefined()
    expect(parser.getSentence('GPAAM')?.talker?.value).toBe('GP')
    expect(parser.getSentence('U8AAM')?.talker?.value).toBe('U8')
    expect(parser.getSentence('PdfgsdfAAM')).toBeNull()
    expect(parser.getSentence('XXAAM')).toBeNull()
  })

  test('Generate + parse fake sentences without talkers', () => {
    const parser = new Parser({ memory: false })
    parser.getSentences().forEach((sentence) => {
      const fake = parser.getFakeSentenceByID(sentence.id)
      expect(fake).not.toBeNull()
      expect(NMEALikeSchema.is(fake)).toBeTruthy()
      const parsed = parser.parseData(fake as string)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].id).toBe(sentence.id)
    })
  })

  test('Generate + parse fake sentences with talkers', () => {
    const parser = new Parser({ memory: false })
    parser.getSentences().forEach((sentence) => {
      const talker = 'GP'
      const fake = parser.getFakeSentenceByID(talker + sentence.id)
      expect(fake).not.toBeNull()
      expect(NMEALikeSchema.is(fake)).toBeTruthy()
      expect((fake as string).startsWith(talker, 1)).toBeTruthy()
      const parsed = parser.parseData(fake as string)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].id).toBe(sentence.id)
      expect((parsed[0].metadata?.talker as Talker).value).toBe(talker)
    })
  })

  test('Fake sentence for unknown id is null', () => {
    const parser = new Parser();
    ['XXX', 'YYY'].forEach((id) => expect(parser.getFakeSentenceByID(id)).toBeNull())
  })
})

test('GGA sentence -> CMA', () => {
  const sample = '$INGGA,132247.95,7118.690092,N,02215.039776,E,2,12,0.8,66.48,M,26.96,M,20.0,1006*56\r\n'
  const parser = new Parser()
  const output = parser.parseData(sample)
  expect(output).toHaveLength(1)
  const gga = output[0]
  expect(gga.id).toBe('GGA')
  expect(gga.protocol).toEqual({ name: 'NMEA', version: '3.1' })
  expect(gga.metadata?.standard).toBe(true)
  expect((gga.metadata?.talker as Talker).value).toBe('IN')
  expect(gga.payload).toHaveLength(14)
  // A few decoded field values
  expect(gga.payload.find((f) => f.name === 'satellites')?.value).toBe(12)
  expect(gga.payload.find((f) => f.name === 'gps_quality')?.value).toBe(2)
  expect(gga.payload.find((f) => f.name === 'utc_position')?.value).toBe('132247.95')
})
