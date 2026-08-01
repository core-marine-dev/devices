// installed
import { describe, expect, test } from 'vitest'

// coded
import { MAXIMAL_DATA_LENGTH, SBGParser, UNKNOWN } from '../src'
import { frameCRC } from '../src/protocol-ecom'

/* FRAMING — §2.1.1. The cases a real serial line produces, none of which a capture
   happens to contain, so they are built by hand here. */

// A frame built from raw parts, so a test can make one WRONG on purpose. The parser's
// own fake builder cannot do that: it always seals a correct CRC and ETX.
const frame = ({ message = 6, classByte = 0, data = new Uint8Array(0), crc, etx = 0x33 }: {
  message?: number
  classByte?: number
  data?: Uint8Array
  crc?: number
  etx?: number
}): Uint8Array => {
  const bytes = new Uint8Array(6 + data.byteLength + 3)
  const view = new DataView(bytes.buffer)
  bytes[0] = 0xFF
  bytes[1] = 0x5A
  view.setUint8(2, message)
  view.setUint8(3, classByte)
  view.setUint16(4, data.byteLength, true)
  bytes.set(data, 6)
  view.setUint16(6 + data.byteLength, crc ?? frameCRC(bytes, data.byteLength), true)
  view.setUint8(8 + data.byteLength, etx)
  return bytes
}

const join = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

const EKF_EULER = new Uint8Array(32)

describe('the four output tiers', () => {
  test('decoded: a good frame of a modelled log', () => {
    const [sentence] = new SBGParser().parseData(frame({ message: 6, data: EKF_EULER }))
    expect(sentence.id).toBe('0:6')
    expect(sentence.metadata.name).toBe('SBG_ECOM_LOG_EKF_EULER')
    expect(sentence.payload).toHaveLength(8)
    expect(sentence.errors).toBeUndefined()
  })

  test('identified: a good frame whose message is not modelled is NOT an error', () => {
    const [sentence] = new SBGParser().parseData(frame({ message: 99, data: new Uint8Array([1, 2, 3]) }))
    expect(sentence.id).toBe('0:99')
    expect(sentence.metadata.name).toBe('unknown')
    expect(sentence.payload).toEqual([])
    // The whole point of this tier: forward-safe, not lossy. The bytes survive.
    expect(sentence.metadata.body).toEqual({ raw: 'AQID', bytes: 3 })
    expect(sentence.errors).toBeUndefined()
  })

  test('identified: a frame from an unmodelled CLASS keeps its real id', () => {
    // Class 0x10 is CMD, which 1.0.0 does not model. Recognised, not garbage.
    const [sentence] = new SBGParser().parseData(frame({ message: 4, classByte: 0x10 }))
    expect(sentence.id).toBe('16:4')
    expect(sentence.metadata.class).toMatchObject({ value: 16, description: 'SBG_ECOM_CLASS_CMD_0' })
    expect(sentence.errors).toBeUndefined()
  })

  test('failed: a bad CRC is reported, and the body is still decoded', () => {
    const [sentence] = new SBGParser().parseData(frame({ message: 6, data: EKF_EULER, crc: 0x1234 }))
    expect(sentence.errors?.[0]).toMatch(/^Invalid CRC: computed \d+, received 4660$/)
    // Reported, NOT dropped — the payload is usually still usable, which is the
    // whole reason this is an error on a normal CMA rather than a discard.
    expect(sentence.payload).toHaveLength(8)
    expect(sentence.metadata.name).toBe('SBG_ECOM_LOG_EKF_EULER')
  })

  test('failed: a wrong ETX is reported separately from the CRC', () => {
    const [sentence] = new SBGParser().parseData(frame({ message: 6, data: EKF_EULER, etx: 0x00 }))
    expect(sentence.errors).toEqual(['Invalid ETX: expected 51, received 0'])
  })

  test('failed: both wrong gives BOTH errors, not the first one', () => {
    const [sentence] = new SBGParser().parseData(frame({ message: 6, data: EKF_EULER, crc: 1, etx: 2 }))
    expect(sentence.errors).toHaveLength(2)
  })

  test('garbage: bytes that cannot start a frame are coalesced into ONE report', () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5])
    const sentences = new SBGParser().parseData(join(junk, frame({ message: 6, data: EKF_EULER })))
    expect(sentences).toHaveLength(2)
    expect(sentences[0].id).toBe(UNKNOWN)
    expect(sentences[0].errors).toEqual(['Unparseable data: 5 byte(s) before a valid frame'])
    // Coalesced: five junk bytes, ONE report — not five.
    expect(sentences[1].id).toBe('0:6')
  })
})

describe('incomplete input stays PENDING and is never destroyed', () => {
  test('a lone 0xFF may be the first half of a sync', () => {
    const parser = new SBGParser()
    expect(parser.parseData(new Uint8Array([0xFF]))).toEqual([])
    expect([...parser.buffer]).toEqual([0xFF])
    // ...and completing it later yields the frame, not garbage.
    const rest = frame({ message: 6, data: EKF_EULER }).subarray(1)
    const [sentence] = parser.parseData(rest)
    expect(sentence.id).toBe('0:6')
  })

  test('a frame split at every possible offset still decodes exactly once', () => {
    const whole = frame({ message: 8, data: new Uint8Array(72) })
    for (let split = 1; split < whole.byteLength; split++) {
      const parser = new SBGParser()
      const first = parser.parseData(whole.subarray(0, split))
      const second = parser.parseData(whole.subarray(split))
      expect([...first, ...second].map((one) => one.id)).toEqual(['0:8'])
    }
  })

  test('a LEN above the datasheet maximum is not a frame', () => {
    // 0xFF 0x5A inside binary junk with a huge LEN would otherwise stall the buffer
    // forever waiting for bytes that are not coming.
    const bytes = new Uint8Array(12)
    bytes[0] = 0xFF
    bytes[1] = 0x5A
    new DataView(bytes.buffer).setUint16(4, MAXIMAL_DATA_LENGTH + 1, true)
    const parser = new SBGParser()
    const sentences = parser.parseData(bytes)
    expect(sentences).toHaveLength(1)
    expect(sentences[0].id).toBe(UNKNOWN)
    expect(parser.buffer.byteLength).toBe(0)
  })

  test('the buffer limit is ENFORCED, and reports rather than growing silently', () => {
    const parser = new SBGParser({ bufferLimit: 16 })
    // A sync with a length that will never be satisfied under this limit.
    const bytes = new Uint8Array(40)
    bytes[0] = 0xFF
    bytes[1] = 0x5A
    new DataView(bytes.buffer).setUint16(4, 4000, true)
    const sentences = parser.parseData(bytes)
    expect(sentences[0].errors?.[0]).toMatch(/^Buffer limit exceeded: 40 pending byte\(s\) over a limit of 16$/)
    expect(parser.buffer.byteLength).toBe(0)
  })

  test('the default buffer limit fits the largest frame the datasheet allows', () => {
    // Septentrio shipped a 1024-byte default that destroyed 1052-byte blocks. The
    // ceiling here is derived from §2.1.1 Note 1 instead of inherited.
    expect(new SBGParser().bufferLimit).toBe(6 + MAXIMAL_DATA_LENGTH + 3)
  })
})

describe('memory: false replaces the buffer instead of appending', () => {
  test('a frame split across chunks is LOST without memory, by design', () => {
    const whole = frame({ message: 6, data: EKF_EULER })
    const parser = new SBGParser({ memory: false })
    parser.parseData(whole.subarray(0, 10))
    // The second chunk alone is not a frame, so it reports as garbage rather than
    // silently vanishing — which is the contract even when memory is off.
    const sentences = parser.parseData(whole.subarray(10))
    expect(sentences.every((one) => one.id === UNKNOWN)).toBe(true)
  })
})

describe('input is accepted as bytes OR as a string, always', () => {
  test('a string is read one byte per character', () => {
    const bytes = frame({ message: 6, data: EKF_EULER })
    let text = ''
    for (const byte of bytes) text += String.fromCharCode(byte)
    const [fromText] = new SBGParser().parseData(text)
    const [fromBytes] = new SBGParser().parseData(bytes)
    expect(fromText.raw).toBe(fromBytes.raw)
    expect(fromText.id).toBe('0:6')
  })

  test('a plain NMEA sentence as a string parses without any setting', () => {
    // There is no protocol selector (D9): both framings are always looked for.
    const [sentence] = new SBGParser().parseData('$GPGGA,093721.00,4024.87314846,N,00343.50344998,W,1,19,2.8,600.668,M,50.238,M,,*7B\r\n')
    expect(sentence.id).toBe('GGA')
    expect(sentence.protocol.name).toBe('NMEA')
  })
})
