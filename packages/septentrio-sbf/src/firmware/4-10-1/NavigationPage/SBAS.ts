// coded
import { rawNavigationPage } from './raw'

import type { BlockDefinition } from '../../../types'

/* GEORawL1 -> Number: 4020 => "OnChange" interval: 1s
  This block contains the 250 bits of a SBAS L1 navigation frame, after Viterbi
  decoding.

  NAVBits u4[8] contains the 250 bits of a SBAS navigation frame.

  Encoding: NAVBits contains all the bits of the frame, including the preamble.
  The first received bit is stored as the MSB of NAVBits[0]. The unused bits in
  NAVBits[7] must be ignored by the decoding software.

  These are the RAW frames whose DECODED contents are the fourteen GEO* blocks of
  §4.2.8 — the same broadcast, before and after interpretation.
*/
export const geoRawL1: BlockDefinition = rawNavigationPage({
  name: 'GEORawL1',
  number: 4020,
  words: 8,
  bits: 250,
  viterbi: 'count',
  fifth: 'notApplicable',
  description: 'The 250 bits of one SBAS L1 navigation frame, after Viterbi decoding',
})

/* GEORawL5 -> Number: 4021 => "OnChange" interval: 1s
  This block contains the 250 bits of a SBAS L5 navigation frame, after Viterbi
  decoding.

  NAVBits u4[8] contains the 250 bits of a SBAS navigation frame.

  Encoding: NAVBits contains all the bits of the frame, including the preamble.
  The first received bit is stored as the MSB of NAVBits[0]. The unused bits in
  NAVBits[7] must be ignored by the decoding software.
*/
export const geoRawL5: BlockDefinition = rawNavigationPage({
  name: 'GEORawL5',
  number: 4021,
  words: 8,
  bits: 250,
  viterbi: 'count',
  fifth: 'notApplicable',
  description: 'The 250 bits of one SBAS L5 navigation frame, after Viterbi decoding',
})
