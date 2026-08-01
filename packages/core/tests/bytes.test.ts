// installed
import { describe, expect, test } from 'vitest'

// coded
import { fromBase64, toBase64 } from '../src/bytes'

describe('toBase64', () => {
  test('encodes the three padding cases', () => {
    // lengths 3, 1 and 2 mod 3 exercise the full group, '==' and '='
    expect(toBase64(new Uint8Array([0x24, 0x40, 0xB4]))).toBe('JEC0')
    expect(toBase64(new Uint8Array([0x24]))).toBe('JA==')
    expect(toBase64(new Uint8Array([0x24, 0x40]))).toBe('JEA=')
  })

  test('empty input is an empty string', () => {
    expect(toBase64(new Uint8Array(0))).toBe('')
  })

  test('handles the high half of the byte range (no sign leaking in)', () => {
    expect(toBase64(new Uint8Array([0xFF, 0xFE, 0xFD]))).toBe('//79')
    expect(toBase64(new Uint8Array([0x80, 0x00, 0x7F]))).toBe('gAB/')
  })

  test('matches the runtime encoder over every byte value', () => {
    // Buffer is the ORACLE here, not an implementation detail: the library
    // itself must never use it (browser/deno/bun), so this test only proves
    // our arithmetic agrees with a known-good encoder.
    const bytes = new Uint8Array(256)
    for (let index = 0; index < 256; index++) bytes[index] = index
    for (let length = 0; length <= 256; length++) {
      const slice = bytes.subarray(0, length)
      expect(toBase64(slice)).toBe(Buffer.from(slice).toString('base64'))
    }
  })

  test('encodes a view into a larger buffer, not the whole buffer', () => {
    const frame = new Uint8Array([0, 0, 0x24, 0x40, 0, 0])
    expect(toBase64(frame.subarray(2, 4))).toBe('JEA=')
  })
})

describe('fromBase64', () => {
  test('round-trips every length', () => {
    const bytes = new Uint8Array(256)
    for (let index = 0; index < 256; index++) bytes[index] = 255 - index
    for (let length = 0; length <= 256; length++) {
      const slice = bytes.subarray(0, length)
      expect(fromBase64(toBase64(slice))).toStrictEqual(new Uint8Array(slice))
    }
  })

  test('skips characters that are not base64 instead of throwing', () => {
    expect(fromBase64('JE C0\n')).toStrictEqual(new Uint8Array([0x24, 0x40, 0xB4]))
    expect(fromBase64('')).toStrictEqual(new Uint8Array(0))
    expect(fromBase64('!!!')).toStrictEqual(new Uint8Array(0))
  })

  test('decodes a real SBF frame header', () => {
    expect(fromBase64('JEC0kzIXLAA=')).toStrictEqual(new Uint8Array([0x24, 0x40, 0xB4, 0x93, 0x32, 0x17, 0x2C, 0x00]))
  })
})
