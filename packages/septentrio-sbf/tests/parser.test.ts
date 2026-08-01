// installed
import { fromBase64, UNKNOWN } from '@coremarine/protocol-core'
import { describe, expect, test } from 'vitest'

// coded
import { attEulerFrame, capture, largeCommandsBlock, pvtGeodeticFrame } from './fixtures'

import { SBFParser } from '../src/protocol-sbf'

// Framing specs (§4.1.1): find the sync, trust the Length, verify the CRC — and
// never drop anything silently on the way.

const junk = (length: number): Uint8Array => new Uint8Array(length).fill(0x5A)

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

describe('the whole capture', () => {
  test('195 blocks, nothing left over, no errors anywhere', () => {
    const parser = new SBFParser()
    const sentences = parser.parseData(capture())
    expect(sentences).toHaveLength(195)
    expect(sentences.filter((sentence) => sentence.errors !== undefined)).toStrictEqual([])
    expect(parser.buffer.byteLength).toBe(0)
  })

  test('every byte of the capture is accounted for by a block', () => {
    const total = new SBFParser()
      .parseData(capture())
      .reduce((sum, sentence) => sum + fromBase64(sentence.raw).byteLength, 0)
    expect(total).toBe(capture().byteLength)
  })
})

describe('incomplete input waits on the buffer', () => {
  test('a block split across two chunks decodes once, on the second chunk', () => {
    const frame = attEulerFrame()
    const parser = new SBFParser()
    const half = Math.trunc(frame.byteLength / 2)
    expect(parser.parseData(frame.subarray(0, half))).toStrictEqual([])
    expect(parser.buffer.byteLength).toBe(half)
    const sentences = parser.parseData(frame.subarray(half))
    expect(sentences).toHaveLength(1)
    expect(sentences[0].metadata.name).toBe('AttEuler')
  })

  test('a sync split across two chunks is not mistaken for junk', () => {
    const frame = attEulerFrame()
    const parser = new SBFParser()
    // first chunk ends on the lone 0x24
    parser.parseData(frame.subarray(0, 1))
    expect(parser.buffer.byteLength).toBe(1)
    const sentences = parser.parseData(frame.subarray(1))
    expect(sentences).toHaveLength(1)
    expect(sentences[0].errors).toBeUndefined()
  })

  test('only the header having arrived is still pending, not garbage', () => {
    const parser = new SBFParser()
    expect(parser.parseData(attEulerFrame().subarray(0, 10))).toStrictEqual([])
    expect(parser.buffer.byteLength).toBe(10)
  })

  test('without memory, a split block is lost — and the fragment is reported', () => {
    const frame = attEulerFrame()
    const parser = new SBFParser({ memory: false })
    parser.parseData(frame.subarray(0, 20))
    const sentences = parser.parseData(frame.subarray(20))
    expect(sentences.every((sentence) => sentence.id === UNKNOWN)).toBe(true)
    expect(sentences[0].errors?.[0]).toMatch(/Unparseable data/)
  })
})

describe('nothing is dropped silently', () => {
  test('junk before a block becomes one coalesced garbage sentence', () => {
    const sentences = new SBFParser().parseData(concat(junk(9), attEulerFrame()))
    expect(sentences).toHaveLength(2)
    expect(sentences[0].id).toBe(UNKNOWN)
    expect(sentences[0].protocol).toStrictEqual({ name: UNKNOWN, version: UNKNOWN })
    expect(sentences[0].payload).toStrictEqual([])
    expect(sentences[0].errors).toStrictEqual(['Unparseable data: 9 byte(s) before a valid block'])
    expect(fromBase64(sentences[0].raw)).toStrictEqual(junk(9))
    expect(sentences[1].metadata.name).toBe('AttEuler')
  })

  test('junk after the last block is reported too', () => {
    const sentences = new SBFParser().parseData(concat(attEulerFrame(), junk(4)))
    expect(sentences).toHaveLength(2)
    expect(sentences[1].errors).toStrictEqual(['Unparseable data: 4 byte(s) before a valid block'])
  })

  test('a bad CRC is decoded and flagged, never dropped', () => {
    const frame = attEulerFrame()
    frame[2] ^= 0xFF
    const [sentence] = new SBFParser().parseData(frame)
    expect(sentence.metadata.name).toBe('AttEuler')
    expect(sentence.payload).toHaveLength(10)
    expect(sentence.errors).toHaveLength(1)
    expect(sentence.errors?.[0]).toMatch(/^Invalid CRC: computed \d+, received \d+$/)
  })

  test('a sync whose Length is not a multiple of 4 is junk, and the parser resynchronises', () => {
    const fake = new Uint8Array([0x24, 0x40, 0, 0, 0, 0, 13, 0, 0, 0, 0, 0, 0, 0])
    const sentences = new SBFParser().parseData(concat(fake, attEulerFrame()))
    expect(sentences).toHaveLength(2)
    expect(sentences[0].id).toBe(UNKNOWN)
    expect(sentences[1].metadata.name).toBe('AttEuler')
  })

  test('an over-limit pending block is flushed as garbage instead of growing forever', () => {
    // A body claiming 1000 bytes that never arrives, on a 64-byte limit.
    const header = new Uint8Array([0x24, 0x40, 0, 0, 0, 0, 0xE8, 0x03, 0, 0, 0, 0, 0, 0])
    const parser = new SBFParser({ bufferLimit: 64 })
    expect(parser.parseData(concat(header, junk(20)))).toStrictEqual([])
    const sentences = parser.parseData(junk(60))
    expect(sentences).toHaveLength(1)
    expect(sentences[0].errors?.[0]).toMatch(/^Buffer limit exceeded: 94 pending byte\(s\) over a limit of 64$/)
    expect(parser.buffer.byteLength).toBe(0)
  })

  // THE DEFAULT LIMIT HAS TO FIT A WHOLE BLOCK. SBF framing is length-prefixed,
  // not terminated, so a block only decodes once its LAST byte arrives — and
  // `Length` is a uint16, so a block can be 65535 bytes. The core's generic
  // 1024-byte binary default is smaller than blocks cru's own receiver emits.
  test('the default buffer limit is the largest a block can be, not the generic one', () => {
    expect(new SBFParser().bufferLimit).toBe(65535)
  })

  // THE REGRESSION. This is a REAL 1052-byte Commands block from
  // 2023_06_23_test1.sbf, fed in 16-byte chunks the way a serial port delivers
  // one. Under the inherited 1024-byte limit the buffer overflowed 24 bytes
  // before the block completed and it was destroyed into garbage sentences — 28
  // of them at one byte per chunk. Nothing was wrong with the data.
  test('a block larger than 1024 bytes survives arriving in small chunks', () => {
    const block = largeCommandsBlock()
    expect(block.byteLength).toBeGreaterThan(1024)
    for (const size of [1, 8, 16, 20, 32, 64]) {
      const parser = new SBFParser()
      const sentences = []
      for (let offset = 0; offset < block.byteLength; offset += size) {
        sentences.push(...parser.parseData(block.subarray(offset, offset + size)))
      }
      expect(sentences, `chunk size ${size}`).toHaveLength(1)
      expect(sentences[0].metadata.name, `chunk size ${size}`).toBe('Commands')
      expect(sentences[0].errors, `chunk size ${size}`).toBeUndefined()
    }
  })

  // ...and the limit still does its job: a block whose body never arrives is
  // flushed rather than growing the buffer forever, which matters more for a
  // binary protocol than a text one (0x24 0x40 occurs inside bodies all the time,
  // so a wrong device on the line can open a block that never completes).
  test('the larger default still flushes a block that never completes', () => {
    // A header claiming a 3000-byte body that never arrives, on a 2048 limit.
    const header = new Uint8Array([0x24, 0x40, 0, 0, 0, 0, 0xB8, 0x0B, 0, 0, 0, 0, 0, 0])
    const parser = new SBFParser({ bufferLimit: 2048 })
    expect(parser.parseData(concat(header, junk(1000)))).toStrictEqual([])
    const sentences = parser.parseData(junk(1100))
    expect(sentences).toHaveLength(1)
    expect(sentences[0].errors?.[0]).toMatch(/^Buffer limit exceeded: 2114 pending byte\(s\) over a limit of 2048$/)
    expect(parser.buffer.byteLength).toBe(0)
  })
})

describe('blocks that are identified but not modelled', () => {
  // Every block of Appendix B is modelled now, so this tier only fires on a block
  // NUMBER this knowledge base does not have — a block from a newer firmware. It
  // is still emitted: real id, real timestamp, bytes in raw. That is NOT an error,
  // and it is what makes the library forward-safe.
  const unmodelled = (): Uint8Array => {
    const frame = pvtGeodeticFrame()
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
    // 4999 is not in Appendix B at all, so it stays unmodelled however many
    // blocks get added — the same situation as a block from a future firmware.
    view.setUint16(4, 4999, true)
    return frame
  }

  test('keep their number as id and say `unknown` only as the name', () => {
    const [sentence] = new SBFParser().parseData(unmodelled())
    expect(sentence.id).toBe('4999')
    expect(sentence.metadata.name).toBe(UNKNOWN)
    expect(sentence.payload).toStrictEqual([])
    expect(sentence.description).toBeUndefined()
  })

  test('publish the body as opaque bytes, and the header fields as usual', () => {
    const [sentence] = new SBFParser().parseData(unmodelled())
    expect(sentence.metadata.body).toMatchObject({ bytes: 82 })
    expect(sentence.metadata.tow).toMatchObject({ name: 'TOW', units: '0.001 s' })
    expect(sentence.metadata.timestamp.sentence).toBeGreaterThan(0)
  })

  test('are not promoted to the GNSS timestamp, since their time scale is unknown', () => {
    const [sentence] = new SBFParser().parseData(unmodelled())
    expect(sentence.timestamp).toBe(sentence.metadata.timestamp.parsed)
    expect(sentence.timestamp).not.toBe(sentence.metadata.timestamp.sentence)
  })
})

describe('header metadata', () => {
  const [sentence] = new SBFParser().parseData(attEulerFrame())

  test('sync and id are not repeated in metadata; the other four are Field-shaped', () => {
    expect(sentence.metadata.sync).toBeUndefined()
    expect(sentence.metadata.id).toBeUndefined()
    expect(sentence.metadata.crc).toMatchObject({ name: 'CRC', type: 'uint16' })
    expect(sentence.metadata.length).toMatchObject({ name: 'Length', type: 'uint16', value: 44, units: 'bytes' })
    expect(sentence.metadata.tow).toMatchObject({ name: 'TOW', type: 'uint32', value: 384930000 })
    expect(sentence.metadata.wnc).toMatchObject({ name: 'WNc', type: 'uint16', value: 2264, units: 'week' })
  })

  test('each metadata field carries the raw bytes it was read from', () => {
    const frame = attEulerFrame()
    const length = sentence.metadata.length as { raw: string }
    expect(fromBase64(length.raw)).toStrictEqual(frame.subarray(6, 8))
  })

  test('revision is a plain number, not an object', () => {
    expect(sentence.metadata.revision).toBe(0)
  })
})
