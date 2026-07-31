// coded
import { baselineMisc, pvtError, pvtMode } from './common'
import { ARP_POSITION, DATUM, RAIM_INTEGRITY } from './pvt-solution'

import { DO_NOT_USE_FLOAT, DO_NOT_USE_UINT8, DO_NOT_USE_UINT16 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, bitState, label, scaled, UNKNOWN_LABEL } from '../../../utils'
import { signalInfo } from '../signals'

/* PosCart -> Number: 4044 => "OnChange" interval: default PVT output rate
  This block contains the absolute and relative (relative to the nearest base
  station) position at the time specified in the TOW and WNc fields. The time of
  applicability is specified in the receiver time frame.

  The absolute position (X, Y, Z) is reported in a Cartesian coordinate system
  using the datum indicated in the Datum field. The position is that of the marker.
  The ARP-to-marker offset is set through the command setAntennaOffset.

  For highest accuracy, the receiver tries to compute the baseline (Base2RoverX,
  Base2RoverY, Base2RoverZ) from rover ARP to base ARP. See the description of the
  BaseVectorCart block for details.

  Accurate ARP-to-ARP baseline is guaranteed only if both bits 0 and 1 of the Misc
  field are set. Otherwise, centimeter-level offsets may arise because the receiver
  cannot make the distinction between phase center and ARP positions.

  This block also contains the variance-covariance information and DOP factors
  associated with the position.

  PosCart --------------------------------------------------------------------
  Block fields      Type  Units Do-Not-Use  Description
  Mode             uint8                    Bit field indicating the GNSS PVT mode (see PVTGeodetic)
  Error            uint8                    PVT error code (see PVTGeodetic)
  X              float64    1 m  -2 * 10¹⁰  X coordinate in the coordinate frame specified by Datum
  Y              float64    1 m  -2 * 10¹⁰  Y coordinate in the coordinate frame specified by Datum
  Z              float64    1 m  -2 * 10¹⁰  Z coordinate in the coordinate frame specified by Datum
  Base2RoverX    float64    1 m  -2 * 10¹⁰  X baseline component (from base to rover)
  Base2RoverY    float64    1 m  -2 * 10¹⁰  Y baseline component (from base to rover)
  Base2RoverZ    float64    1 m  -2 * 10¹⁰  Z baseline component (from base to rover)
  Cov_xx         float32   1 m²  -2 * 10¹⁰  Variance of the x estimate
  Cov_yy         float32   1 m²  -2 * 10¹⁰  Variance of the y estimate
  Cov_zz         float32   1 m²  -2 * 10¹⁰  Variance of the z estimate
  Cov_xy         float32   1 m²  -2 * 10¹⁰  Covariance between the x and y estimates
  Cov_xz         float32   1 m²  -2 * 10¹⁰  Covariance between the x and z estimates
  Cov_yz         float32   1 m²  -2 * 10¹⁰  Covariance between the y and z estimates
  PDOP            uint16   0.01          0  If 0, PDOP not available, otherwise divide by 100 to obtain PDOP.
  HDOP            uint16   0.01          0  If 0, HDOP not available, otherwise divide by 100 to obtain HDOP.
  VDOP            uint16   0.01          0  If 0, VDOP not available, otherwise divide by 100 to obtain VDOP.
  Misc             uint8                    Bit field containing miscellaneous flags (see PVTGeodetic's Misc)
  Reserved         uint8                    Reserved for future use.
  AlertFlag        uint8                 0  Bit field indicating integrity related information (see PVTGeodetic)
  Datum            uint8               255  Datum the coordinates are expressed in
  NrSV             uint8               255  Total number of satellites used in the PVT computation.
  WACorrInfo       uint8                 0  Which wide-area corrections have been applied (see PVTGeodetic)
  ReferenceId     uint16             65535  Reference ID of the differential information used
  MeanCorrAge     uint16  0.01 s     65535  Mean age of the differential corrections
  SignalInfo      uint32                 0  Signals used in the PVT computation (§4.1.10)
  Padding           uint                    Padding bytes

  Note `ReferenceId` — lowercase d, unlike PVTGeodetic's `ReferenceID`. Transcribed
  as printed: a field name is what the datasheet says it is.
*/
const covariance = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units: 'm²', doNotUse: DO_NOT_USE_FLOAT, description })

const dop = (name: string, what: string): FieldDefinition =>
  ({ name, type: 'uint16', units: '0.01', doNotUse: 0, description: `${what} dilution of precision; 0 means not available` })

const FIELDS: readonly FieldDefinition[] = [
  { name: 'Mode', type: 'uint8', description: 'Bit field: bits 0-3 type of PVT solution, bit 6 set while determining a fixed position, bit 7 set in 2D mode' },
  { name: 'Error', type: 'uint8', description: 'PVT error code; 0 means no error' },
  { name: 'X', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'X coordinate in the frame specified by Datum' },
  { name: 'Y', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Y coordinate in the frame specified by Datum' },
  { name: 'Z', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Z coordinate in the frame specified by Datum' },
  { name: 'Base2RoverX', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'X baseline component, from base to rover' },
  { name: 'Base2RoverY', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Y baseline component, from base to rover' },
  { name: 'Base2RoverZ', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Z baseline component, from base to rover' },
  covariance('Cov_xx', 'Variance of the x estimate'),
  covariance('Cov_yy', 'Variance of the y estimate'),
  covariance('Cov_zz', 'Variance of the z estimate'),
  covariance('Cov_xy', 'Covariance between the x and y estimates'),
  covariance('Cov_xz', 'Covariance between the x and z estimates'),
  covariance('Cov_yz', 'Covariance between the y and z estimates'),
  dop('PDOP', 'Position'),
  dop('HDOP', 'Horizontal'),
  dop('VDOP', 'Vertical'),
  { name: 'Misc', type: 'uint8', description: 'Bit field: bit 0 baseline points to the base station ARP, bit 1 phase center offset compensated, bits 6-7 whether the marker position is also the ARP position' },
  { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved for future use' },
  { name: 'AlertFlag', type: 'uint8', doNotUse: 0, description: 'Bit field: bits 0-1 RAIM integrity flag, bit 2 Galileo HPCA integrity failed, bit 3 Galileo ionospheric storm' },
  { name: 'Datum', type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: 'Datum the coordinates are expressed in' },
  { name: 'NrSV', type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: 'Total number of satellites used in the PVT computation' },
  { name: 'WACorrInfo', type: 'uint8', doNotUse: 0, description: 'Bit field: which wide-area corrections have been applied' },
  { name: 'ReferenceId', type: 'uint16', doNotUse: DO_NOT_USE_UINT16, description: 'Reference ID of the differential information used' },
  { name: 'MeanCorrAge', type: 'uint16', units: '0.01 s', doNotUse: DO_NOT_USE_UINT16, description: 'Mean age of the differential corrections' },
  { name: 'SignalInfo', type: 'uint32', doNotUse: 0, description: 'Bit field: signal types used in the PVT computation (§4.1.10)' },
]

const dilution: Decoder = (value) => scaled(value, 100)

const decoders: Readonly<Record<string, Decoder>> = {
  Mode: pvtMode,
  Error: pvtError,
  PDOP: dilution,
  HDOP: dilution,
  VDOP: dilution,
  Misc: (value) => ({ ...baselineMisc(value, {}), arpPosition: ARP_POSITION[bits(value, 6, 7)] ?? UNKNOWN_LABEL }),
  AlertFlag: (value) => ({
    raimIntegrityFlag: RAIM_INTEGRITY[bits(value, 0, 1)] ?? UNKNOWN_LABEL,
    galileoIntegrityFailed: bitState(value, 2),
    galileoIonosphericStorm: bitState(value, 3),
  }),
  Datum: (value) => label(DATUM, value),
  WACorrInfo: (value) => ({
    clockCorrection: bitState(value, 0),
    rangeCorrection: bitState(value, 1),
    ionosphericInformation: bitState(value, 2),
    orbitAccuracy: bitState(value, 3),
    do229PrecisionApproach: bitState(value, 4),
  }),
  MeanCorrAge: (value) => scaled(value, 100, 's'),
  SignalInfo: (value) => ({ signals: signalInfo(value) }),
}

export const posCart: BlockDefinition = {
  name: 'PosCart',
  number: 4044,
  description: 'Absolute Cartesian position, the baseline to the nearest base station, and the covariance and DOP that go with them',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
  payloadMetadata: ({ X, Y, Z, Base2RoverX, Base2RoverY, Base2RoverZ }) => {
    const metadata: Record<string, unknown> = {}
    if (typeof X === 'number' && typeof Y === 'number' && typeof Z === 'number') {
      metadata.position = { ecef: { x: X, y: Y, z: Z, units: 'm' } }
    }
    if (typeof Base2RoverX === 'number' && typeof Base2RoverY === 'number' && typeof Base2RoverZ === 'number') {
      metadata.baseline = { x: Base2RoverX, y: Base2RoverY, z: Base2RoverZ, units: 'm' }
    }
    return metadata
  },
}
