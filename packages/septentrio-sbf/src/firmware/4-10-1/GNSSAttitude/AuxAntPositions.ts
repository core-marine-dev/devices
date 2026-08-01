// coded
import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* AuxAntPositions -> Number: 5942 => "OnChange" interval: default PVT output rate
  The AuxAntPositions block contains the relative position and velocity of the
  different antennas in a multi-antenna receiver.
  The coordinates are expressed in the local-level ENU reference frame.

  When the antenna positions cannot be estimated, the baseline vectors are set
  to their Do-Not-Use value.

  AuxAntPositions -------------------------------------------------------------
  Block fields           Type  Units  Do-Not-Use  Description
  N                     uint8                     Number of AuxAntPositionSub sub-blocks in this AuxAntPositions block
  SBLength              uint8  bytes              Length of one sub-block in bytes
  AuxAntPositionSub[N]                            A succession of N AuxAntPositionSub sub-blocks
  Padding                uint                     Padding bytes

  AuxAntPositionSub -----------------------------------------------------------
  Block fields           Type  Units  Do-Not-Use  Description
  NrSV                  uint8                255  Total number of satellites tracked by the antenna identified by the AuxAntID field and used in the attitude computation
  Error                 uint8                     Aux antenna position error code:
                                                    0: No error
                                                    1: Not enough measurements
                                                    2: Reserved
                                                    3: Reserved
                                                    If error is not 0, the coordinates reported later in this block are all set to their Do-Not-Use value
  AmbiguityType         uint8                255  Aux antenna positions obtained with
                                                    0: Fixed ambiguities
                                                    1: Float ambiguities
  AuxAntID              uint8                     Auxiliary antenna ID: 1 for the first auxiliary antenna, 2 for the second, etc...
  DeltaEast           float64      m   -2 * 10¹⁰  Position in East direction  (relative to main antenna)
  DeltaNorth          float64      m   -2 * 10¹⁰  Position in North direction (relative to main antenna)
  DeltaUp             float64      m   -2 * 10¹⁰  Position in Up direction    (relative to main antenna)
  EastVel             float64  m/sec   -2 * 10¹⁰  Velocity in East direction  (relative to main antenna)
  NorthVel            float64  m/sec   -2 * 10¹⁰  Velocity in North direction (relative to main antenna)
  UpVel               float64  m/sec   -2 * 10¹⁰  Velocity in Up direction    (relative to main antenna)
  Padding                uint

  The sub-block fields are FLATTENED into the payload in wire order (N,
  SBLength, then N × the sub-block), so every field keeps a real CMA type and
  the measurements stay in the mandatory part of the output. The same fields are
  mirrored, grouped per antenna, at metadata.subBlocks — read antenna i as
  metadata.subBlocks[i] with no index arithmetic. SBLength is honoured rather
  than assumed, so a firmware that adds fields to the sub-block is skipped
  cleanly instead of drifting.
*/
const AUX_ANT_POSITION_SUB: readonly FieldDefinition[] = [
  { name: 'NrSV', type: 'uint8', doNotUse: 255, description: 'Total number of satellites tracked by this antenna and used in the attitude computation' },
  { name: 'Error', type: 'uint8', description: 'Aux antenna position error code. When not 0, every coordinate in this sub-block is set to its Do-Not-Use value' },
  { name: 'AmbiguityType', type: 'uint8', doNotUse: 255, description: 'Ambiguities the aux antenna position was obtained with: 0 fixed, 1 float' },
  { name: 'AuxAntID', type: 'uint8', description: 'Auxiliary antenna ID: 1 for the first auxiliary antenna, 2 for the second, etc.' },
  { name: 'DeltaEast', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Position in the East direction, relative to the main antenna' },
  { name: 'DeltaNorth', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Position in the North direction, relative to the main antenna' },
  { name: 'DeltaUp', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Position in the Up direction, relative to the main antenna' },
  { name: 'EastVel', type: 'float64', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Velocity in the East direction, relative to the main antenna' },
  { name: 'NorthVel', type: 'float64', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Velocity in the North direction, relative to the main antenna' },
  { name: 'UpVel', type: 'float64', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Velocity in the Up direction, relative to the main antenna' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of AuxAntPositionSub sub-blocks in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one sub-block in bytes' },
  { name: 'AuxAntPositionSub', count: 'N', length: 'SBLength', fields: AUX_ANT_POSITION_SUB, description: 'A succession of N AuxAntPositionSub sub-blocks' },
]

export const AUX_ANT_ERROR_CODE: Readonly<Record<number, string>> = {
  0: 'NO_ERROR',
  1: 'NOT_ENOUGH_MEASUREMENTS',
  2: 'RESERVED',
  3: 'RESERVED',
}

export const AMBIGUITY_TYPE: Readonly<Record<number, string>> = {
  0: 'FIXED_AMBIGUITIES',
  1: 'FLOAT_AMBIGUITIES',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Error: (value) => label(AUX_ANT_ERROR_CODE, value),
  AmbiguityType: (value) => label(AMBIGUITY_TYPE, value),
}

export const auxAntPositions: BlockDefinition = {
  name: 'AuxAntPositions',
  number: 5942,
  description: 'Relative position and velocity of the auxiliary antennas of a multi-antenna receiver, in the local-level ENU frame',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
