// installed
import type { Metadata } from '@coremarine/protocol-core'

// Helpers the block decoders share. A decoder's whole job is to turn an integer
// that the CMA `Type` system cannot express — a bitfield, a mask, an enum code,
// a scaled measurement — into field metadata, so these three shapes cover most
// of them.

export const UNKNOWN_LABEL = 'UNKNOWN'

export const bitState = (value: number, bit: number): boolean => ((value >>> bit) % 2) !== 0

// A slice of bits as an unsigned integer, `from` and `to` inclusive, counting
// from the LSB — the way every SBF bitfield is documented ("bits 13-15").
export const bits = (value: number, from: number, to: number): number => {
  const width = (to - from) + 1
  return (value >>> from) & ((2 ** width) - 1)
}

// A slice of bits read as a TWO'S COMPLEMENT signed integer. MeasEpoch's
// OffsetsMSB packs a 3-bit signed code offset and a 5-bit signed Doppler offset
// into one byte, and the datasheet says both are two's complement — read as
// unsigned, a -4 code offset would come back as 4.
export const signedBits = (value: number, from: number, to: number): number => {
  const width = (to - from) + 1
  const raw = bits(value, from, to)
  const sign = 2 ** (width - 1)
  return (raw >= sign) ? raw - (2 ** width) : raw
}

// An enum code -> its documented name. Codes the datasheet does not define stay
// UNKNOWN rather than being invented (§4.1.9: decoding software must ignore
// undefined codes).
export const label = (table: Readonly<Record<number, string>>, code: number): Metadata =>
  ({ label: table[code] ?? UNKNOWN_LABEL })

// A field carrying a scaled integer -> the engineering value. `value` keeps the
// datasheet's raw number and `units` its raw scale ('0.01 m'); the converted
// value lands here as { value, units }, reusing Field's own vocabulary. Divides
// rather than multiplying by a fraction, so 812 / 100 is 8.12 and not
// 8.120000000000001.
export const scaled = (value: number, divisor: number, units?: string): Metadata =>
  (units === undefined) ? { value: value / divisor } : { value: value / divisor, units }

const DEGREES_PER_RADIAN = 180 / Math.PI

export const degrees = (radians: number): Metadata => ({ value: radians * DEGREES_PER_RADIAN, units: 'deg' })

const ASCII_PRINTABLE_FROM = 0x20
const ASCII_PRINTABLE_TO = 0x7e
const ASCII_WHITESPACE = [0x09, 0x0a, 0x0d]

// A byte array that is TEXT in some modes and binary in others —
// EncapsulatedOutput's `Payload` is an NMEA sentence or an ASCIIDisplay line in
// two of its five modes, and an RTCM/CMR frame in the other three. Returns the
// text when every byte is printable ASCII or ordinary whitespace, and '' when it
// is not: half-decoded binary read as characters is worse than nothing, and
// `raw` (base64) is the authoritative form for those modes anyway.
export const printableText = (bytes: Uint8Array): string => {
  let text = ''
  for (const byte of bytes) {
    const printable = (byte >= ASCII_PRINTABLE_FROM && byte <= ASCII_PRINTABLE_TO) || ASCII_WHITESPACE.includes(byte)
    if (!printable) return ''
    text += String.fromCharCode(byte)
  }
  return text
}
