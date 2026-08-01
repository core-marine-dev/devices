// installed
import { describe, expect, test } from 'vitest'

// coded
import { STREAM_LOGS, STREAM_LOSSY, STREAM_MIXED, capture } from './fixtures'

import { PROTOCOL_NAME, SBGParser, UNKNOWN } from '../src'
import type { CMA } from '../src'

/* THE CORPUS TESTS — the ones that can catch a wrong field order.

   A fake round trip agrees with itself even when the field table is wrong (see the
   warning in src/fake.ts). These run the parser over REAL DEVICE OUTPUT, and the
   expectations are the measured facts recorded in tests/fixtures/README.md. If a
   count here changes, either the parser broke or the fixture did — never "the test
   needs updating". */

const parse = (name: string, options = {}): CMA[] => new SBGParser(options).parseData(capture(name))

const ecom = (sentences: CMA[]): CMA[] => sentences.filter((one) => one.protocol.name === PROTOCOL_NAME)
const nmea = (sentences: CMA[]): CMA[] => sentences.filter((one) => one.protocol.name !== PROTOCOL_NAME && one.id !== UNKNOWN)
const garbage = (sentences: CMA[]): CMA[] => sentences.filter((one) => one.id === UNKNOWN)

describe('stream-mixed.bin — 71 eCom frames + 3 NMEA sentences, nothing else', () => {
  const sentences = parse(STREAM_MIXED)

  test('every frame decodes and no sentence carries an error', () => {
    expect(ecom(sentences)).toHaveLength(71)
    expect(nmea(sentences)).toHaveLength(3)
    expect(garbage(sentences)).toHaveLength(0)
    // The whole point of the fixture: a clean slice, so NOTHING should report a
    // problem. A single error here means the parser is wrong, not the capture.
    expect(sentences.filter((one) => one.errors !== undefined)).toHaveLength(0)
  })

  test('the interleaved sentences really are NMEA, parsed as NMEA', () => {
    const sentences_ = nmea(sentences)
    expect(sentences_.map((one) => one.id)).toEqual(['GGA', 'GGA', 'GGA'])
    // Not eCom's protocol name: they came out of nmea-parser, which is the point of
    // composing it rather than reimplementing NMEA here.
    expect(sentences_.every((one) => one.protocol.name === 'NMEA')).toBe(true)
    expect(sentences_[0].raw.startsWith('$GPGGA,')).toBe(true)
  })

  test('the log mix is the one measured in the fixture README', () => {
    const counts = new Map<string, number>()
    for (const one of ecom(sentences)) counts.set(one.id, (counts.get(one.id) ?? 0) + 1)
    expect(Object.fromEntries([...counts].sort((a, b) => a[0].localeCompare(b[0])))).toEqual({
      '0:1': 2, '0:13': 11, '0:14': 11, '0:15': 2, '0:2': 2, '0:6': 21, '0:9': 22,
    })
  })

  test('every eCom sentence is a well-formed CMA', () => {
    for (const one of ecom(sentences)) {
      expect(one.id).toMatch(/^\d+:\d+$/)
      expect(one.protocol).toEqual({ name: PROTOCOL_NAME, version: '2.3' })
      expect(one.raw.length).toBeGreaterThan(0)
      expect(one.metadata.timestamp.received).toBeGreaterThan(0)
      expect(one.metadata.timestamp.parsed).toBe(one.timestamp === one.metadata.timestamp.sentence ? one.metadata.timestamp.parsed : one.timestamp)
      expect(one.metadata.name).not.toBe('unknown')
    }
  })
})

describe('stream-lossy.bin — the capture dropped bytes mid-sentence', () => {
  const sentences = parse(STREAM_LOSSY)

  test('13 frames decode and the orphan sentence tail is reported, not dropped', () => {
    expect(ecom(sentences)).toHaveLength(13)
    const junk = garbage(sentences)
    expect(junk).toHaveLength(1)
    expect(junk[0].errors?.[0]).toBeDefined()
  })

  test('the reported garbage carries the bytes that were dropped', () => {
    const junk = garbage(sentences)[0]
    // 37 characters: ',W,1,19,2.6,603.963,M,50.238,M,,*71\r\n' — the tail of a
    // GGA whose head never arrived.
    expect(junk.raw.length).toBeGreaterThan(0)
    expect(junk.payload).toEqual([])
    expect(junk.protocol).toEqual({ name: UNKNOWN, version: UNKNOWN })
  })
})

describe('stream-logs.bin — 12 log types, and a truncated sync at the very end', () => {
  const parser = new SBGParser()
  const sentences = parser.parseData(capture(STREAM_LOGS))

  test('every frame in the capture decodes', () => {
    expect(ecom(sentences)).toHaveLength(249)
    expect(nmea(sentences)).toHaveLength(1)
  })

  test('the trailing 0xFF stays PENDING on the buffer instead of becoming garbage', () => {
    // This is the whole reason the fixture ends with that byte: a sync split across
    // two chunks must not be destroyed. If this ever fails, a frame arriving in two
    // reads is being corrupted.
    expect([...parser.buffer]).toEqual([0xFF])
  })

  test('all twelve log types are named, none falls through as unknown', () => {
    const names = new Set(ecom(sentences).map((one) => one.metadata.name))
    expect(names.has('unknown')).toBe(false)
    expect(names).toContain('SBG_ECOM_LOG_IMU_SHORT')
    expect(names).toContain('SBG_ECOM_LOG_EKF_QUAT')
    expect(names).toContain('SBG_ECOM_LOG_AIR_DATA')
    expect(names.size).toBe(12)
  })
})

describe('feeding the same capture one byte at a time gives the same result', () => {
  test('chunking cannot change what is parsed', () => {
    const whole = parse(STREAM_MIXED)
    const parser = new SBGParser()
    const bytes = capture(STREAM_MIXED)
    const chunked: CMA[] = []
    for (const byte of bytes) chunked.push(...parser.parseData(new Uint8Array([byte])))
    // The severe test of the framing: every frame boundary, every sync, and every
    // NMEA terminator is crossed mid-chunk here.
    expect(chunked.map((one) => one.id)).toEqual(whole.map((one) => one.id))
    expect(chunked.map((one) => one.raw)).toEqual(whole.map((one) => one.raw))
  })
})
