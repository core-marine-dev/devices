// installed
import type { Metadata } from '@coremarine/protocol-core'

// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, bitState } from '../../../utils'
import { glonassFrequencyNumber, satelliteId } from '../satellites'
import { GNSS_SIGNALS } from '../signals'

/* §4.2.2 Navigation Page Blocks — what all fifteen of them share.

  Each block carries the RAW navigation bits of one subframe / page / string, as
  broadcast by one satellite on one signal, with the receiver's own check status
  attached. They are the input to a constellation ICD decoder; the *decoded*
  contents of the same broadcasts are §4.2.3-4.2.8's job.

  Every block has the same six-field header before the bits:

    SVID       u1  Satellite ID, see 4.1.9
    CRCPassed  u1  Status of the CRC or parity check:
                     0: CRC or parity check failed
                     1: CRC or parity check passed
    ViterbiCnt u1  Viterbi decoder error count over the subframe / page / frame
                   (or "Not applicable" on the signals that are not
                   convolutionally coded)
    Source     u1  The signal the bits were received from, as defined in 4.1.10
                   — either as a bit field (bits 0-4 signal type, 5-7 reserved)
                   or, on the BeiDou and NavIC blocks, as a plain value
    FreqNr     u1  "Not applicable", EXCEPT on GLORawCA where it is the GLONASS
                   frequency number with an offset of 8 (see 4.1.9). On the
                   BeiDou, NavIC and QZSS L2C/L5 blocks this byte is Reserved
                   rather than FreqNr.
    RxChannel  u1  Receiver channel (see 4.1.11)
    NAVBits u4[N]  The bits themselves
    Padding u1[..] Padding bytes, see 4.1.5

  The TOW/WNc of every one of these blocks is an **SIS time stamp** — the moment
  the satellite TRANSMITTED the bits, which is not the receiver's own epoch and
  may be well in the past. That is why `timestamp: 'sis'` here, and why these
  blocks are the ones NOT promoted to `cma.timestamp` (see docs/STATUS.md
  §LOCKED decisions): overwriting the host clock with a signal-in-space time
  would move the sentence's own time backwards.

  ---------------------------------------------------------------------------
  HOW `NAVBits` IS PUBLISHED, and why it is one field and not N.

  The datasheet lists it as ONE row — `NAVBits u4[N]` — so it is one payload
  field, keeping the payload aligned 1:1 with the table. CMA has no byte-array
  type (deliberately), so this uses the same `format` escape the IP/MAC address
  fields use: the bytes stay in `raw` (base64), and `value` becomes the words in
  the form a decoder actually needs.

  That form is HEX WORDS, not a hex dump of the wire bytes. The distinction
  matters: the words are little-endian on the wire, so a straight byte dump
  presents each 32-bit word back-to-front, while every constellation ICD numbers
  the bits from the MSB of the word ("The first received bit is stored as the MSB
  of NAVBits[0]"). Printing the assembled words means bit 0 of the output is the
  first bit the satellite sent, which is the only presentation that lines up with
  the ICDs.

  The trailing bits of the last word are unused on every block whose bit count is
  not a multiple of 32, and the datasheet says they "must be ignored by the
  decoding software" — so the meaningful bit count is published in
  `metadata.payload` rather than left for the consumer to look up.
*/
const HEX_DIGITS_PER_WORD = 8
const BITS_PER_WORD = 32
const BYTES_PER_WORD = 4

// The u4 words of NAVBits, little-endian, as space-separated 8-digit hex.
const navigationWords = (bytes: Uint8Array): string => {
  const words: string[] = []
  for (let offset = 0; offset + BYTES_PER_WORD <= bytes.byteLength; offset += BYTES_PER_WORD) {
    const word = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
    words.push((word >>> 0).toString(16).toUpperCase().padStart(HEX_DIGITS_PER_WORD, '0'))
  }
  return words.join(' ')
}

// Which byte sits in the fifth slot, and what it means there.
export type FifthByte = 'frequency' | 'notApplicable' | 'reserved'

// Whether the signal is convolutionally coded, i.e. whether ViterbiCnt is a real
// error count or the datasheet's "Not applicable".
export type ViterbiKind = 'count' | 'notApplicable' | 'reserved'

export interface RawNavigationPage {
  name: string
  number: number
  // NAVBits u4[N]
  words: number
  // The meaningful bit or symbol count, per the datasheet's own prose.
  bits: number
  // 'bits' for everything except the two BeiDou CNAV blocks, whose datasheet
  // rows count SYMBOLS — they are pre-Viterbi, so the distinction is real.
  unit?: 'bits' | 'symbols'
  description: string
  // A bit field (bits 0-4 signal type) or a plain signal number. BeiDou and
  // NavIC use the plain form.
  source?: 'bitfield' | 'plain'
  viterbi?: ViterbiKind
  fifth?: FifthByte
  // GALRawINAV only: Source bit 5 marks a page assembled from two carriers.
  concatenatedPage?: boolean
  // BDSRawB1C only: a B-CNAV1 frame carries three subframes and the receiver
  // checks two of them SEPARATELY, so that block has CRCSF2 + CRCSF3 where every
  // other block has CRCPassed + ViterbiCnt. Same two bytes, different question.
  checks?: 'beidouSubframes' | 'single'
}

const CRC_PASSED: Readonly<Record<number, string>> = { 0: 'FAILED', 1: 'PASSED' }

const signalFromSource = (value: number, source: 'bitfield' | 'plain'): number =>
  (source === 'bitfield') ? bits(value, 0, 4) : value

// Source -> the §4.1.10 signal it names. Published as the signal, not the index:
// "the bits came from Galileo E5b" is the fact, 21 is an implementation detail.
const sourceDecoder = (page: RawNavigationPage): Decoder => (value): Metadata => {
  const number = signalFromSource(value, page.source ?? 'bitfield')
  const signal = GNSS_SIGNALS[number]
  const metadata: Metadata = {
    signalNumber: number,
    signal: (signal === undefined) ? null : { ...signal },
  }
  // GALRawINAV: the even and odd sub-pages may arrive on E5b and L1BC
  // respectively, in which case bits 0-4 report L1BC and this bit says so.
  if (page.concatenatedPage === true) metadata.concatenatedFromTwoCarriers = bitState(value, 5)
  return metadata
}

const fifthField = (page: RawNavigationPage): FieldDefinition => {
  if (page.fifth === 'frequency') {
    return { name: 'FreqNr', type: 'uint8', description: 'GLONASS frequency number with an offset of 8, so 1 means -7 and 21 means 13 (§4.1.9)' }
  }
  if (page.fifth === 'reserved') {
    return { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' }
  }
  // "Not applicable" is not the same as reserved: the field exists and the
  // datasheet says it carries nothing on this signal. Flagged so nobody reads it.
  return { name: 'FreqNr', type: 'uint8', reserved: true, description: 'Not applicable on this signal' }
}

const viterbiField = (page: RawNavigationPage): FieldDefinition => {
  if (page.viterbi === 'count') {
    return { name: 'ViterbiCnt', type: 'uint8', description: 'Viterbi decoder error count over this subframe, page or frame' }
  }
  if (page.viterbi === 'reserved') {
    return { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved' }
  }
  return { name: 'ViterbiCnt', type: 'uint8', reserved: true, description: 'Not applicable on this signal, which is not convolutionally coded' }
}

const subframeCheck = (name: string, subframe: number): FieldDefinition =>
  ({ name, type: 'uint8', description: `Status of the CRC check of subframe ${subframe}: 0 failed, 1 passed` })

// The two check bytes: one CRC/parity status plus a Viterbi count for fourteen of
// the fifteen blocks, and two independent subframe CRCs for BDSRawB1C.
const checkFields = (page: RawNavigationPage): readonly FieldDefinition[] =>
  (page.checks === 'beidouSubframes')
    ? [subframeCheck('CRCSF2', 2), subframeCheck('CRCSF3', 3)]
    : [{ name: 'CRCPassed', type: 'uint8', description: 'Status of the CRC or parity check: 0 failed, 1 passed' }, viterbiField(page)]

const fields = (page: RawNavigationPage): readonly FieldDefinition[] => [
  { name: 'SVID', type: 'uint8', description: 'Satellite ID (§4.1.9)' },
  ...checkFields(page),
  {
    name: 'Source',
    type: 'uint8',
    description: (page.source === 'plain')
      ? 'Signal type the bits were received from (§4.1.10)'
      : 'Bit field: bits 0-4 the signal type the bits were received from (§4.1.10), bits 5-7 reserved',
  },
  fifthField(page),
  { name: 'RxChannel', type: 'uint8', description: 'Receiver channel (§4.1.11)' },
  {
    name: 'NAVBits',
    type: 'string',
    length: page.words * BYTES_PER_WORD,
    format: navigationWords,
    description: `The ${page.bits} ${page.unit ?? 'bits'} of the broadcast, as ${page.words} 32-bit words in hex; the first bit received is the MSB of the first word`,
  },
]

// The QZSS L1CA block puts a plain Reserved byte where the others put
// ViterbiCnt, so it ends up with TWO reserved bytes and the datasheet names the
// second one Reserved2. Renaming keeps the payload free of duplicate names.
const deduplicate = (definitions: readonly FieldDefinition[]): readonly FieldDefinition[] => {
  const seen = new Set<string>()
  return definitions.map((definition) => {
    if (!seen.has(definition.name)) {
      seen.add(definition.name)
      return definition
    }
    return { ...definition, name: `${definition.name}2` }
  })
}

const checked = (value: number): Metadata => ({ label: CRC_PASSED[value] ?? 'UNKNOWN', passed: value === 1 })

const flag = (value: unknown): boolean | null => (typeof value === 'number') ? value === 1 : null

// Whether the frame is usable, and by whose account. For BDSRawB1C there is no
// single answer — subframe 2 can pass while subframe 3 fails — so both are
// reported and `valid` requires BOTH, rather than picking one and calling it the
// frame.
const validity = (page: RawNavigationPage, values: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  if (page.checks !== 'beidouSubframes') return { valid: flag(values.CRCPassed) }
  const subframe2 = flag(values.CRCSF2)
  const subframe3 = flag(values.CRCSF3)
  return {
    subframe2,
    subframe3,
    valid: (subframe2 === null || subframe3 === null) ? null : (subframe2 && subframe3),
  }
}

export const rawNavigationPage = (page: RawNavigationPage): BlockDefinition => ({
  name: page.name,
  number: page.number,
  description: page.description,
  // SIS: the time the satellite transmitted these bits, NOT a receiver epoch —
  // so it is never promoted over cma.timestamp.
  timestamp: 'sis',
  revisions: [deduplicate(fields(page))],
  decoders: {
    SVID: satelliteId,
    Source: sourceDecoder(page),
    CRCPassed: checked,
    CRCSF2: checked,
    CRCSF3: checked,
    FreqNr: (value) => (page.fifth === 'frequency') ? { value: glonassFrequencyNumber(value) } : {},
  },
  // The one thing a consumer cannot read off the fields: how many of the bits in
  // the last word are real, and whether the receiver's own check passed.
  payloadMetadata: (values) => ({
    navigation: {
      [page.unit ?? 'bits']: page.bits,
      words: page.words,
      // Padding inside the LAST word, which the datasheet says to ignore.
      unusedBitsInLastWord: (page.words * BITS_PER_WORD) - page.bits,
      ...validity(page, values),
    },
  }),
})
