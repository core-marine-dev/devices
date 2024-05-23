import type { SBGFrameNameData } from '../../../types'
/* Message ID 13 -> SBG_ECOM_LOG_GPS1_VEL => GNSS velocity from primary receiver
 * Message ID 16 -> SBG_ECOM_LOG_GPS2_VEL => GNSS velocity from secondary receiver
 * Field            Offset  Size  Format  Unit  Description
 * TIME_STAMP            0     4  uint32    µs  Time since sensor is powered up
 * GPS_VEL_STATUS        4     4  uint32     -  GPS velocity fix and status bitmask
 * GPS_TOW               8     4  uint32    ms  GPS Time of Week
 * VEL_N                12     4   float   m/s  Velocity in North direction
 * VEL_E                16     4   float   m/s  Velocity in East direction
 * VEL_D                20     4   float   m/s  Velocity in Down direction
 * VEL_ACC_N            24     4   float   m/s  1σ Accuracy in North direction
 * VEL_ACC_E            28     4   float   m/s  1σ Accuracy in East direction
 * VEL_ACC_D            32     4   float   m/s  1σ Accuracy in Down direction
 * COURSE               36     4   float     °  True direction of motion over ground (0 to 360°)
 * COURSE_ACC           40     4   float     °  1σ course accuracy (0 to 360°).
 *           Total size 44
 *
 * GPS_VEL_STATUS definition ->
 *  Bit   Type  Name                     Description
 * [0-5]  Enum  SBG_ECOM_GPS_VEL_STATUS  The raw GPS velocity status
 * [6-11] Enum  SBG_ECOM_GPS_VEL_TYPE    The raw GPS velocity type
 *
 * SBG_ECOM_GPS_VEL_STATUS enumeration
 * Value Name                           Description
 *   0   SBG_ECOM_VEL_SOL_COMPUTED      A valid solution has been computed.
 *   1   SBG_ECOM_VEL_INSUFFICIENT_OBS  Not enough valid SV to compute a solution.
 *   2   SBG_ECOM_VEL_INTERNAL_ERROR    An internal error has occurred.
 *   3   SBG_ECOM_VEL_LIMIT             Velocity limit exceeded.
 *
 * SBG_ECOM_GPS_VEL_TYPE enumeration
 * Value Name                       Description
 *   0   SBG_ECOM_VEL_NO_SOLUTION   No valid velocity solution available.
 *   1   SBG_ECOM_VEL_UNKNOWN_TYPE  An unknown solution type has been computed.
 *   2   SBG_ECOM_VEL_DOPPLER       A Doppler velocity has been computed.
 *   3   SBG_ECOM_VEL_DIFFERENTIAL  A velocity has been computed between two positions.
*/
const STATUSES = [
  'SBG_ECOM_VEL_SOL_COMPUTED',
  'SBG_ECOM_VEL_INSUFFICIENT_OBS',
  'SBG_ECOM_VEL_INTERNAL_ERROR',
  'SBG_ECOM_VEL_LIMIT',
  'UNKNOWN'
] as const
type Status = typeof STATUSES[number]

const getStatus = (status: number): Status => STATUSES[status] ?? 'UNKNOWN'

const TYPES = [
  'SBG_ECOM_VEL_NO_SOLUTION',
  'SBG_ECOM_VEL_UNKNOWN_TYPE',
  'SBG_ECOM_VEL_DOPPLER',
  'SBG_ECOM_VEL_DIFFERENTIAL',
  'UNKOWN'
] as const
type Type = typeof TYPES[number]

const getType = (type: number): Type => {
  const mask = 0b0000_0000_0000_0000_0000_1111_1100_0000
  const num = (mask & type) >>> 6
  return TYPES[num] ?? 'UNKOWN'
}

interface GPSVelocityStatus {
  status: ReturnType<typeof getStatus>
  type: ReturnType<typeof getType>
}

const getGPSVelocityStatus = (gpsVelocityStatus: number): GPSVelocityStatus => {
  return {
    status: getStatus(gpsVelocityStatus),
    type: getType(gpsVelocityStatus)
  }
}

const SBG_ECOM_LOG_GPS_VEL = (payload: Buffer): object => {
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    gpsVelocityStatus: payload.readUIntLE(4, 4),
    gpsTOW: payload.readUIntLE(8, 4),
    velocityN: payload.readFloatLE(12),
    velocityE: payload.readFloatLE(16),
    velocityD: payload.readFloatLE(20),
    velocityAccuracyN: payload.readFloatLE(24),
    velocityAccuracyE: payload.readFloatLE(28),
    velocityAccuracyD: payload.readFloatLE(32),
    course: payload.readDoubleLE(36),
    courseAccuracy: payload.readFloatLE(40),
    metadata: {}
  }
  data.metadata = {
    gpsVelocityStatus: getGPSVelocityStatus(data.gpsVelocityStatus)
  }
  return data
}

export const SBG_ECOM_LOG_GPS1_VEL = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_GPS1_VEL'
  const data = SBG_ECOM_LOG_GPS_VEL(payload)
  return { name, data }
}

export const SBG_ECOM_LOG_GPS2_VEL = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_GPS2_VEL'
  const data = SBG_ECOM_LOG_GPS_VEL(payload)
  return { name, data }
}
