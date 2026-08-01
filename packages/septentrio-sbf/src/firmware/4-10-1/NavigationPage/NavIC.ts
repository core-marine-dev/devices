// coded
import { rawNavigationPage } from './raw'

import type { BlockDefinition } from '../../../types'

/* NAVICRaw -> Number: 4093 => "OnChange" interval: 12s
  This block contains the 292 bits of a NavIC/IRNSS subframe.

  Source u1: Signal type from which the bits have been received, as defined in
             4.1.10
  Reserved u1: Reserved for future use, to be ignored by decoding software.

  NAVBits u4[10] contains the 292 bits of a NavIC/IRNSS subframe.

  Like the BeiDou blocks, `Source` here is a plain signal number rather than a bit
  field, and the fifth byte is Reserved rather than FreqNr. NavIC L5 is signal
  number 15 in §4.1.10, and §4.1.9 gives its satellites two disjoint SVID ranges
  (191-197 and 216-222) — both of which `satellites.ts` already resolves.
*/
export const navicRaw: BlockDefinition = rawNavigationPage({
  name: 'NAVICRaw',
  number: 4093,
  words: 10,
  bits: 292,
  source: 'plain',
  viterbi: 'count',
  fifth: 'reserved',
  description: 'The 292 bits of one NavIC/IRNSS navigation subframe, after Viterbi decoding',
})
