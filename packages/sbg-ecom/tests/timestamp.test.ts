// installed
import { describe, expect, test } from 'vitest'

// coded
import { STREAM_MIXED, capture } from './fixtures'

import { SBGParser } from '../src'
import type { CMA } from '../src'

/* TIMESTAMPS — decision D6 in docs/STATUS.md, in cru's words: "uptime is not a
   timestamp for us (the concept), and if the device can tell us, we trust the device."

   So a µs-since-power-up counter is NEVER presented as a clock. It becomes one only
   through SBG_ECOM_LOG_UTC_TIME, which publishes both the counter and the matching
   UTC — §2.3.3.2 says outright that this is the frame to use "if you would like to
   time stamp all data to an absolute UTC or GPS time reference". */

const parse = (): CMA[] => new SBGParser().parseData(capture(STREAM_MIXED))

describe('the core stamps received and parsed on every sentence', () => {
  const sentences = parse()

  test('both are present and equal to cma.timestamp when there is no sentence time', () => {
    for (const one of sentences) {
      expect(one.metadata.timestamp.received).toBeGreaterThan(0)
      expect(one.metadata.timestamp.parsed).toBeGreaterThan(0)
    }
  })

  test('every sentence in one addData shares the SAME received', () => {
    // Including the NMEA ones, which nmea-parser stamped itself before the core
    // overwrote the block. Without that overwrite a mixed batch would carry two
    // slightly different "when did this arrive" values.
    const received = new Set(sentences.map((one) => one.metadata.timestamp.received))
    expect(received.size).toBe(1)
  })
})

describe('before a UTC_TIME frame arrives, no eCom sentence claims a time', () => {
  test('a lone EKF_EULER gets no sentence timestamp', () => {
    const parser = new SBGParser()
    const fake = parser.getFakeSentence('0:6', undefined, { timestamp: 1_234_567 })
    expect(fake.success).toBe(true)
    if (!fake.success) return
    const [sentence] = parser.parseData(fake.value)
    // The uptime is right there in the payload, and it is NOT promoted — because on
    // its own it says nothing about when the sample was taken.
    expect(sentence.payload[0].name).toBe('TIME_STAMP')
    expect(sentence.payload[0].value).toBe(1_234_567)
    expect(sentence.metadata.timestamp.sentence).toBeUndefined()
    expect(sentence.timestamp).toBe(sentence.metadata.timestamp.parsed)
    expect(parser.clock).toBeUndefined()
  })
})

describe('a valid UTC_TIME frame teaches the parser the clock', () => {
  // §2.3.3.2 CLOCK_STATUS: bit 0 stable input, bits 1-4 clock status (3 = VALID),
  // bits 5 UTC sync, bits 6-9 UTC status (2 = SBG_ECOM_UTC_VALID).
  const VALID_CLOCK = (3 << 1) | (1 << 5) | (2 << 6) | 1

  const utcFrame = (parser: SBGParser, uptime: number, clock = VALID_CLOCK): Uint8Array => {
    const fake = parser.getFakeSentence('0:2', undefined, {
      timestamp: uptime,
      fields: { CLOCK_STATUS: clock, YEAR: 2026, MONTH: 8, DAY: 1, HOUR: 12, MIN: 30, SEC: 15, NANOSEC: 500_000_000 },
    })
    if (!fake.success) throw new Error('could not fabricate a UTC_TIME frame')
    return fake.value
  }

  test('UTC_TIME publishes the assembled epoch at payload level', () => {
    const parser = new SBGParser()
    const [sentence] = parser.parseData(utcFrame(parser, 10_000_000))
    const payload = sentence.metadata.payload as { utc: { value: number } }
    expect(payload.utc.value).toBe(Date.UTC(2026, 7, 1, 12, 30, 15, 500))
    expect(parser.clock).toEqual({ uptime: 10_000_000, utc: Date.UTC(2026, 7, 1, 12, 30, 15, 500) })
  })

  test('UTC_TIME time-stamps ITSELF, not just the frames after it', () => {
    const parser = new SBGParser()
    const [sentence] = parser.parseData(utcFrame(parser, 10_000_000))
    expect(sentence.metadata.timestamp.sentence).toBe(Date.UTC(2026, 7, 1, 12, 30, 15, 500))
    // Promoted to cma.timestamp: the device's clock beats the host's.
    expect(sentence.timestamp).toBe(sentence.metadata.timestamp.sentence)
  })

  test('a later log is dated from the learned correspondence', () => {
    const parser = new SBGParser()
    const utc = Date.UTC(2026, 7, 1, 12, 30, 15, 500)
    parser.parseData(utcFrame(parser, 10_000_000))
    // 2.5 seconds of uptime later, in microseconds.
    const fake = parser.getFakeSentence('0:6', undefined, { timestamp: 12_500_000 })
    if (!fake.success) throw new Error('no fake')
    const [euler] = parser.parseData(fake.value)
    expect(euler.metadata.timestamp.sentence).toBe(utc + 2500)
    expect(euler.timestamp).toBe(utc + 2500)
  })

  test('an uptime EARLIER than the reference dates backwards, as it must', () => {
    // SHIP_MOTION_HP is computed retrospectively (§2.3.5.4), so its uptime really can
    // be earlier than a frame already received. Clamping that would be a lie.
    const parser = new SBGParser()
    const utc = Date.UTC(2026, 7, 1, 12, 30, 15, 500)
    parser.parseData(utcFrame(parser, 10_000_000))
    const fake = parser.getFakeSentence('0:32', undefined, { timestamp: 9_000_000 })
    if (!fake.success) throw new Error('no fake')
    const [motion] = parser.parseData(fake.value)
    expect(motion.metadata.timestamp.sentence).toBe(utc - 1000)
  })

  test('an INVALID UTC status is refused — a guessed clock is worse than none', () => {
    const parser = new SBGParser()
    // UTC status 0 = SBG_ECOM_UTC_INVALID: "we are just propagating the UTC time
    // internally". The fields are populated but meaningless.
    parser.parseData(utcFrame(parser, 10_000_000, (3 << 1) | (0 << 6)))
    expect(parser.clock).toBeUndefined()
    const fake = parser.getFakeSentence('0:6', undefined, { timestamp: 12_500_000 })
    if (!fake.success) throw new Error('no fake')
    const [euler] = parser.parseData(fake.value)
    expect(euler.metadata.timestamp.sentence).toBeUndefined()
  })

  test('a UTC_TIME frame with a bad CRC does not teach anything', () => {
    const parser = new SBGParser()
    const frame = utcFrame(parser, 10_000_000)
    // Corrupt the CRC in place.
    frame[frame.byteLength - 3] ^= 0xFF
    const [sentence] = parser.parseData(frame)
    expect(sentence.errors?.[0]).toMatch(/^Invalid CRC/)
    expect(parser.clock).toBeUndefined()
  })

  test('a log with no TIME_STAMP field gets no sentence time even with a clock', () => {
    const parser = new SBGParser()
    parser.parseData(utcFrame(parser, 10_000_000))
    // GPS1_RAW is opaque and carries no time stamp at all (§2.3.6.6).
    const fake = parser.getFakeSentence('0:31')
    if (!fake.success) throw new Error('no fake')
    const [raw] = parser.parseData(fake.value)
    expect(raw.metadata.name).toBe('SBG_ECOM_LOG_GPS1_RAW')
    expect(raw.metadata.timestamp.sentence).toBeUndefined()
  })
})

describe('an NMEA sentence keeps the time nmea-parser derived for it', () => {
  test('GGA\'s UTC survives the core re-stamping the timestamp block', () => {
    // The core overwrites metadata.timestamp wholesale, so without the hook reading
    // the inherited value back, composing nmea-parser would DESTROY its GGA time.
    const parser = new SBGParser()
    const sentences = parser.parseData('$GPGGA,093721.00,4024.87314846,N,00343.50344998,W,1,19,2.8,600.668,M,50.238,M,,*7B\r\n')
    expect(sentences[0].id).toBe('GGA')
    expect(sentences[0].metadata.timestamp.sentence).toBeGreaterThan(0)
    expect(sentences[0].timestamp).toBe(sentences[0].metadata.timestamp.sentence)
  })
})
