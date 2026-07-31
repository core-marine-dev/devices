// coded
import { rawNavigationPage } from './raw'

import type { BlockDefinition } from '../../../types'

/* GPSRawCA -> Number: 4017 => "OnChange" interval: 6s
  This block contains the 300 bits of a GPS C/A subframe. It is generated each
  time a new subframe is received, i.e. every 6 seconds.

  NAVBits u4[10] contains the 300 bits of a GPS C/A subframe.

  Encoding: For easier parsing, the bits are stored as a succession of 10 32-bit
  words. Since the actual words in the subframe are 30-bit long, two unused bits
  are inserted in each 32-bit word. More specifically, each 32-bit word has the
  following format:
    Bits 0-5:   6 parity bits (referred to as D25 to D30 in the GPS ICD), XOR-ed
                with the last transmitted bit of the previous word (D*30).
    Bits 6-29:  source data bits (referred to as dn in the GPS ICD). The first
                received bit is the MSB.
    Bits 30-31: Reserved

  NOTE this is the ONE block in §4.2.2 whose words are not simply the bit stream
  chopped into 32s: GPS C/A words are 30 bits, so each 32-bit word here holds a
  30-bit word plus two spare bits, and the parity sits in the LOW six bits. Every
  other block in this category packs the raw stream MSB-first with only the tail
  of the last word unused. A consumer that treats them alike will read GPS C/A
  off by two bits per word — hence 300 bits over 10 words with 20 "unused" bits
  reported, which is the arithmetic, not a claim that they are contiguous.
*/
export const gpsRawCA: BlockDefinition = rawNavigationPage({
  name: 'GPSRawCA',
  number: 4017,
  words: 10,
  bits: 300,
  viterbi: 'notApplicable',
  fifth: 'notApplicable',
  description: 'The 300 bits of one GPS C/A navigation subframe, as broadcast, with the receiver parity check status',
})

/* GPSRawL2C -> Number: 4018 => "OnChange" interval: 12s
  This block contains the 300 bits of a GPS L2C CNAV subframe (the so-called
  Dc(t) data stream).

  NAVBits u4[10] contains the 300 bits of a GPS CNAV subframe.

  Encoding: NAVBits contains all the bits of the frame, including the preamble.
  The first received bit is stored as the MSB of NAVBits[0]. The unused bits in
  NAVBits[9] must be ignored by the decoding software.
*/
export const gpsRawL2C: BlockDefinition = rawNavigationPage({
  name: 'GPSRawL2C',
  number: 4018,
  words: 10,
  bits: 300,
  viterbi: 'count',
  fifth: 'notApplicable',
  description: 'The 300 bits of one GPS L2C CNAV subframe, after Viterbi decoding',
})

/* GPSRawL5 -> Number: 4019 => "OnChange" interval: 6s
  This block contains the 300 bits of a GPS L5 CNAV subframe (the so-called
  Dc(t) data stream).

  NAVBits u4[10] contains the 300 bits of a GPS CNAV subframe.

  Encoding: NAVBits contains all the bits of the frame, including the preamble.
  The first received bit is stored as the MSB of NAVBits[0]. The unused bits in
  NAVBits[9] must be ignored by the decoding software.
*/
export const gpsRawL5: BlockDefinition = rawNavigationPage({
  name: 'GPSRawL5',
  number: 4019,
  words: 10,
  bits: 300,
  viterbi: 'count',
  fifth: 'notApplicable',
  description: 'The 300 bits of one GPS L5 CNAV subframe, after Viterbi decoding',
})
