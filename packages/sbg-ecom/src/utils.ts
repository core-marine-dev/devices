// installed
import type { Metadata } from '@coremarine/protocol-core'

// coded
import { CLASS_MASK } from './constants'

/* Helpers shared by the log decoders and the parser. A decoder's whole job is to
   turn an integer the CMA `Type` system cannot express — a bitmask, an enum code,
   a scaled measurement — into field metadata, so the shapes here cover most of them. */

export const UNKNOWN_LABEL = 'UNKNOWN'

export const bitState = (value: number, bit: number): boolean => ((value >>> bit) % 2) !== 0

// A slice of bits as an unsigned integer, `from` and `to` inclusive, counting
// from the LSB — the way every sbgECom bitfield is documented ("Bits [1-4]").
export const bits = (value: number, from: number, to: number): number => {
  const width = (to - from) + 1
  return (value >>> from) & ((2 ** width) - 1)
}

/* An enum code -> its documented name. Codes the datasheet does not define stay
   UNKNOWN rather than being invented.

   ⚠️ The 0.0.x decoders read these enums with a MASK AND A SHIFT, and several of
   the masks were wrong: UTC_TIME's clock status used
   `0b…0001_1110 >>> 1` for a 4-bit enum at bits 1-4 (correct) but GPS_POS's type
   used `0b…1111_1100_0000 >>> 6` for a 6-bit enum at bits 6-11 (correct) while
   STATUS's CAN bus used `0b0011_1100_…  >>> 28`, a FOUR-bit mask for a
   THREE-bit enum at bits 28-30 — so a set bit 31 leaked into the value. Deriving
   the mask from the documented bit range removes that class of error. */
export const label = (table: Readonly<Record<number, string>>, code: number): Metadata =>
  ({ label: table[code] ?? UNKNOWN_LABEL })

// An enum packed into a bit range, decoded in one step so no hand-written mask
// can disagree with the datasheet's bit numbers.
export const enumBits = (table: Readonly<Record<number, string>>, value: number, from: number, to: number): Metadata =>
  label(table, bits(value, from, to))

/* A field carrying a scaled integer -> the engineering value. `value` keeps the
   datasheet's raw number and `units` its raw scale ('0.01 s'); the converted
   value lands here as { value, units }, reusing Field's own vocabulary. Divides
   rather than multiplying by a fraction, so 812 / 100 is 8.12 and not
   8.120000000000001. */
export const scaled = (value: number, divisor: number, units?: string): Metadata =>
  (units === undefined) ? { value: value / divisor } : { value: value / divisor, units }

const DEGREES_PER_RADIAN = 180 / Math.PI

// sbgECom reports every angle in RADIANS. Marine consumers overwhelmingly want
// degrees, so every angular field publishes the conversion in its metadata
// rather than leaving each consumer to rediscover the factor.
export const degrees = (radians: number): Metadata => ({ value: radians * DEGREES_PER_RADIAN, units: 'deg' })

/* THE CMA `id` FOR AN eCom FRAME: `'<class>:<message>'`, e.g. '0:6'.

   Identity in sbgECom is a PAIR — §2.1.1 gives MSG and CLASS as two independent
   header bytes, and there is no revision concept. `MSG 6` is EKF_EULER in class
   0x00 and something else entirely in class 0x02, so the class is part of the
   identity rather than a variant of it. (Septentrio differs: ONE uint16 packing a
   block number and a revision, hence a bare number there.)

   The class is reported with bit 7 MASKED OFF, so the pages of a large frame
   carry the same id as a standard frame of that class — the pagination is
   framing, not identity. Locked as decision D4 in docs/STATUS.md. */
export const logId = (messageClass: number, message: number): string =>
  `${messageClass & CLASS_MASK}:${message}`

// ASCII <-> bytes. NMEA 0183 is ASCII, so a byte IS a character: no
// TextEncoder/TextDecoder, which keeps this package runtime-agnostic (node, deno,
// bun, web) like the rest of the monorepo.
export const toText = (bytes: Uint8Array): string => {
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte)
  return text
}

export const toBytes = (text: string): Uint8Array => {
  const bytes = new Uint8Array(text.length)
  for (let index = 0; index < text.length; index++) bytes[index] = text.charCodeAt(index) & 0xFF
  return bytes
}

/* The parser accepts input in EITHER form and normalises to BYTES at the door.

   The asymmetry is what decides the direction: NMEA 0183 is a strict ASCII
   subset, so bytes -> text is always lossless, while an eCom payload is arbitrary
   bytes and text -> bytes only round-trips byte-per-character. A caller who
   UTF-8-decoded the stream has already destroyed it before we see it, so bytes is
   the canonical form and a string is read as one byte per character. */
export const asBytes = (data: string | Uint8Array): Uint8Array => (typeof data === 'string') ? toBytes(data) : data

const ASCII_PRINTABLE_FROM = 0x20
const ASCII_PRINTABLE_TO = 0x7E
const ASCII_CR = 0x0D
const ASCII_LF = 0x0A
const ASCII_TAB = 0x09

// What may appear inside an NMEA sentence on this wire: printable ASCII plus the
// terminator characters. A byte outside this set ends the text run — which is how
// the mixed stream is split without either framing guessing about the other.
export const isTextByte = (byte: number): boolean =>
  (byte >= ASCII_PRINTABLE_FROM && byte <= ASCII_PRINTABLE_TO) || byte === ASCII_CR || byte === ASCII_LF || byte === ASCII_TAB

export const isLineFeed = (byte: number): boolean => byte === ASCII_LF
