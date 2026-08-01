// coded
import type { BlockDefinition } from '../../../types'

/* EndOfMeas -> Number: 5922 => "OnChange" interval: internal measurement rate
  (receiver-type dependent)

  This block marks the end of the transmission of all measurement-related blocks
  belonging to a given epoch.

  EndOfMeas -----------------------------------------------------------------
  Block fields           Type    Units Do-Not-Use  Description
  Sync1                  c1
  Sync2                  c1
  CRC                    u2                        Block Header, see 4.1.1
  ID                     u2
  Length                 u2      1 byte
  TOW                    u4      0.001 s 4294967295
                                                   Receiver time stamp, see 4.1.3
  WNc                    u2      1 week  65535

  The table stops there — this block has no body at all, not even a Padding row.
  The whole content is the time stamp, which is the point: it says "every
  measurement block for this epoch has now been sent", so a consumer can close the
  epoch instead of waiting on a timeout. Same shape as EndOfPVT and EndOfAtt.

  Real frames are 16 bytes, i.e. two bytes past the 14-byte header+time floor,
  because §4.1.1 rounds every block up to a multiple of 4. Those two bytes land in
  metadata.padding, and §4.1.5 says their value is undefined — so they are kept as
  bytes and never read as a number.
*/
export const endOfMeas: BlockDefinition = {
  name: 'EndOfMeas',
  number: 5922,
  description: 'Marks the end of transmission of all measurement blocks belonging to the same epoch',
  timestamp: 'receiver',
  revisions: [[]],
}
