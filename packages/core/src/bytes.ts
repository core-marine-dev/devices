// Byte helpers shared by the BINARY protocol parsers (Septentrio SBF, SBG
// sbgECom). Deliberately free of any runtime API: no `Buffer`, no `btoa`, no
// `TextEncoder` — the parser libraries must run on node, deno, bun AND the
// browser, so everything here is plain arithmetic over a Uint8Array.
//
// Base64 is the CMA representation of `raw` for binary protocols, at both
// sentence and field level (see docs/CMA.md), which is why it lives in core
// rather than in one parser.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const PAD = '='

// Reverse lookup, built once. -1 = not a base64 character.
const CODES = ((): Int8Array => {
  const codes = new Int8Array(128).fill(-1)
  for (let index = 0; index < ALPHABET.length; index++) {
    codes[ALPHABET.charCodeAt(index)] = index
  }
  return codes
})()

// Uint8Array -> base64 string. Encodes 3 bytes at a time into 4 characters,
// padding the final group with '=' as the standard requires.
export const toBase64 = (bytes: Uint8Array): string => {
  let output = ''
  let index = 0
  for (; index + 2 < bytes.length; index += 3) {
    const triplet = (bytes[index] << 16) | (bytes[index + 1] << 8) | bytes[index + 2]
    output += ALPHABET[(triplet >>> 18) & 0x3F] + ALPHABET[(triplet >>> 12) & 0x3F]
    output += ALPHABET[(triplet >>> 6) & 0x3F] + ALPHABET[triplet & 0x3F]
  }
  const remaining = bytes.length - index
  if (remaining === 1) {
    const chunk = bytes[index] << 16
    output += ALPHABET[(chunk >>> 18) & 0x3F] + ALPHABET[(chunk >>> 12) & 0x3F] + PAD + PAD
  }
  if (remaining === 2) {
    const chunk = (bytes[index] << 16) | (bytes[index + 1] << 8)
    output += ALPHABET[(chunk >>> 18) & 0x3F] + ALPHABET[(chunk >>> 12) & 0x3F]
    output += ALPHABET[(chunk >>> 6) & 0x3F] + PAD
  }
  return output
}

// base64 string -> Uint8Array. Unknown characters (whitespace, padding, junk)
// are skipped rather than throwing: this is used on data that already failed
// validation elsewhere, and a Result would be noise for a pure decoder.
export const fromBase64 = (text: string): Uint8Array => {
  const bytes = new Uint8Array(Math.floor((text.length * 3) / 4))
  let length = 0
  let accumulator = 0
  let bits = 0
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    const value = (code < 128) ? CODES[code] : -1
    if (value === -1) continue
    accumulator = (accumulator << 6) | value
    bits += 6
    if (bits < 8) continue
    bits -= 8
    bytes[length] = (accumulator >>> bits) & 0xFF
    length += 1
  }
  return bytes.subarray(0, length)
}
