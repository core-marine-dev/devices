// coded
import { baselineMisc, pvtError, pvtMode } from './common'

import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { scaled } from '../../../utils'
import { signalInfo } from '../signals'

/* BaseVectorGeod -> Number: 4028 => "OnChange" interval: default PVT output rate
  The BaseVectorGeod block contains the relative position and orientation of one
  or more base stations, as seen from the rover (i.e. this receiver). The relative
  position is expressed in the East-North-Up directions.

  For highest accuracy, the receiver tries to compute the baseline from rover
  antenna reference point (ARP) to base ARP. See the description of the
  BaseVectorCart block for details.

  Accurate ARP-to-ARP baseline is guaranteed only if both bits 0 and 1 of the
  Misc field are set. Otherwise, centimeter-level offsets may arise because the
  receiver cannot make the distinction between phase center and ARP positions.

  The block supports multi-base operation. It contains as many sub-blocks as
  available base stations, each sub-block containing the baseline coordinates
  relative to a single base station identified by the ReferenceID field.

  BaseVectorGeod -------------------------------------------------------------
  Block fields          Type  Units Do-Not-Use  Description
  N                    uint8                    Number of baselines for which relative position, velocity and direction are
                                                provided in this SBF block, i.e. number of VectorInfoGeod sub-blocks.
                                                If N is 0, there are no baselines available for this epoch.
  SBLength             uint8  1 byte             Length of one sub-block
  VectorInfoGeod[N]                             A succession of N VectorInfoGeod sub-blocks
  Padding               uint                    Padding bytes

  VectorInfoGeod -------------------------------------------------------------
  Block fields          Type       Units Do-Not-Use  Description
  NrSV                 uint8                         Number of satellites for which corrections are available from the base
                                                     station identified by the ReferenceID field.
  Error                uint8                         PVT error code (see PVTGeodetic)
  Mode                 uint8                         Bit field indicating the GNSS PVT mode (see PVTGeodetic)
  Misc                 uint8                         Bit field containing miscellaneous flags:
                                                       Bit 0:    Set if the baseline points to the base station ARP. Unset if it
                                                                 points to the antenna phase center, or if unknown.
                                                       Bit 1:    Set if the phase center offset is compensated for at the rover
                                                                 (i.e. the baseline starts from the antenna ARP), unset if not
                                                                 or unknown.
                                                       Bit 2:    Proprietary.
                                                       Bit 3:    Proprietary.
                                                       Bits 4-5: Proprietary.
                                                       Bits 6-7: Reserved.
  DeltaEast          float64         1 m  -2 * 10¹⁰  East baseline component (from rover to base)
  DeltaNorth         float64         1 m  -2 * 10¹⁰  North baseline component (from rover to base)
  DeltaUp            float64         1 m  -2 * 10¹⁰  Up baseline component (from rover to base)
  DeltaVe            float32       1 m/s  -2 * 10¹⁰  East velocity of base with respect to rover
  DeltaVn            float32       1 m/s  -2 * 10¹⁰  North velocity of base with respect to rover
  DeltaVu            float32       1 m/s  -2 * 10¹⁰  Up velocity of base with respect to rover
  Azimuth             uint16  0.01 degrees    65535  Azimuth of the base station (from 0 to 360°, increasing towards east)
  Elevation            int16  0.01 degrees   -32768  Elevation of the base station (from -90° to 90°)
  ReferenceID         uint16                         Base station ID
  CorrAge             uint16      0.01 s      65535  Age of the oldest differential correction used for this baseline computation
  SignalInfo          uint32                     0  Bit field indicating the GNSS signals for which differential corrections are
                                                     available from the base station identified by ReferenceID. If bit i is set,
                                                     corrections for the signal type having index i are available. The signal
                                                     numbers are listed in section 4.1.10. Bit 0 (GPS-C/A) is the LSB.
  Padding               uint                        Padding bytes
*/
const VECTOR_INFO_GEOD: readonly FieldDefinition[] = [
  { name: 'NrSV', type: 'uint8', description: 'Number of satellites for which corrections are available from this base station' },
  { name: 'Error', type: 'uint8', description: 'PVT error code; 0 means no error' },
  { name: 'Mode', type: 'uint8', description: 'Bit field: bits 0-3 type of PVT solution, bit 6 set while determining a fixed position, bit 7 set in 2D mode' },
  { name: 'Misc', type: 'uint8', description: 'Bit field: bit 0 baseline points to the base station ARP, bit 1 phase center offset compensated at the rover. An accurate ARP-to-ARP baseline is guaranteed only when both are set' },
  { name: 'DeltaEast', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'East baseline component, from rover to base' },
  { name: 'DeltaNorth', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'North baseline component, from rover to base' },
  { name: 'DeltaUp', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Up baseline component, from rover to base' },
  { name: 'DeltaVe', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'East velocity of the base with respect to the rover' },
  { name: 'DeltaVn', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'North velocity of the base with respect to the rover' },
  { name: 'DeltaVu', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Up velocity of the base with respect to the rover' },
  { name: 'Azimuth', type: 'uint16', units: '0.01 deg', doNotUse: 65535, description: 'Azimuth of the base station, 0 to 360° increasing towards east' },
  { name: 'Elevation', type: 'int16', units: '0.01 deg', doNotUse: -32768, description: 'Elevation of the base station, -90° to 90°' },
  { name: 'ReferenceID', type: 'uint16', description: 'Base station ID' },
  { name: 'CorrAge', type: 'uint16', units: '0.01 s', doNotUse: 65535, description: 'Age of the oldest differential correction used for this baseline computation' },
  { name: 'SignalInfo', type: 'uint32', doNotUse: 0, description: 'Bit field: signals for which this base station provides corrections, bit i = signal number i (§4.1.10)' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of baselines in this block; 0 means no baseline is available for this epoch' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one sub-block in bytes' },
  { name: 'VectorInfoGeod', count: 'N', length: 'SBLength', fields: VECTOR_INFO_GEOD, description: 'A succession of N VectorInfoGeod sub-blocks, one per base station' },
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

export const baseVectorGeod: BlockDefinition = {
  name: 'BaseVectorGeod',
  number: 4028,
  description: 'ENU relative position, velocity and orientation of one or more base stations as seen from this rover',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
