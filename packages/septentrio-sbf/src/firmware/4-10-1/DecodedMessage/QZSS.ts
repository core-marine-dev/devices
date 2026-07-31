// coded
import { almanacDecoders, almanacFields, gpsNavDecoders, gpsNavFields } from './GPS'
import { reserved } from './keplerian'

import type { BlockDefinition } from '../../../types'

/* §4.2.7 QZSS Decoded Message Blocks.

  QZSNav -> Number: 4095 => "OnChange" interval: block generated each time a new
  navigation data set is received from a QZSS satellite

  The QZSNav block contains the decoded navigation data for one QZSS satellite. The
  data is decoded from the navigation message transmitted in the L1 C/A signal.
  Refer to the QZSS ICD for further details.

  ITS FIELD TABLE IS GPSNav's, ROW FOR ROW — QZSS was designed to be GPS-compatible
  and broadcasts the same L1 C/A message structure, so the datasheet prints the
  same 36 rows. Two rows carry a QZSS-specific note rather than a different type:
  `CAorPonL2` is "always 2 for QZSS satellites" and `L2DataFlag` "always 1". Its
  `T_gd` also documents a Do-Not-Use value that GPSNav's does not, which is a
  difference in what the receiver may report, not in the layout.

  Sharing the table is therefore the honest modelling, not a shortcut: if the two
  ever diverge, they diverge in the datasheet first and this is the one place that
  has to change.
*/
export const qzsNav: BlockDefinition = {
  name: 'QZSNav',
  number: 4095,
  description: 'Decoded ephemeris and clock parameters for one QZSS satellite, from the L1 C/A navigation message',
  timestamp: 'sis',
  revisions: [gpsNavFields],
  decoders: gpsNavDecoders,
}

/* QZSAlm -> Number: 4116 => "OnChange" interval: block generated each time a new
  almanac data set is received from a QZSS satellite

  The QZSAlm block contains the decoded almanac data for one QZSS satellite. These
  data are conveyed in subframes 4 and 5 of the satellite navigation message.

  GPSAlm's table with ONE substitution: where GPS carries `config` (anti-spoofing
  and satellite configuration), QZSS reserves the byte. Same offsets, so the two
  share everything else — and the byte is declared reserved rather than decoded,
  because reporting a GPS anti-spoofing flag off a QZSS reserved byte would be
  inventing a fact about the satellite.

  Its `e` row also reads "Difference from reference eccentricity" and `delta_i`
  "Difference from reference angle of inclination" — the QZSS ICD's own wording for
  the same relative encoding GPS uses.
*/
export const qzsAlm: BlockDefinition = {
  name: 'QZSAlm',
  number: 4116,
  description: 'Decoded almanac — a coarse orbit — for one QZSS satellite, from subframes 4 and 5 of its navigation message',
  timestamp: 'sis',
  revisions: [almanacFields(reserved('Reserved2'))],
  decoders: almanacDecoders,
}
