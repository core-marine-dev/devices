// coded
import { rawNavigationPage } from './raw'

import type { BlockDefinition } from '../../../types'

/* BDSRaw -> Number: 4047 => "OnChange" interval: 6 seconds (non GEOs), 0.6 s (GEOs)
  This block contains the 300 bits of a BeiDou navigation page, as received from
  the B1I, B2I or B3I signal.

  Source u1: Signal type from which the bits have been received, as defined in
             4.1.10
  Reserved u1: Reserved for future use, to be ignored by decoding software.

  NAVBits u4[10] contains the 300 deinterleaved bits of a BeiDou navigation
  subframe.

  Encoding: NAVBits contains all the bits of the subframe, including the preamble
  and the parity bits. The first received bit is stored as the MSB of NAVBits[0].
  The 20 unused bits in NAVBits[9] must be ignored by the decoding software. The
  bits are deinterleaved.

  The BeiDou and NavIC blocks are where `Source` stops being a bit field and
  becomes a plain signal number, and where the fifth byte is `Reserved` rather
  than `FreqNr`. Same six bytes, different meanings — which is exactly why each
  block declares its own header instead of sharing one hardcoded layout.
*/
export const bdsRaw: BlockDefinition = rawNavigationPage({
  name: 'BDSRaw',
  number: 4047,
  words: 10,
  bits: 300,
  source: 'plain',
  viterbi: 'notApplicable',
  fifth: 'reserved',
  description: 'The 300 deinterleaved bits of one BeiDou D1/D2 navigation subframe, as received from B1I, B2I or B3I',
})

/* BDSRawB2a -> Number: 4219 => "OnChange" interval: 3s
  This block contains the 576 symbols of a BeiDou B-CNAV2 navigation frame, as
  received from the B2a signal.

  NAVBits u4[18] contains the 576 symbols of a BeiDou B2a (B-CNAV2) navigation
  frame.

  SYMBOLS, not bits: B-CNAV2 is LDPC-coded and this block carries the frame
  BEFORE error correction, so 576 is a symbol count and the payload metadata says
  so rather than calling them bits. 18 words x 32 = 576 exactly, so this is the
  one block in the category with no unused tail at all.
*/
export const bdsRawB2a: BlockDefinition = rawNavigationPage({
  name: 'BDSRawB2a',
  number: 4219,
  words: 18,
  bits: 576,
  unit: 'symbols',
  source: 'plain',
  viterbi: 'notApplicable',
  fifth: 'reserved',
  description: 'The 576 symbols of one BeiDou B-CNAV2 navigation frame, as received from B2a',
})

/* BDSRawB1C -> Number: 4218 => "OnChange" interval: 18s
  This block contains the 1800 symbols of a BeiDou B-CNAV1 navigation frame
  (itself containing three subframes), as received from the B1C signal.

  BDSRawB1C ------------------------------------------------------------------
  Block fields       Type  Units Do-Not-Use  Description
  SVID              uint8                    Satellite ID, see 4.1.9
  CRCSF2            uint8                    Status of the CRC check of subframe 2:
                                               0: CRC check failed
                                               1: CRC check passed
  CRCSF3            uint8                    Status of the CRC check of subframe 3:
                                               0: CRC check failed
                                               1: CRC check passed
  Source            uint8                    Signal type from which the bits have been received, as defined in 4.1.10
  Reserved          uint8                    Reserved for future use, to be ignored by decoding software.
  RxChannel         uint8                    Receiver channel (see 4.1.11).
  NAVBits        uint32[57]                  NAVBits contains the 1800 deinterleaved symbols of a BeiDou B1C frame.
  Padding            uint                    Padding bytes, see 4.1.5

  THE ONE BLOCK IN §4.2.2 WITH NO `CRCPassed` AND NO `ViterbiCnt`. A B-CNAV1
  frame carries three subframes, and the receiver checks two of them
  INDEPENDENTLY, so there are two check-status bytes instead of one. Consequence
  worth stating: "is this frame valid?" has no single answer here — subframe 2 can
  pass while subframe 3 fails. So both are reported, and `valid` is true only when
  BOTH passed, rather than promoting one of them to speak for the frame.
*/
export const bdsRawB1C: BlockDefinition = rawNavigationPage({
  name: 'BDSRawB1C',
  number: 4218,
  words: 57,
  bits: 1800,
  unit: 'symbols',
  source: 'plain',
  checks: 'beidouSubframes',
  fifth: 'reserved',
  description: 'The 1800 symbols of one BeiDou B-CNAV1 navigation frame — three subframes — as received from B1C, with the CRC status of subframes 2 and 3',
})
