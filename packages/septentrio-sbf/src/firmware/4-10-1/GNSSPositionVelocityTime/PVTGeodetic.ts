// coded
import { pvtCommonDecoders, pvtRevisions } from './pvt-solution'

import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { degrees } from '../../../utils'

/* PVTGeodetic -> Number: 4007 => "OnChange" interval: default PVT output rate
  This block contains the GNSS-based position, velocity and time (PVT) solution
  at the time specified in the TOW and WNc fields. The time of applicability is
  specified in the receiver time frame.

  The computed position (φ, λ, h) and velocity (vn, ve, vu) are reported in an
  ellipsoidal coordinate system using the datum indicated in the Datum field.
  The velocity vector is expressed relative to the local-level Cartesian
  coordinate frame with north-, east-, up-unit vectors. The position is that of
  the marker. The ARP-to-marker offset is set through the command
  setAntennaOffset.

  The PVT solution is also available in Cartesian form in the PVTCartesian block.

  The variance-covariance information associated with the reported PVT solution
  can be found in the PosCovGeodetic and VelCovGeodetic blocks.

  If no PVT solution is available, the Error field indicates the cause of the
  unavailability and all fields after the Error field are set to their
  respective Do-Not-Use values.

  PVTGeodetic ----------------------------------------------------------------
  Block fields     Type  Units Do-Not-Use  Description
  Mode            uint8                    Bit field indicating the GNSS PVT mode, as follows:
                                            Bits 0-3: type of PVT solution:
                                              0: No GNSS PVT available (the Error field indicates the cause)
                                              1: Stand-Alone PVT
                                              2: Differential PVT
                                              3: Fixed location
                                              4: RTK with fixed ambiguities
                                              5: RTK with float ambiguities
                                              6: SBAS aided PVT
                                              7: moving-base RTK with fixed ambiguities
                                              8: moving-base RTK with float ambiguities
                                             10: Precise Point Positioning (PPP)
                                             12: Reserved
                                            Bits 4-5: Reserved
                                            Bit    6: Set if the user has entered the command setPVTMode, Static, auto
                                                      and the receiver is still in the process of determining its fixed position.
                                            Bit    7: 2D/3D flag: set in 2D mode (height assumed constant and not computed).
  Error           uint8                    PVT error code. The following values are defined:
                                             0: No Error
                                             1: Not enough measurements
                                             2: Not enough ephemerides available
                                             3: DOP too large (larger than 15)
                                             4: Sum of squared residuals too large
                                             5: No convergence
                                             6: Not enough measurements after outlier rejection
                                             7: Position output prohibited due to export laws
                                             8: Not enough differential corrections available
                                             9: Base station coordinates unavailable
                                            10: Ambiguities not fixed and user requested to only output RTK-fixed positions
  Latitude      float64  1 rad  -2 * 10¹⁰  Latitude, from -π/2 to +π/2, positive North of Equator
  Longitude     float64  1 rad  -2 * 10¹⁰  Longitude, from -π to +π, positive East of Greenwich
  Height        float64    1 m  -2 * 10¹⁰  Ellipsoidal height (with respect to the ellipsoid specified by Datum)
  Undulation    float32    1 m  -2 * 10¹⁰  Geoid undulation. See the setGeoidUndulation command.
  Vn            float32  1 m/s  -2 * 10¹⁰  Velocity in the North direction
  Ve            float32  1 m/s  -2 * 10¹⁰  Velocity in the East direction
  Vu            float32  1 m/s  -2 * 10¹⁰  Velocity in the 'Up' direction
  COG           float32  1 deg  -2 * 10¹⁰  Course over ground: the angle of the vehicle with respect to the local level
                                           North, from 0 to 360, increasing towards east. Set to the Do-Not-Use value
                                           when the speed is lower than 0.1 m/s.
  RxClkBias     float64   1 ms  -2 * 10¹⁰  Receiver clock bias relative to the GNSS system time reported in the
                                           TimeSystem field. Positive when the receiver time is ahead of the system time.
                                           To transfer the receiver time to the system time, use: tGPS/GST = trx - RxClkBias
  RxClkDrift    float32  1 ppm  -2 * 10¹⁰  Receiver clock drift relative to the GNSS system time (relative frequency error).
                                           Positive when the receiver clock runs faster than the system time.
  TimeSystem      uint8               255  Time system of which the offset is provided in this sub-block:
                                             0: GPS time, 1: Galileo time, 3: GLONASS time, 4: BeiDou time, 5: QZSS time
  Datum           uint8               255  This field defines in which datum the coordinates are expressed:
                                               0: WGS84/ITRS
                                              19: Datum equal to that used by the DGNSS/RTK base station
                                              30: ETRS89 (ETRF2000 realization)
                                              31: NAD83(2011), North American Datum (2011)
                                              32: NAD83(PA11), North American Datum, Pacific plate (2011)
                                              33: NAD83(MA11), North American Datum, Marianas plate (2011)
                                              34: GDA94(2010), Geocentric Datum of Australia (2010)
                                              35: GDA2020, Geocentric Datum of Australia 2020
                                             250: First user-defined datum
                                             251: Second user-defined datum
  NrSV            uint8               255  Total number of satellites used in the PVT computation.
  WACorrInfo      uint8                 0  Bit field providing information about which wide area corrections have been applied:
                                             Bit    0: set if orbit and satellite clock correction information is used
                                             Bit    1: set if range correction information is used
                                             Bit    2: set if ionospheric information is used
                                             Bit    3: set if orbit accuracy information is used (UERE/SISA)
                                             Bit    4: set if DO229 Precision Approach mode is active
                                             Bits 5-7: Reserved
  ReferenceID    uint16             65535  Reference ID of the differential information used. In case of DGPS or RTK
                                           operation, this field is to be interpreted as the base station identifier.
                                           In SBAS operation, it is the PRN of the geostationary satellite used (from
                                           120 to 158). If multiple base stations or geostationary satellites are used
                                           the value is set to 65534.
  MeanCorrAge    uint16  0.01 s     65535  In case of DGPS or RTK, the mean age of the differential corrections.
                                           In case of SBAS operation, the mean age of the 'fast corrections'
                                           provided by the SBAS satellites.
  SignalInfo     uint32                 0  Bit field indicating the type of GNSS signals having been used in the PVT
                                           computations. If a bit i is set, the signal type having index i has been
                                           used. See section 4.1.10; bit 0 (GPS-C/A) is the LSB of SignalInfo.
  AlertFlag       uint8                 0  Bit field indicating integrity related information:
                                             Bits 0-1: RAIM integrity flag:
                                               0: RAIM not active (integrity not monitored)
                                               1: RAIM integrity test successful
                                               2: RAIM integrity test failed
                                               3: Reserved
                                             Bit    2: set if integrity has failed as per Galileo HPCA (HMI Probability Computation Algorithm)
                                             Bit    3: set if Galileo ionospheric storm flag is active
                                             Bit    4: Reserved
                                             Bits 5-7: Reserved

Rev 1 NrBases     uint8                 0  Number of base stations used in the PVT computation.
Rev 1 PPPInfo    uint16    1 s          0  Bit field containing PPP-related information:
                                             Bits 0-11:  Age of the last seed, in seconds. The age is clipped to 4091 s.
                                                         Ignore this field when the seed type is 0 (see bits 13-15).
                                             Bit    12:  Reserved
                                             Bits 13-15: Type of last seed:
                                                           0: Not seeded or not in PPP positioning mode
                                                           1: Manual seed
                                                           2: Seeded from DGPS
                                                           3: Seeded from RTKFixed

Rev 2 Latency    uint16  0.0001 s   65535  Time elapsed between the time of applicability of the position fix and the
                                           generation of this SBF block by the receiver. This time includes the
                                           receiver processing time, but not the communication latency.
Rev 2 HAccuracy  uint16    0.01 m   65535  2DRMS horizontal accuracy: twice the root-mean-square of the horizontal
                                           distance error. The horizontal distance between the true position and the
                                           computed position is expected to be lower than HAccuracy with a probability
                                           of at least 95%. The value is clipped to 65534 = 655.34 m.
Rev 2 VAccuracy  uint16    0.01 m   65535  2-sigma vertical accuracy. The vertical distance between the true position
                                           and the computed position is expected to be lower than VAccuracy with a
                                           probability of at least 95%. The value is clipped to 65534 = 655.34 m.
Rev 2 Misc        uint8                    Bit field containing miscellaneous flags:
                                             Bit    0: In DGNSS or RTK mode, set if the baseline points to the base
                                                       station ARP. Unset if it points to the antenna phase center, or if unknown.
                                             Bit    1: Set if the phase center offset is compensated for at the rover,
                                                       unset if not or unknown.
                                             Bit    2: Proprietary.
                                             Bit    3: Proprietary.
                                             Bits 4-5: Proprietary.
                                             Bits 6-7: Flag indicating whether the marker position reported in this block
                                                       is also the ARP position (i.e. whether the ARP-to-marker offset
                                                       provided with the setAntennaOffset command is zero or not)
                                                         0: Unknown
                                                         1: The ARP-to-marker offset is zero
                                                         2: The ARP-to-marker offset is not zero

  Padding          uint                    Padding bytes

  Revisions are STACKED, which is §4.1.6 expressed as data: a later revision only
  ever adds fields, and no field is ever withdrawn. A frame whose revision is
  higher than anything known here therefore decodes at the highest KNOWN
  revision. The 1.x parser fell back to revision 0 instead, so a future rev-3
  receiver would have silently lost Latency, HAccuracy, VAccuracy and Misc.
*/
const GEODETIC_POSITION: readonly FieldDefinition[] = [
  { name: 'Latitude', type: 'float64', units: 'rad', doNotUse: DO_NOT_USE_FLOAT, description: 'Latitude, from -π/2 to +π/2, positive North of the Equator' },
  { name: 'Longitude', type: 'float64', units: 'rad', doNotUse: DO_NOT_USE_FLOAT, description: 'Longitude, from -π to +π, positive East of Greenwich' },
  { name: 'Height', type: 'float64', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Ellipsoidal height with respect to the ellipsoid specified by Datum' },
  { name: 'Undulation', type: 'float32', units: 'm', doNotUse: DO_NOT_USE_FLOAT, description: 'Geoid undulation' },
  { name: 'Vn', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Velocity in the North direction' },
  { name: 'Ve', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Velocity in the East direction' },
  { name: 'Vu', type: 'float32', units: 'm/s', doNotUse: DO_NOT_USE_FLOAT, description: 'Velocity in the Up direction' },
]

// Everything the two PVT blocks share is in ./pvt-solution.ts; the geodetic one
// only adds the radians-to-degrees conversions.
const decoders: Readonly<Record<string, Decoder>> = {
  ...pvtCommonDecoders,
  Latitude: (value) => degrees(value),
  Longitude: (value) => degrees(value),
}

export const pvtGeodetic: BlockDefinition = {
  name: 'PVTGeodetic',
  number: 4007,
  description: 'GNSS position, velocity and time in geodetic coordinates, at the time of applicability given by TOW and WNc',
  timestamp: 'receiver',
  revisions: pvtRevisions(GEODETIC_POSITION),
  decoders,
  // The fix as one thing, in the units a consumer actually wants. Mirrors what
  // GGA does in nmea-parser, so Tracker has one read path for a position.
  payloadMetadata: ({ Latitude, Longitude, Height }) => {
    if (typeof Latitude !== 'number' || typeof Longitude !== 'number') return {}
    return {
      position: {
        latitude: (degrees(Latitude).value as number),
        longitude: (degrees(Longitude).value as number),
        height: Height,
      },
    }
  },
}
