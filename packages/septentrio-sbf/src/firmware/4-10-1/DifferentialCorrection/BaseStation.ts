// coded
import { DO_NOT_USE_UINT8 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* BaseStation -> Number: 5949 => "OnChange" interval: block generated each time a
   differential correction message related to the base station coordinates is received

  The BaseStation block contains the ECEF coordinates of the base station the
  receiver is currently connected to. This block helps users accessing the base
  station coordinates via SBF instead of having to decode the specific differential
  correction message (see the DiffCorrIn SBF block above).

  The interpretation to give to the X, Y, Z ECEF coordinates is dependent on the
  value of the Source field:

    Value of Source   Interpretation of X, Y, Z
    0, 4 or 10        Coordinate of the L1 phase center
    2 or 8            Antenna reference point
    9                 Proprietary

  BaseStation ----------------------------------------------------------------
  Block fields       Type  Units Do-Not-Use  Description
  BaseStationID    uint16                    The base station ID
  BaseType          uint8                    Base station type: 0 Fixed, 1 Moving (reserved for future use), 255 Unknown
  Source            uint8                    Source of the base station coordinates:
                                               0:  RTCM 2.x (Msg 3)          2:  RTCM 2.x (Msg 24)
                                               4:  CMR 2.x (Msg 1)           8:  RTCM 3.x (Msg 1005 or 1006)
                                               9:  RTCMV (Msg 3)           10:  CMR+ (Type 2)
  Datum             uint8              255   Not applicable
  Reserved          uint8                    Reserved for future use, to be ignored by decoding software
  X               float64    1 m             Antenna X coordinate expressed in the datum specified by the Datum field
  Y               float64    1 m             Antenna Y coordinate
  Z               float64    1 m             Antenna Z coordinate
  Padding            uint                    Padding bytes

  What X/Y/Z MEAN depends on Source — phase centre, antenna reference point, or
  proprietary — so that interpretation is published alongside the coordinates
  rather than left for the reader to look up.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'BaseStationID', type: 'uint16', description: 'Identifier of the base station' },
  { name: 'BaseType', type: 'uint8', description: 'Base station type: 0 fixed, 1 moving (reserved for future use), 255 unknown' },
  { name: 'Source', type: 'uint8', description: 'Which correction message the coordinates came from, which also determines what X/Y/Z refer to' },
  { name: 'Datum', type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: 'Not applicable (per the datasheet)' },
  { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'X', type: 'float64', units: 'm', description: 'Antenna X coordinate (ECEF)' },
  { name: 'Y', type: 'float64', units: 'm', description: 'Antenna Y coordinate (ECEF)' },
  { name: 'Z', type: 'float64', units: 'm', description: 'Antenna Z coordinate (ECEF)' },
]

export const BASE_TYPE: Readonly<Record<number, string>> = {
  0: 'FIXED',
  1: 'MOVING',
  255: 'UNKNOWN',
}

export const BASE_SOURCE: Readonly<Record<number, string>> = {
  0: 'RTCM_2X_MSG3',
  2: 'RTCM_2X_MSG24',
  4: 'CMR_2X_MSG1',
  8: 'RTCM_3X_MSG1005_OR_1006',
  9: 'RTCMV_MSG3',
  10: 'CMR_PLUS_TYPE2',
}

// Which point the coordinates refer to, per the datasheet's own table.
const COORDINATE_MEANING: Readonly<Record<number, string>> = {
  0: 'L1_PHASE_CENTER',
  2: 'ANTENNA_REFERENCE_POINT',
  4: 'L1_PHASE_CENTER',
  8: 'ANTENNA_REFERENCE_POINT',
  9: 'PROPRIETARY',
  10: 'L1_PHASE_CENTER',
}

const decoders: Readonly<Record<string, Decoder>> = {
  BaseType: (value) => label(BASE_TYPE, value),
  Source: (value) => ({
    ...label(BASE_SOURCE, value),
    coordinates: COORDINATE_MEANING[value] ?? 'UNKNOWN',
  }),
}

export const baseStation: BlockDefinition = {
  name: 'BaseStation',
  number: 5949,
  description: 'ECEF coordinates of the base station the receiver is connected to, saved from having to decode the correction message',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
  payloadMetadata: ({ X, Y, Z, BaseStationID, Source }) => {
    if (typeof X !== 'number' || typeof Y !== 'number' || typeof Z !== 'number') return {}
    return {
      base: {
        id: BaseStationID,
        ecef: { x: X, y: Y, z: Z, units: 'm' },
        refers: (typeof Source === 'number') ? (COORDINATE_MEANING[Source] ?? 'UNKNOWN') : 'UNKNOWN',
      },
    }
  },
}
