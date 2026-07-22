// installed
import type { Metadata } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { NMEAParser } from '../src/parser'

const GGA = '$INGGA,132247.95,7118.690092,N,02215.039776,E,2,12,0.8,66.48,M,26.96,M,20.0,1006*56\r\n'

describe('GGA metadata aggregation', () => {
  const [gga] = new NMEAParser().parseData(GGA)

  test('field metadata: gps_quality label (idx 5)', () => {
    expect(gga.payload[5].name).toBe('gps_quality')
    expect((gga.payload[5].metadata as Metadata).label).toBe(
      'Differential GPS fix (DGNSS), SBAS, OmniSTAR VBS, Beacon, RTX in GVBS mode',
    )
  })

  test('field metadata: utc_position -> epoch ms (idx 0)', () => {
    expect(gga.payload[0].name).toBe('utc_position')
    const { timestamp } = gga.payload[0].metadata as Metadata
    expect(typeof timestamp).toBe('number')
    expect(timestamp as number).toBeGreaterThan(0)
  })

  test('payload metadata: latitude / longitude in decimal degrees', () => {
    const payload = gga.metadata?.payload as Metadata
    expect(payload.latitude as number).toBeCloseTo(71.3115015, 6)
    expect(payload.longitude as number).toBeCloseTo(22.2506629, 6)
  })

  test('fields without derived metadata are left untouched', () => {
    expect(gga.payload[6].name).toBe('satellites')
    expect(gga.payload[6].metadata).toBeUndefined()
  })
})

describe('sentence timestamp metadata (metadata.timestamp)', () => {
  test('every sentence carries received + parsed (parsed === root timestamp)', () => {
    const before = Date.now()
    const [gga] = new NMEAParser().parseData(GGA)
    const after = Date.now()
    expect(gga.metadata.timestamp.received).toBeGreaterThanOrEqual(before)
    expect(gga.metadata.timestamp.received).toBeLessThanOrEqual(after)
    expect(gga.metadata.timestamp.parsed).toBe(gga.timestamp)
  })

  test('GGA promotes its field-level UTC time to metadata.timestamp.sentence', () => {
    const [gga] = new NMEAParser().parseData(GGA)
    expect(gga.metadata.timestamp.sentence).toBe(gga.payload[0].metadata?.timestamp)
    expect(typeof gga.metadata.timestamp.sentence).toBe('number')
  })

  test('a sentence with no time field has no sentence timestamp', () => {
    const [hdt] = new NMEAParser().parseData('$INHDT,308.81,T*17\r\n')
    expect(hdt.metadata.timestamp.received).toBeGreaterThan(0)
    expect(hdt.metadata.timestamp.sentence).toBeUndefined()
  })
})

describe('non-GGA / unknown sentences are untouched', () => {
  test('a known non-aggregated sentence has no payload metadata', () => {
    const [hdt] = new NMEAParser().parseData('$INHDT,308.81,T*17\r\n')
    expect(hdt.metadata?.payload).toBeUndefined()
    hdt.payload.forEach((field) => expect(field.metadata).toBeUndefined())
  })

  test('an unknown sentence has no payload metadata', () => {
    const [unknown] = new NMEAParser().parseData('$XXABC,1,2,3*4E\r\n')
    expect(unknown.metadata?.payload).toBeUndefined()
    unknown.payload.forEach((field) => expect(field.metadata).toBeUndefined())
  })
})
