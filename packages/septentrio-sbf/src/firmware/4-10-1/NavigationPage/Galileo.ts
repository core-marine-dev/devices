// coded
import { rawNavigationPage } from './raw'

import type { BlockDefinition } from '../../../types'

/* GALRawFNAV -> Number: 4022 => "OnChange" interval: 10s
  This block contains the 244 bits of a Galileo F/NAV navigation page, after
  deinterleaving and Viterbi decoding.

  NAVBits u4[8] contains the 244 bits of a Galileo F/NAV page.

  Encoding: the first received bit is stored as the MSB of NAVBits[0]. The unused
  bits in NAVBits[7] must be ignored by the decoding software.
*/
export const galRawFNAV: BlockDefinition = rawNavigationPage({
  name: 'GALRawFNAV',
  number: 4022,
  words: 8,
  bits: 244,
  viterbi: 'count',
  fifth: 'notApplicable',
  description: 'The 244 bits of one Galileo F/NAV navigation page, after deinterleaving and Viterbi decoding',
})

/* GALRawINAV -> Number: 4023 => "OnChange" interval: 2s
  This block contains the 234 bits of a Galileo I/NAV navigation page, after
  deinterleaving and Viterbi decoding.

  Source u1: Bit field:
    Bits 0-4: Signal type from which the bits have been received, as defined in
              4.1.10
    Bit 5:    Set when the nav page is the concatenation of a sub-page received
              from E5b, and a sub-page received from L1BC. In that case, bits 0-4
              are set to L1BC.
    Bit 6:    Reserved
    Bit 7:    Reserved

  NAVBits u4[8] contains the 234 bits of an I/NAV navigation page (in nominal or
  alert mode). Note that the I/NAV page is transmitted as two sub-pages (the
  so-called even and odd pages) of duration 1 second each (120 bits each). In this
  block, the even and odd pages are concatenated, even page first and odd page
  last. The 6 tail bits at the end of the even page are removed (hence a total of
  234 bits). If the even and odd pages have been received from two different
  carriers (E5b and L1), bit 5 of the Source field is set.

  Encoding: NAVBits contains all the bits of the frame, with the exception of the
  synchronization field. The first received bit is stored as the MSB of
  NAVBits[0]. The unused bits in NAVBits[7] must be ignored by the decoding
  software.

  THE ONE BLOCK IN §4.2.2 WHOSE `Source` HAS A SECOND MEANING. Bit 5 says the page
  was assembled from two different carriers, and the datasheet is explicit that
  bits 0-4 then report L1BC — i.e. the signal number alone is NOT the whole story
  about where the page came from. Decoding bit 5 is therefore not decoration: a
  consumer that ignores it will attribute half of a concatenated page to the wrong
  carrier. Reported as `concatenatedFromTwoCarriers`.
*/
export const galRawINAV: BlockDefinition = rawNavigationPage({
  name: 'GALRawINAV',
  number: 4023,
  words: 8,
  bits: 234,
  viterbi: 'count',
  fifth: 'notApplicable',
  concatenatedPage: true,
  description: 'The 234 bits of one Galileo I/NAV navigation page — the even and odd sub-pages concatenated, tail bits removed — after deinterleaving and Viterbi decoding',
})
