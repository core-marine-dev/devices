// coded
import { rawNavigationPage } from './raw'

import type { BlockDefinition } from '../../../types'

/* GLORawCA -> Number: 4026 => "OnChange" interval: 2s
  This block contains the 85 bits of a GLONASS L1CA or L2CA navigation string.

  FreqNr u1: Frequency number, with an offset of 8. See 4.1.9

  NAVBits u4[3] contains the first 85 bits of a GLONASS C/A string (i.e. all bits
  of the string with the exception of the time mark).

  Encoding: The first received bit is stored as the MSB of NAVBits[0]. The unused
  bits in NAVBits[2] must be ignored by the decoding software.

  The ONLY block in §4.2.2 where FreqNr is real rather than "Not applicable" —
  GLONASS L1/L2 are FDMA, so the carrier a string arrived on is a property of the
  satellite and has to be reported per string. Everywhere else in this category
  that byte carries nothing.
*/
export const gloRawCA: BlockDefinition = rawNavigationPage({
  name: 'GLORawCA',
  number: 4026,
  words: 3,
  bits: 85,
  viterbi: 'notApplicable',
  fifth: 'frequency',
  description: 'The 85 bits of one GLONASS L1CA or L2CA navigation string, excluding the time mark',
})
