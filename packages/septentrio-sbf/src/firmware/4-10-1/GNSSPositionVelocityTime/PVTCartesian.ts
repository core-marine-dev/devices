// coded
import { pvtCommonDecoders, pvtRevisions } from './pvt-solution'

import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, FieldDefinition } from '../../../types'

/* PVTCartesian -> Number: 4006 => "OnChange" interval: default PVT output rate
  This block contains the GNSS-based position, velocity and time (PVT) solution at
  the time specified in the TOW and WNc fields, in a CARTESIAN (ECEF) coordinate
  system. The same solution is available in ellipsoidal form in PVTGeodetic, and
  the two blocks share every field except the coordinate and velocity triples.

  PVTCartesian ---------------------------------------------------------------
  Block fields     Type  Units Do-Not-Use  Description
  Mode            uint8                    Bit field indicating the GNSS PVT mode (see PVTGeodetic)
  Error           uint8                    PVT error code (see PVTGeodetic)
  X             float64    1 m  -2 * 10¹⁰  X coordinate in the coordinate frame specified by Datum
  Y             float64    1 m  -2 * 10¹⁰  Y coordinate in the coordinate frame specified by Datum
  Z             float64    1 m  -2 * 10¹⁰  Z coordinate in the coordinate frame specified by Datum
  Undulation    float32    1 m  -2 * 10¹⁰  Geoid undulation. See the setGeoidUndulation command.
  Vx            float32  1 m/s  -2 * 10¹⁰  Velocity in the X direction
  Vy            float32  1 m/s  -2 * 10¹⁰  Velocity in the Y direction
  Vz            float32  1 m/s  -2 * 10¹⁰  Velocity in the Z direction
  ...then every field PVTGeodetic has from COG onwards, identically, including the
  same revision 1 (NrBases, PPPInfo) and revision 2 (Latency, HAccuracy,
  VAccuracy, Misc) additions.
  Padding          uint                    Padding bytes

  The shared tail lives in ./pvt-solution.ts so the two blocks cannot drift apart:
  a datasheet change to `AlertFlag` or a new revision has to be made once.
*/
const CARTESIAN_POSITION: readonly FieldDefinition[] = [
  { name: 'X', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'X coordinate in the frame specified by Datum (ECEF)' },
  { name: 'Y', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Y coordinate in the frame specified by Datum (ECEF)' },
  { name: 'Z', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Z coordinate in the frame specified by Datum (ECEF)' },
  { name: 'Undulation', type: 'float32', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Geoid undulation' },
  { name: 'Vx', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Velocity in the X direction' },
  { name: 'Vy', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Velocity in the Y direction' },
  { name: 'Vz', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Velocity in the Z direction' },
]

export const pvtCartesian: BlockDefinition = {
  name: 'PVTCartesian',
  number: 4006,
  description: 'GNSS position, velocity and time in Cartesian ECEF coordinates, at the time of applicability given by TOW and WNc',
  timestamp: 'receiver',
  revisions: pvtRevisions(CARTESIAN_POSITION),
  decoders: pvtCommonDecoders,
  payloadMetadata: ({ X, Y, Z }) => {
    if (typeof X !== 'number' || typeof Y !== 'number' || typeof Z !== 'number') return {}
    return { position: { ecef: { x: X, y: Y, z: Z, units: 'm' } } }
  },
}
