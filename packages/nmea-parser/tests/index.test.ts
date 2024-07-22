import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { NMEAParser as Parser } from '../src'
import { readProtocolsYAMLFile } from '../src/protocols'
import { NMEALikeSchema, } from '../src/schemas'
import { createFakeSentence } from '../src/sentences'
import type { Protocol } from '../src/types'

const NORSUB_FILE = path.join(__dirname, '..', 'protocols', 'norsub.yaml')

describe('Parser', () => {
  test('Default constructor', () => {
    const parser = new Parser()
    // Sentence
    const parserSentences = parser.getSentences()
    expect(
      ['AAM', 'GGA'].some(id => parserSentences.filter(sentence => sentence.id === id).length > 0)
    ).toBeTruthy()
    // Sentences by Protocol
    const parserProtocols = parser.getSentencesByProtocol()
    expect('NMEA' in parserProtocols).toBeTruthy()

  })

  test('Add protocols with file', () => {
    const parser = new Parser()
    // Add file
    const file = NORSUB_FILE
    parser.addProtocols({ file })
    // Sentences
    const parserSentences = parser.getSentences()
    const expectedSentences = [
      'AAM', 'GGA',
      'HEHDT', 'PHTRO', 'PHINF',
      'PNORSUB', 'PNORSUB2', 'PNORSUB6', 'PNORSUB7', 'PNORSUB7b', 'PNORSUB8', 'PRDID',
      'PTVG', 'PRDID', 'PSMCA', 'PSMCC',
    ]
    expect(expectedSentences.every(id => parserSentences.filter(sentence => sentence.id === id).length > 0)).toBeTruthy()
    // Check protocols
    const parserProtocols = parser.getSentencesByProtocol()
    const expectedProtocols = [
      'NMEA',
      'GYROCOMPAS1', 'Tokimek PTVG', 'RDI ADCP', 'SMCA', 'SMCC',
      'NORSUB', 'NORSUB2', 'NORSUB6', 'NORSUB7', 'NORSUB7b', 'NORSUB8', //'NORSUB PRDID',
    ]
    expectedProtocols.forEach(protocol => expect(protocol in parserProtocols).toBeTruthy())
  })

  test('Add protocols with content', () => {
    const parser = new Parser()
    // Add file content
    const content = fs.readFileSync(NORSUB_FILE, 'utf-8')
    parser.addProtocols({ content })
    // Sentences
    const parserSentences = parser.getSentences()
    const expectedSentences = [
      'AAM', 'GGA',
      'HEHDT', 'PHTRO', 'PHINF',
      'PNORSUB', 'PNORSUB2', 'PNORSUB6', 'PNORSUB7', 'PNORSUB7b', 'PNORSUB8', 'PRDID',
      'PTVG', 'PRDID', 'PSMCA', 'PSMCC',
    ]
    expect(expectedSentences.every(id => parserSentences.filter(sentence => sentence.id === id).length > 0)).toBeTruthy()
    // Check protocols
    const parserProtocols = parser.getSentencesByProtocol()
    const expectedProtocols = [
      'NMEA',
      'GYROCOMPAS1', 'Tokimek PTVG', 'RDI ADCP', 'SMCA', 'SMCC',
      'NORSUB', 'NORSUB2', 'NORSUB6', 'NORSUB7', 'NORSUB7b', 'NORSUB8', //'NORSUB PRDID',
    ]
    expectedProtocols.forEach(protocol => expect(protocol in parserProtocols).toBeTruthy())
  })

  test('Add protocols with protocols', () => {
    const parser = new Parser()
    // Add file object
    const { protocols } = readProtocolsYAMLFile(NORSUB_FILE)
    parser.addProtocols({ protocols })
    // Sentences
    const parserSentences = parser.getSentences()
    const expectedSentences = [
      'AAM', 'GGA',
      'HEHDT', 'PHTRO', 'PHINF',
      'PNORSUB', 'PNORSUB2', 'PNORSUB6', 'PNORSUB7', 'PNORSUB7b', 'PNORSUB8', 'PRDID',
      'PTVG', 'PRDID', 'PSMCA', 'PSMCC',
    ]
    expect(expectedSentences.every(id => parserSentences.filter(sentence => sentence.id === id).length > 0)).toBeTruthy()
    // Check protocols
    const parserProtocols = parser.getSentencesByProtocol()
    const expectedProtocols = [
      'NMEA',
      'GYROCOMPAS1', 'Tokimek PTVG', 'RDI ADCP', 'SMCA', 'SMCC',
      'NORSUB', 'NORSUB2', 'NORSUB6', 'NORSUB7', 'NORSUB7b', 'NORSUB8', //'NORSUB PRDID',
    ]
    expectedProtocols.forEach(protocol => expect(protocol in parserProtocols).toBeTruthy())
  })

  test('Add protocols error', () => {
    const parser = new Parser()
    expect(() => parser.addProtocols({})).toThrow()
    expect(() => parser.addProtocols({ file: '' })).toThrow()
    expect(() => parser.addProtocols({ content: '' })).toThrow()
    expect(() => parser.addProtocols({ protocols: {} as Protocol[] })).toThrow()
  })

  test('Parsing NMEA + NorSub sentences', () => {
    const parser = new Parser()
    parser.addProtocols({ file: NORSUB_FILE })
    const storedSentences = parser.getSentences()
    const fakeinput = storedSentences.reduce((acc, curr) => acc += createFakeSentence(curr), '')
    const output = parser.parseData(fakeinput)
    expect(output.length).toBe(storedSentences.length)
  })

  test('Uncompleted frames WITHOUT memory', () => {
    const parser = new Parser()
    const storedSentences = parser.getSentences()
    const input1 = createFakeSentence(storedSentences.filter(sentence => sentence.id === 'AAM')[0])
    const halfInput1 = input1.slice(0, 10)
    const halfInput2 = input1.slice(10)
    const input2 = createFakeSentence(storedSentences.filter(sentence => sentence.id === 'GGA')[0])
      ;[
        halfInput1 + input2,
        halfInput1 + halfInput1 + input2,
        input2 + halfInput2,
        input2 + halfInput2 + halfInput2,
        'asdfasfaf' + input2 + 'lakjs'
      ].forEach(input => {
        const output = parser.parseData(input)
        if (output.length !== 1) { console.error(`Problem parsing frame -> ${input}`) }
        expect(output).toHaveLength(1)
      })
  })

  test('Uncompleted frames WITH memory', () => {
    const parser = new Parser()
    parser.memory = true
    const storedSentences = parser.getSentences()
    const input1 = createFakeSentence(storedSentences.filter(sentence => sentence.id === 'AAM')[0])
    const halfInput1 = input1.slice(0, 10)
    const halfInput2 = input1.slice(10)
    const input2 = createFakeSentence(storedSentences.filter(sentence => sentence.id === 'GGA')[0])
      // Not uncompleted Frames
      ;[
        halfInput1 + input2,
        halfInput1 + halfInput1 + input2,
        input2 + halfInput2,
        input2 + halfInput2 + halfInput2,
        'asdfasfaf' + input2 + 'lakjs'
      ].forEach(input => {
        const output = parser.parseData(input)
        expect(output).toHaveLength(1)
      })
    // Uncompleted frames
    parser.parseData(halfInput1)
    const mem = parser.parseData(halfInput2)
    expect(mem).toHaveLength(1)
  })

  test('Unknown frames', () => {
    const parser = new Parser()
    const storedSentences = parser.getSentences()
    const aam = storedSentences.filter(sentence => sentence.id === 'AAM')[0]
    const gga = storedSentences.filter(sentence => sentence.id === 'GGA')[0]
    const input1 = createFakeSentence(aam, 'XXX')
    const input2 = createFakeSentence(gga, 'YYY')
      ;[input1, input2].forEach(input => {
        const output = parser.parseData(input)
        if (output.length !== 1) {
          console.error(`Problem parsing frame -> ${input}`)
        }
        expect(output).toHaveLength(1)
      })
  })

  test('Sentence info', () => {
    const parser = new Parser()
    // Known frame
    let sentence = parser.getSentence('AAM')
    expect(sentence?.protocol.name).toBe('NMEA')
    expect(sentence?.protocol.standard).toBeTruthy()
    expect(sentence?.talker).toBeUndefined()
    // Known talker
    sentence = parser.getSentence('GPAAM')
    expect(sentence?.protocol.name).toBe('NMEA')
    expect(sentence?.protocol.standard).toBeTruthy()
    expect(sentence?.talker?.value).toBe('GP')
    // Known special talker
    sentence = parser.getSentence('U8AAM')
    expect(sentence?.protocol.name).toBe('NMEA')
    expect(sentence?.protocol.standard).toBeTruthy()
    expect(sentence?.talker?.value).toBe('U8')
    sentence = parser.getSentence('PdfgsdfAAM')
    expect(sentence).toBeNull()
    // expect(sentence?.protocol.name).toBe('unknown')
    // expect(sentence?.protocol.standard).toBeTruthy()
    // expect(sentence?.talker?.value).toBe('Pdfgsdf')
    // Unknown talker
    sentence = parser.getSentence('XXAAM')
    expect(sentence).toBeNull()
    // expect(sentence?.protocol.name).toBe('NMEA')
    // expect(sentence?.protocol.standard).toBeTruthy()
    // expect(sentence?.talker?.value).toBe('XX')
    // expect(sentence?.talker?.description).toBe('unknown')
  })

  test('Generate fake sentences without talkers', () => {
    const parser = new Parser()
    parser.getSentences().forEach(sentence => {
      const fakeSentence = parser.getFakeSentenceByID(sentence.id)
      expect(fakeSentence).not.toBeNull()
      expect(NMEALikeSchema.is(fakeSentence)).toBeTruthy()
      if (fakeSentence !== null) {
        const parsed = parser.parseData(fakeSentence)
        expect(parsed).toHaveLength(1)
        expect(parsed[0].id).toBe(sentence.id)
      }
    })
  })

  test('Generate fake sentences with talkers', () => {
    const parser = new Parser()
    parser.getSentences().forEach(sentence => {
      const talker = 'GP'
      const sentenceID = sentence.id
      const id = talker + sentenceID
      const fakeSentence = parser.getFakeSentenceByID(id)
      expect(fakeSentence).not.toBeNull()
      expect(NMEALikeSchema.is(fakeSentence)).toBeTruthy()
      if (fakeSentence !== null) {
        const starts = fakeSentence.startsWith(talker, 1)
        expect(starts).toBeTruthy()
        const parsed = parser.parseData(fakeSentence)
        expect(parsed).toHaveLength(1)
        expect(parsed[0].id).toBe(sentenceID)
        expect(parsed[0].talker?.value).toBe(talker)
      }
    })
  })

  test('Generate fake sentences unknown', () => {
    const parser = new Parser();
    ['XXX', 'YYY'].forEach(id => {
      const fakeSentence = parser.getFakeSentenceByID(id)
      expect(fakeSentence).toBeNull()
    })
  })
})
