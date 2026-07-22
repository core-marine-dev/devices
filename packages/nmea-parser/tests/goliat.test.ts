import { test, expect } from 'vitest'

import { NMEAParser } from '../src/parser'

test('Simple goliat sentences', () => {
  const input = '$INZDA,132247.96,01,12,2023,,*79\r\n$INGGA,132247.95,7118.690092,N,02215.039776,E,2,12,0.8,66.48,M,26.96,M,20.0,1006*56\r\n$INHDT,308.81,T*17\r\n$INZDA,132248.96,01,12,2023,,*76\r\n$INGGA,132248.95,7118.690091,N,02215.039815,E,2,12,0.8,66.49,M,26.96,M,21.0,1006*50\r\n$INHDT,308.82,T*14\r\n'
  const parser = new NMEAParser()
  const output = parser.parseData(input)
  expect(output).toHaveLength(6)
  // All emit the shared CMA shape
  output.forEach((sentence) => {
    expect(sentence.protocol.name).toBe('NMEA')
    expect(typeof sentence.timestamp).toBe('number')
    expect(sentence).toHaveProperty('raw')
    expect(Array.isArray(sentence.payload)).toBeTruthy()
  })
  // Talker rides in metadata, id is the base id
  const [zda, gga, hdt] = output
  expect(zda.id).toBe('ZDA')
  expect(gga.id).toBe('GGA')
  expect(hdt.id).toBe('HDT')
  expect((gga.metadata?.talker as { value: string }).value).toBe('IN')
})
