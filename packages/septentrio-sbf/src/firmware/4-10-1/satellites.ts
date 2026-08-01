// installed
import type { Metadata } from '@coremarine/protocol-core'

// coded
import type { Decoder } from '../../types'

/* §4.1.9 — Satellite ID and GLONASS frequency number.

  Satellites are identified by the SVID (or PRN) and FreqNr fields, defined as in
  the table below. This table is only valid for the currently-supported
  constellations and signal types (§4.1.10). To ensure compatibility with future
  SBF upgrades, decoding software must ignore SBF blocks and sub-blocks of which
  the satellite ID field or the signal number field is undefined in this document.

  Field       Type Do-Not-Use  Description                                           RINEX code
  SVID or PRN   u1          0  1-37:    PRN number of a GPS satellite                Gnn (nn = SVID)
                               38-61:   Slot number of a GLONASS satellite with an   Rnn (nn = SVID-37)
                                        offset of 37 (R01 to R24)
                               62:      GLONASS satellite of which the slot number   NA
                                        is not known
                               63-68:   Slot number of a GLONASS satellite with an   Rnn (nn = SVID-38)
                                        offset of 38 (R25 to R30)
                               71-106:  PRN number of a GALILEO satellite with an    Enn (nn = SVID-70)
                                        offset of 70
                               107-119: L-Band (MSS) satellite. Corresponding        NA
                                        satellite name can be found in the
                                        LBandBeams block.
                               120-140: PRN number of an SBAS satellite              Snn (nn = SVID-100)
                                        (S120 to S140)
                               141-180: PRN number of a BeiDou satellite with an     Cnn (nn = SVID-140)
                                        offset of 140
                               181-187: PRN number of a QZSS satellite with an       Jnn (nn = SVID-180)
                                        offset of 180
                               191-197: PRN number of a NavIC/IRNSS satellite with   Inn (nn = SVID-190)
                                        an offset of 190 (I01 to I07)
                               198-215: PRN number of an SBAS satellite with an      Snn (nn = SVID-157)
                                        offset of 57 (S141 to S158)
                               216-222: PRN number of a NavIC/IRNSS satellite with   Inn (nn = SVID-208)
                                        an offset of 208 (I08 to I14)
                               223-245: PRN number of a BeiDou satellite with an     Cnn (nn = SVID-182)
                                        offset of 182 (C41 to C63)
  FreqNr        u1          0  GLONASS frequency number, with an offset of 8. It ranges from 1
                               (corresponding to an actual frequency number of -7) to 21 (corresponding
                               to an actual frequency number of 13). For non-GLONASS satellites, FreqNr
                               is reserved and must be ignored by the decoding software.

  The RINEX code is the point of this table: `G12`, `R07`, `E31` is how a human —
  and every GNSS tool on the planet — names a satellite, whereas SVID 191 means
  nothing to anyone. That is what the decoder publishes, alongside the
  constellation and the in-constellation number.

  Note the ranges are NOT one offset per constellation: BeiDou, SBAS, GLONASS and
  NavIC each have two disjoint ranges with DIFFERENT offsets, because they were
  extended after the numbering was fixed. Hence a table of ranges rather than
  arithmetic.
*/
interface SVIDRange {
  from: number
  to: number
  constellation: string
  // Subtracted from the SVID to get the in-constellation number.
  offset: number
  // The RINEX system letter; absent for the ranges the datasheet marks NA.
  letter?: string
}

const RANGES: readonly SVIDRange[] = [
  { from: 1, to: 37, constellation: 'GPS', offset: 0, letter: 'G' },
  { from: 38, to: 61, constellation: 'GLONASS', offset: 37, letter: 'R' },
  { from: 62, to: 62, constellation: 'GLONASS', offset: 62 },
  { from: 63, to: 68, constellation: 'GLONASS', offset: 38, letter: 'R' },
  { from: 71, to: 106, constellation: 'Galileo', offset: 70, letter: 'E' },
  { from: 107, to: 119, constellation: 'MSS', offset: 106 },
  { from: 120, to: 140, constellation: 'SBAS', offset: 100, letter: 'S' },
  { from: 141, to: 180, constellation: 'BeiDou', offset: 140, letter: 'C' },
  { from: 181, to: 187, constellation: 'QZSS', offset: 180, letter: 'J' },
  { from: 191, to: 197, constellation: 'NavIC/IRNSS', offset: 190, letter: 'I' },
  { from: 198, to: 215, constellation: 'SBAS', offset: 157, letter: 'S' },
  { from: 216, to: 222, constellation: 'NavIC/IRNSS', offset: 208, letter: 'I' },
  { from: 223, to: 245, constellation: 'BeiDou', offset: 182, letter: 'C' },
]

export interface Satellite {
  constellation: string
  number: number
  rinex?: string
}

const pad = (value: number): string => String(value).padStart(2, '0')

// SVID -> the satellite it names. `undefined` for a code §4.1.9 does not define,
// which a consumer must ignore rather than guess at.
export const satellite = (svid: number): Satellite | undefined => {
  const range = RANGES.find((entry) => svid >= entry.from && svid <= entry.to)
  if (range === undefined) return undefined
  const number = svid - range.offset
  return (range.letter === undefined)
    ? { constellation: range.constellation, number }
    : { constellation: range.constellation, number, rinex: `${range.letter}${pad(number)}` }
}

// The GLONASS FDMA frequency number: carried with an offset of 8, so 1 means -7.
// 0 is the Do-Not-Use value and the field is reserved for every other
// constellation — neither of which this can tell on its own, so the caller
// decides when to ask.
export const glonassFrequencyNumber = (freqNr: number): number => freqNr - 8

const L1_CENTRE_MHZ = 1602.00
const L2_CENTRE_MHZ = 1246.00
const L1_STEP_MHZ = 9 / 16
const L2_STEP_MHZ = 7 / 16

// §4.1.10: the two GLONASS FDMA bands are the only signals whose carrier
// frequency is per-SATELLITE rather than per-signal.
export const glonassCarrier = (signalNumber: number, freqNr: number): number | undefined => {
  const channel = glonassFrequencyNumber(freqNr)
  if (signalNumber === 8 || signalNumber === 9) return L1_CENTRE_MHZ + (channel * L1_STEP_MHZ)
  if (signalNumber === 10 || signalNumber === 11) return L2_CENTRE_MHZ + (channel * L2_STEP_MHZ)
  return undefined
}

// The decoder every block with an `SVID` field shares.
export const satelliteId: Decoder = (value): Metadata => {
  const resolved = satellite(value)
  return (resolved === undefined) ? { satellite: null } : { satellite: resolved }
}
