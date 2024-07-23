import { describe, test, expect } from 'vitest'
import type { NMEALike } from '@coremarine/nmea-parser'
import { NorsubParser } from '../src'

const PROTOCOLS = ['NMEA', 'GYROCOMPAS1', 'NORSUB', 'NORSUB2', 'NORSUB6', 'NORSUB7', 'NORSUB7b', 'NORSUB8', 'Tokimek PTVG', 'RDI ADCP', 'SMCA', 'SMCC']
// const PROTOCOLS = ['NMEA', 'GYROCOMPAS1', 'NORSUB', 'NORSUB2', 'NORSUB6', 'NORSUB7', 'NORSUB7b', 'NORSUB8', 'NORSUB PRDID', 'Tokimek PTVG', 'RDI ADCP', 'SMCA', 'SMCC']

describe('Parser', () => {

  test('Default constructor', () => {
    const parser = new NorsubParser()
    // Memory true
    expect(parser.memory).toBeTruthy()
    // Protocols
    const parserProtocols = parser.getSentencesByProtocol()
    PROTOCOLS.forEach(protocol => {
      expect(protocol in parserProtocols).toBeTruthy()
    })
  })

  test('Norsub Sentences', () => {
    const parser = new NorsubParser()
    const protocols = parser.getSentencesByProtocol()
    Object.keys(protocols).forEach(keyProtocol => {
      if (!keyProtocol.includes('NMEA')) {
      protocols[keyProtocol].forEach(storedSentence => {
          const fakeSentence = parser.getFakeSentenceByID(storedSentence.id)
          expect(fakeSentence).not.toBeNull()
          const parsedFakeSentece = parser.parseData(fakeSentence as NMEALike)
          expect(parsedFakeSentece).toHaveLength(1)
          const norsubSentence = parsedFakeSentece[0]
          if (norsubSentence.id.includes('PNORSUB')) {
            expect(norsubSentence.metadata).not.toBeUndefined()
            expect(norsubSentence.metadata.status).not.toBeUndefined()
          }
        })
      }
    })
  })
})