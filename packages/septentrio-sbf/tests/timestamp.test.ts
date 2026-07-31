// installed
import { GPS_EPOCH_MS, GPS_WEEK_MS } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { attEulerFrame, capture, pvtGeodeticFrame } from './fixtures'

import { SBFParser } from '../src/protocol-sbf'

// The timestamp chain, which is what the 1.x parser got most wrong: it dated
// every frame in this capture to 2026 and 2035 because it fed SBF's
// millisecond TOW to a helper that wanted seconds.

describe('cma.timestamp carries the receiver clock', () => {
  test('it equals metadata.timestamp.sentence, and received/parsed are untouched', () => {
    const before = Date.now()
    const [sentence] = new SBFParser().parseData(attEulerFrame())
    const after = Date.now()
    const { received, parsed, sentence: own } = sentence.metadata.timestamp
    expect(own).toBeDefined()
    expect(sentence.timestamp).toBe(own)
    // the host-side timings still mean exactly what they meant before
    expect(received).toBeGreaterThanOrEqual(before)
    expect(parsed).toBeLessThanOrEqual(after)
    expect(own).not.toBe(parsed)
  })

  test('the GNSS time is 2023, not 2026 or 2035', () => {
    const [sentence] = new SBFParser().parseData(attEulerFrame())
    expect(new Date(sentence.timestamp).toISOString()).toBe('2023-06-01T10:55:12.000Z')
  })

  test('a capture named 2023_06_23 dates to 2023-06-23', () => {
    const [sentence] = new SBFParser().parseData(pvtGeodeticFrame())
    expect(new Date(sentence.timestamp).toISOString()).toBe('2023-06-23T09:44:52.000Z')
  })

  // The strongest check available: the receiver states its own UTC in
  // ReceiverTime, so its TOW/WNc conversion must land on the same instant.
  test('it matches the receiver’s own UTC statement, to the second', () => {
    const sentences = new SBFParser().parseData(capture())
    const receiverTimes = sentences.filter((sentence) => sentence.metadata.name === 'ReceiverTime')
    expect(receiverTimes.length).toBeGreaterThan(1)
    for (const sentence of receiverTimes) {
      const utc = (sentence.metadata.payload as { utc: { timestamp: number } }).utc
      expect(sentence.timestamp).toBe(utc.timestamp)
    }
  })

  test('the whole capture spans the 38 seconds it was recorded over', () => {
    const stamps = new SBFParser().parseData(capture()).map((sentence) => sentence.timestamp)
    expect(Math.max(...stamps) - Math.min(...stamps)).toBe(38_000)
    expect(new Date(Math.min(...stamps)).toISOString()).toBe('2023-02-20T07:41:48.000Z')
  })
})

describe('leap seconds come from the device', () => {
  test('DeltaLS is learned from ReceiverTime', () => {
    const parser = new SBFParser()
    expect(parser.leapSeconds).toBeUndefined()
    parser.parseData(capture())
    expect(parser.leapSeconds).toBe(18)
  })

  test('a stream without ReceiverTime still converts, via the core table', () => {
    const parser = new SBFParser()
    const [sentence] = parser.parseData(attEulerFrame())
    expect(parser.leapSeconds).toBeUndefined()
    expect(new Date(sentence.timestamp).getUTCFullYear()).toBe(2023)
  })
})

describe('an unset receiver clock', () => {
  // §4.1.3: for a few seconds after start-up TOW and/or WNc are Do-Not-Use. The
  // block is still perfectly usable — it just cannot be time-tagged.
  const withoutTime = (): Uint8Array => {
    const frame = attEulerFrame()
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
    view.setUint32(8, 4_294_967_295, true)
    view.setUint16(12, 65_535, true)
    return frame
  }

  test('leaves TOW and WNc null and publishes no sentence timestamp', () => {
    const [sentence] = new SBFParser().parseData(withoutTime())
    expect(sentence.metadata.tow).toMatchObject({ value: null })
    expect(sentence.metadata.wnc).toMatchObject({ value: null })
    expect(sentence.metadata.timestamp.sentence).toBeUndefined()
  })

  test('leaves cma.timestamp as the decode time — the only clock we have', () => {
    const [sentence] = new SBFParser().parseData(withoutTime())
    expect(sentence.timestamp).toBe(sentence.metadata.timestamp.parsed)
  })
})

describe('the GPS-to-Unix conversion itself', () => {
  test('TOW is read as milliseconds of the week', () => {
    const [sentence] = new SBFParser().parseData(attEulerFrame())
    const tow = (sentence.metadata.tow as { value: number }).value
    const wnc = (sentence.metadata.wnc as { value: number }).value
    // 18 leap seconds, from this receiver's own DeltaLS
    expect(sentence.timestamp).toBe(GPS_EPOCH_MS + (wnc * GPS_WEEK_MS) + tow - 18_000)
  })
})
