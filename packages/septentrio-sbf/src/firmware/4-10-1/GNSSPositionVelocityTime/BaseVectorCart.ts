// coded
import { baselineMisc, pvtError, pvtMode } from './common'

import { DO_NOT_USE_FLOAT, DO_NOT_USE_INT16, DO_NOT_USE_UINT16 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { scaled } from '../../../utils'
import { signalInfo } from '../signals'

/* BaseVectorCart -> Number: 4043 => "OnChange" interval: default PVT output rate
  The BaseVectorCart block contains the relative position and orientation of one or
  more base stations, as seen from the rover (i.e. this receiver). The relative
  position is expressed in the Cartesian X, Y, Z directions.

  For highest accuracy, the receiver tries to compute the baseline from rover
  antenna reference point (ARP) to base ARP. This requires to compensate for the
  phase center offset at both the base and the rover antennas. This is possible if
  two conditions are met:
    - the base station must transmit its antenna parameters in RTCM2 message types
      23 and 24 or in RTCM3 message types 1005/1006 and 1007/1008. Older RTCM2
      messages and CMR do not allow phase center offset compensation.
    - the base and rover antenna types must belong to the list returned by the
      command lstAntennaInfo, overview.

  Accurate ARP-to-ARP baseline is guaranteed only if both bits 0 and 1 of the Misc
  field are set. Otherwise, centimeter-level offsets may arise because the receiver
  cannot make the distinction between phase center and ARP positions.

  The block supports multi-base operation. It contains as many sub-blocks as
  available base stations, each sub-block containing the baseline relative to a
  single base station identified by the ReferenceID field.

  BaseVectorCart -------------------------------------------------------------
  Block fields          Type  Units Do-Not-Use  Description
  N                    uint8                    Number of baselines, i.e. number of VectorInfoCart sub-blocks.
                                                If N is 0, there are no baselines available for this epoch.
  SBLength             uint8  1 byte             Length of one sub-block
  VectorInfoCart                                A succession of N VectorInfoCart sub-blocks
  Padding               uint                    Padding bytes

  VectorInfoCart -------------------------------------------------------------
  Block fields          Type       Units Do-Not-Use  Description
  nrSV                 uint8                         Number of satellites for which corrections are available from the base
                                                     station identified by the ReferenceID field.
  Error                uint8                         PVT error code (see PVTGeodetic)
  Mode                 uint8                         Bit field indicating the GNSS PVT mode (see PVTGeodetic)
  Misc                 uint8                         Bit field: bit 0 baseline points to the base station ARP, bit 1 phase
                                                     center offset compensated at the rover, bits 2-5 proprietary,
                                                     bits 6-7 reserved.
  DeltaX             float64         1 m  -2 * 10¹⁰  X baseline component (from rover to base)
  DeltaY             float64         1 m  -2 * 10¹⁰  Y baseline component (from rover to base)
  DeltaZ             float64         1 m  -2 * 10¹⁰  Z baseline component (from rover to base)
  DeltaVx            float32       1 m/s  -2 * 10¹⁰  X velocity of base with respect to rover
  DeltaVy            float32       1 m/s  -2 * 10¹⁰  Y velocity of base with respect to rover
  DeltaVz            float32       1 m/s  -2 * 10¹⁰  Z velocity of base with respect to rover
  Azimuth             uint16  0.01 degrees    65535  Azimuth of the base station (from 0 to 360°, increasing towards east)
  Elevation            int16  0.01 degrees   -32768  Elevation of the base station (from -90° to 90°)
  ReferenceID         uint16                         Base station ID
  CorrAge             uint16      0.01 s      65535  Age of the oldest differential correction used for this baseline
  SignalInfo          uint32                     0  Signals for which this base station provides corrections (§4.1.10)
  Padding               uint                        Padding bytes

  Note `nrSV` — lowercase n, where BaseVectorGeod's identical field is `NrSV`.
  Transcribed as printed in each block.
*/
const VECTOR_INFO_CART: readonly FieldDefinition[] = [
  { name: 'nrSV', type: 'uint8', description: 'Number of satellites for which corrections are available from this base station' },
  { name: 'Error', type: 'uint8', description: 'PVT error code; 0 means no error' },
  { name: 'Mode', type: 'uint8', description: 'Bit field: bits 0-3 type of PVT solution, bit 6 set while determining a fixed position, bit 7 set in 2D mode' },
  { name: 'Misc', type: 'uint8', description: 'Bit field: bit 0 baseline points to the base station ARP, bit 1 phase center offset compensated at the rover. An accurate ARP-to-ARP baseline is guaranteed only when both are set' },
  { name: 'DeltaX', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'X baseline component, from rover to base' },
  { name: 'DeltaY', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Y baseline component, from rover to base' },
  { name: 'DeltaZ', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Z baseline component, from rover to base' },
  { name: 'DeltaVx', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'X velocity of the base with respect to the rover' },
  { name: 'DeltaVy', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Y velocity of the base with respect to the rover' },
  { name: 'DeltaVz', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Z velocity of the base with respect to the rover' },
  { name: 'Azimuth', type: 'uint16', units: '0.01 deg', doNotUse: DO_NOT_USE_UINT16, description: 'Azimuth of the base station, 0 to 360° increasing towards east' },
  { name: 'Elevation', type: 'int16', units: '0.01 deg', doNotUse: DO_NOT_USE_INT16, description: 'Elevation of the base station, -90° to 90°' },
  { name: 'ReferenceID', type: 'uint16', description: 'Base station ID' },
  { name: 'CorrAge', type: 'uint16', units: '0.01 s', doNotUse: DO_NOT_USE_UINT16, description: 'Age of the oldest differential correction used for this baseline computation' },
  { name: 'SignalInfo', type: 'uint32', doNotUse: 0, description: 'Bit field: signals for which this base station provides corrections (§4.1.10)' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of baselines in this block; 0 means no baseline is available for this epoch' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one sub-block in bytes' },
  { name: 'VectorInfoCart', count: 'N', length: 'SBLength', fields: VECTOR_INFO_CART, description: 'A succession of N VectorInfoCart sub-blocks, one per base station' },
]

const decoders: Readonly<Record<string, Decoder>> = {
  Error: pvtError,
  Mode: pvtMode,
  Misc: baselineMisc,
  Azimuth: (value) => scaled(value, 100, 'deg'),
  Elevation: (value) => scaled(value, 100, 'deg'),
  CorrAge: (value) => scaled(value, 100, 's'),
  SignalInfo: (value) => ({ signals: signalInfo(value) }),
}

export const baseVectorCart: BlockDefinition = {
  name: 'BaseVectorCart',
  number: 4043,
  description: 'Cartesian relative position, velocity and orientation of one or more base stations as seen from this rover',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
