// coded
import { rawNavigationPage } from './raw'

import type { BlockDefinition } from '../../../types'

/* QZSRawL1CA -> Number: 4066 => "OnChange" interval: 6s
  This block contains the 300 bits of a QZSS C/A subframe.

  NAVBits u4[10] contains the 300 bits of a QZSS C/A subframe.

  The odd one out of the three QZSS blocks: where every other block in §4.2.2 has
  `ViterbiCnt` in the third byte, this one has a plain `Reserved` — QZSS L1 C/A is
  not convolutionally coded, and the datasheet does not even give the byte a name
  here. That leaves the block with TWO reserved bytes, which the datasheet
  distinguishes as `Reserved` and `Reserved2`.
*/
export const qzsRawL1CA: BlockDefinition = rawNavigationPage({
  name: 'QZSRawL1CA',
  number: 4066,
  words: 10,
  bits: 300,
  viterbi: 'reserved',
  fifth: 'reserved',
  description: 'The 300 bits of one QZSS L1 C/A navigation subframe, as broadcast',
})

/* QZSRawL2C -> Number: 4067 => "OnChange" interval: 12s
  This block contains the 300 bits of a QZSS L2C CNAV subframe.

  NAVBits u4[10] contains the 300 bits of a QZSS CNAV subframe.

  Encoding: NAVBits contains all the bits of the frame, including the preamble.
  The first received bit is stored as the MSB of NAVBits[0]. The unused bits in
  NAVBits[9] must be ignored by the decoding software.
*/
export const qzsRawL2C: BlockDefinition = rawNavigationPage({
  name: 'QZSRawL2C',
  number: 4067,
  words: 10,
  bits: 300,
  viterbi: 'count',
  fifth: 'reserved',
  description: 'The 300 bits of one QZSS L2C CNAV subframe, after Viterbi decoding',
})

/* QZSRawL5 -> Number: 4068 => "OnChange" interval: 6s
  This block contains the 300 bits of a QZSS L5 CNAV subframe.

  NAVBits u4[10] contains the 300 bits of a QZSS CNAV subframe.

  Encoding: NAVBits contains all the bits of the frame, including the preamble.
  The first received bit is stored as the MSB of NAVBits[0]. The unused bits in
  NAVBits[9] must be ignored by the decoding software.
*/
export const qzsRawL5: BlockDefinition = rawNavigationPage({
  name: 'QZSRawL5',
  number: 4068,
  words: 10,
  bits: 300,
  viterbi: 'count',
  fifth: 'reserved',
  description: 'The 300 bits of one QZSS L5 CNAV subframe, after Viterbi decoding',
})
