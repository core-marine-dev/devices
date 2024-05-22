import type { SBGFrameNameData } from '../../../types'

/* Message ID 14 -> SBG_ECOM_LOG_GPS1_POS => GNSS position from primary receiver
 * Message ID 17 -> SBG_ECOM_LOG_GPS2_POS => GNSS position from secondary receiver
 * Field            Offset  Size  Format   Unit  Description
 * TIME_STAMP            0     4  uint32     µs  Time since sensor is powered up
 * GPS_POS_STATUS        4     4  uint32      -  GPS position fix and status bitmask
 * GPS_TOW               8     4  uint32     ms  GPS Time of Week
 * LAT                  12     8  double      °  Latitude, positive North
 * LONG                 20     8  double      °  Longitude, positive East
 * ALT                  28     8  double      m  Altitude Above Mean Sea Level
 * UNDULATION           36     4   float      m  Altitude difference between the geoid and the Ellipsoid (WGS-84 Altitude – MSL Altitude)
 * POS_ACC_LAT          40     4   float      m  1σ Latitude Accuracy
 * POS_ACC_LONG         44     4   float      m  1σ Longitude Accuracy
 * POS_ACC_ALT          48     4   float      m  1σ Altitude Accuracy
 * NUM_SV_USED          52     1   uint8      -  Number of space vehicles used in GNSS solution
 * BASE_STATION_ID      53     2  uint16      -  ID of the DGPS/RTK base station in use
 * DIFF_AGE             55     2  uint16  0.01s  Differential data age
 *           Total size 57
 *
 * GPS_POS_STATUS definition ->
 *  Bit   Type  Name                             Description
 * [0-5]  Enum  SBG_ECOM_GPS_POS_STATUS          The raw GPS position status
 * [6-11] Enum  SBG_ECOM_GPS_POS_TYPE            The raw GPS position type
 *   12   Mask  SBG_ECOM_GPS_POS_GPS_L1_USED     Set to 1 if GPS L1CA/L1P      is used in the solution
 *   13   Mask  SBG_ECOM_GPS_POS_GPS_L2_USED     Set to 1 if GPS L2P/L2C       is used in the solution
 *   14   Mask  SBG_ECOM_GPS_POS_GPS_L5_USED     Set to 1 if GPS L5            is used in the solution
 *   15   Mask  SBG_ECOM_GPS_POS_GLO_L1_USED     Set to 1 if GLONASS L1CA      is used in the solution
 *   16   Mask  SBG_ECOM_GPS_POS_GLO_L2_USED     Set to 1 if GLONASS L2C/L2P   is used in the solution
 *   17   Mask  SBG_ECOM_GPS_POS_GLO_L3_USED     Set to 1 if GLONASS L3        is used in the solution
 *   18   Mask  SBG_ECOM_GPS_POS_GAL_E1_USED     Set to 1 if Galileo E1        is used in solution
 *   19   Mask  SBG_ECOM_GPS_POS_GAL_E5A_USED    Set to 1 if Galileo E5a       is used in solution
 *   20   Mask  SBG_ECOM_GPS_POS_GAL_E5B_USED    Set to 1 if Galileo E5b       is used in solution
 *   21   Mask  SBG_ECOM_GPS_POS_GAL_E5ALT_USED  Set to 1 if Galileo E5 AltBoc is used in solution
 *   22   Mask  SBG_ECOM_GPS_POS_GAL_E6_USED     Set to 1 if Galileo E6        is used in solution
 *   23   Mask  SBG_ECOM_GPS_POS_BDS_B1_USED     Set to 1 if BeiDou B1         is used in solution
 *   24   Mask  SBG_ECOM_GPS_POS_BDS_B2_USED     Set to 1 if BeiDou B2         is used in solution
 *   25   Mask  SBG_ECOM_GPS_POS_BDS_B3_USED     Set to 1 if BeiDou B3         is used in solution
 *   26   Mask  SBG_ECOM_GPS_POS_QZSS_L1_USED    Set to 1 if QZSS L1CA         is used in solution
 *   27   Mask  SBG_ECOM_GPS_POS_QZSS_L2_USED    Set to 1 if QZSS L2C          is used in solution
 *   28   Mask  SBG_ECOM_GPS_POS_QZSS_L3_USED    Set to 1 if QZSS L5           is used in solution
 *
 * SBG_ECOM_GPS_POS_STATUS enumeration
 * Value Name                           Description
 *   0   SBG_ECOM_POS_SOL_COMPUTED      A valid solution has been computed.
 *   1   SBG_ECOM_POS_INSUFFICIENT_OBS  Not enough valid SV to compute a solution.
 *   2   SBG_ECOM_POS_INTERNAL_ERROR    An internal error has occurred.
 *   3   SBG_ECOM_POS_HEIGHT_LIMIT      The height limit has been exceeded.
 *
 * SBG_ECOM_GPS_POS_TYPE enumeration
 * Value Name                       Description
 *   0   SBG_ECOM_POS_NO_SOLUTION   No valid solution available.
 *   1   SBG_ECOM_POS_UNKNOWN_TYPE  An unknown solution type has been computed.
 *   2   SBG_ECOM_POS_SINGLE        Single point solution position.
 *   3   SBG_ECOM_POS_PSRDIFF       Standard Pseudorange Differential Solution (DGPS).
 *   4   SBG_ECOM_POS_SBAS          SBAS satellite used for differential corrections.
 *   5   SBG_ECOM_POS_OMNISTAR      Omnistar VBS Position (L1 sub-meter).
 *   6   SBG_ECOM_POS_RTK_FLOAT     Floating RTK ambiguity solution (20 cms RTK).
 *   7   SBG_ECOM_POS_RTK_INT       Integer RTK ambiguity solution (2 cms RTK).
 *   8   SBG_ECOM_POS_PPP_FLOAT     Precise Point Positioning with float ambiguities
 *   9   SBG_ECOM_POS_PPP_INT       Precise Point Positioning with fixed ambiguities
 *  10   SBG_ECOM_POS_FIXED         Fixed location solution position
*/
const STATUSES = [
  'SBG_ECOM_POS_SOL_COMPUTED',
  'SBG_ECOM_POS_INSUFFICIENT_OBS',
  'SBG_ECOM_POS_INTERNAL_ERROR',
  'SBG_ECOM_POS_HEIGHT_LIMIT',
  'UNKNOWN'
] as const
type Status = typeof STATUSES[number]

const getStatus = (status: number): Status => {
  if (status === 0) return 'SBG_ECOM_POS_SOL_COMPUTED'
  if (status === 1) return 'SBG_ECOM_POS_INSUFFICIENT_OBS'
  if (status === 2) return 'SBG_ECOM_POS_INTERNAL_ERROR'
  if (status === 3) return 'SBG_ECOM_POS_HEIGHT_LIMIT'
  return 'UNKNOWN'
}

const TYPES = [
  'SBG_ECOM_POS_NO_SOLUTION',
  'SBG_ECOM_POS_UNKNOWN_TYPE',
  'SBG_ECOM_POS_SINGLE',
  'SBG_ECOM_POS_PSRDIFF',
  'SBG_ECOM_POS_SBAS',
  'SBG_ECOM_POS_OMNISTAR',
  'SBG_ECOM_POS_RTK_FLOAT',
  'SBG_ECOM_POS_RTK_INT',
  'SBG_ECOM_POS_PPP_FLOAT',
  'SBG_ECOM_POS_PPP_INT',
  'SBG_ECOM_POS_FIXED',
  'UNKOWN'
] as const
type Type = typeof TYPES[number]

const getType = (type: number): Type => {
  const mask = 0b0000_0000_0000_0000_0000_1111_1100_0000
  const num = (mask & type) >>> 6
  return TYPES[num] ?? 'UNKOWN'
}

interface GPSPositionStatus {
  status: ReturnType<typeof getStatus>
  type: ReturnType<typeof getType>
}

const getGPSPositionStatus = (gpsPositionStatus: number): GPSPositionStatus => {
  return {
    status: getStatus(gpsPositionStatus),
    type: getType(gpsPositionStatus)
  }
}

const SBG_ECOM_LOG_GPS_POS = (payload: Buffer): object => {
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    gpsPositionStatus: payload.readUIntLE(4, 4),
    gpsTOW: payload.readUIntLE(8, 4),
    latitude: payload.readDoubleLE(12),
    longitude: payload.readDoubleLE(20),
    altitude: payload.readDoubleLE(28),
    undulation: payload.readDoubleLE(36),
    positionAccuracyLatitude: payload.readFloatLE(40),
    positionAccuracyLongitude: payload.readFloatLE(44),
    positionAccuracyAltitude: payload.readFloatLE(48),
    numberSpaceVehicles: payload.readUIntLE(52, 1),
    baseStationID: payload.readUIntLE(53, 2),
    differentialAge: payload.readUIntLE(55, 2),
    metadata: {}
  }
  data.metadata = {
    gpsPositionStatus: getGPSPositionStatus(data.gpsPositionStatus)
  }
  return data
}

export const SBG_ECOM_LOG_GPS1_POS = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_GPS1_POS'
  const data = SBG_ECOM_LOG_GPS_POS(payload)
  return { name, data }
}

export const SBG_ECOM_LOG_GPS2_POS = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_GPS2_POS'
  const data = SBG_ECOM_LOG_GPS_POS(payload)
  return { name, data }
}
