import { describe, test, expect } from 'vitest'

import { NorsubParser } from '../src'
import { ProtocolOutput, Sentence } from '@coremarine/nmea-parser/lib/types'
import { StatusSchema } from '../src/schemas'

const PROTOCOLS = ['NMEA', 'GYROCOMPAS1', 'NORSUB', 'NORSUB2', 'NORSUB6', 'NORSUB7', 'NORSUB7b', 'NORSUB8', 'NORSUB PRDID', 'Tokimek PTVG', 'RDI ADCP', 'SMCA', 'SMCC']

describe('Parser', () => {

  test('Default constructor', () => {
    const parser = new NorsubParser()
    expect(parser.memory).toBeTruthy()
    const parserProtocols = parser.getProtocols()
    parserProtocols.forEach(({ protocol }) => {
      expect(PROTOCOLS.includes(protocol)).toBeTruthy()
    })
  })

  test('Norsub Sentences', () => {
    const parser = new NorsubParser()
    const output = parser.getProtocols()
    output.forEach((element: ProtocolOutput) => {
      if (!element.protocol.includes('NMEA')) {
        element.sentences.forEach(sentence => {
          const norsubSentence: Sentence = parser.getSentence(sentence)
          expect(norsubSentence).not.toBeNull()
          if (norsubSentence !== null) {
            const fake = parser.getFakeSentenceByID(norsubSentence.sentence)
            expect(fake).not.toBeNull()
            if (fake !== null) {
              const parsed = parser.parseData(fake)
              expect(parsed).toHaveLength(1)
              const norsub = parsed[0]
              if (norsub.sentence.includes('PNORSUB')) {
                const statusField = (norsub.fields.slice(-1))[0].metadata
                expect(StatusSchema.safeParse(statusField).success).toBeTruthy()
              }
            }
          }
        })
      }
    })
  })
})