// coded
import { blocks as decodedMessage } from './DecodedMessage'
import { blocks as differentialCorrection } from './DifferentialCorrection'
import { blocks as externalEvent } from './ExternalEvent'
import { blocks as gnssAttitude } from './GNSSAttitude'
import { blocks as gnssPositionVelocityTime } from './GNSSPositionVelocityTime'
import { blocks as lBand } from './LBand'
import { blocks as measurement } from './Measurement'
import { blocks as miscellaneous } from './Miscellaneous'
import { blocks as navigationPage } from './NavigationPage'
import { blocks as receiverTime } from './ReceiverTime'
import { blocks as status } from './Status'

import type { BlockDefinition, BlockRegistry } from '../../types'

// Knowledge base for firmware 4.10.1 (AsteRx SB3 Pro+ reference guide).
//
// Appendix B of that guide lists 108 blocks in 16 categories — counted from the
// appendix itself, block by block, and cross-checked against every number and
// name in this registry. ALL of them are modelled, one folder per §4.2 category:
//
//   §4.2.1  Measurement                        8 of 8   ✔ (the 5 Meas3 blocks are
//                                                          opaque: no published layout)
//   §4.2.2  Navigation Page                   15 of 15  ✔
//   §4.2.3  GPS Decoded Message                4 of 4   ✔
//   §4.2.4  GLONASS Decoded Message            3 of 3   ✔
//   §4.2.5  Galileo Decoded Message            6 of 6   ✔
//   §4.2.6  BeiDou Decoded Message             4 of 4   ✔
//   §4.2.7  QZSS Decoded Message               2 of 2   ✔
//   §4.2.8  SBAS L1 Decoded Message           14 of 14  ✔
//   §4.2.9  GNSS Position, Velocity and Time  15 of 15  ✔
//   §4.2.10 GNSS Attitude                      4 of 4   ✔
//   §4.2.11 Receiver Time                      2 of 2   ✔
//   §4.2.12 External Event                     5 of 5   ✔
//   §4.2.13 Differential Correction            3 of 3   ✔
//   §4.2.14 L-Band Demodulator                 2 of 2   ✔
//   §4.2.15 Status                            14 of 14  ✔ (LBandTrackerStatus, the
//                                                       14th, lives in LBand/ — it is
//                                                       filed under §4.2.14)
//   §4.2.16 Miscellaneous                      7 of 7   ✔
//
// ALL 108 BLOCKS OF APPENDIX B ARE MODELLED. The five Meas3 blocks and the two
// PVTSupport blocks are `opaque` — Septentrio publishes no field layout for them —
// so their bodies are emitted as bytes rather than invented into fields. Every
// other block has its datasheet table transcribed here.
const definitions: readonly BlockDefinition[] = [
  ...measurement,
  ...navigationPage,
  ...decodedMessage,
  ...gnssPositionVelocityTime,
  ...gnssAttitude,
  ...receiverTime,
  ...status,
  ...miscellaneous,
  ...lBand,
  ...differentialCorrection,
  ...externalEvent,
]

export const blocks: BlockRegistry = new Map(definitions.map((block) => [block.number, block]))
