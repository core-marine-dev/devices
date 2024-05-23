import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID 15 -> SBG_ECOM_LOG_GPS1_HDT => GNSS true heading from primary receiver
 * Message ID 18 -> SBG_ECOM_LOG_GPS2_HDT => GNSS true heading from secondary receiver
 * Field                 Offset  Size  Format   Unit  Description
 * TIME_STAMP                 0     4  uint32     µs  Time since sensor is powered up
 * GPS_HDT_STATUS             4     2  uint16      -  GPS position fix and status bitmask
 * GPS_TOW                    6     4  uint32     ms  GPS Time of Week
 * GPS_TRUE_HEADING          10     4   float      °  True heading angle (0 to 360°).
 * GPS_TRUE_HEADING_ACC      14     4   float      °  1σ True heading estimated accuracy (0 to 360°).
 * GPS_PITCH                 18     4   float      °  Pitch angle from the master to the rover
 * GPS_PITCH_ACC             22     4   float      °  1σ pitch estimated accuracy
 * GPS_BASELINE              26     4   float      m  Distance between main and aux antenna.
 *                Total size 30
 *
 * GPS_HDT_STATUS definition ->
 *  Bit   Type  Name                             Description
 * [0-5]  Enum  SBG_ECOM_GPS_HDT_STATUS          The raw GPS true heading status
 *   6    Mask  SBG_ECOM_GPS_HDT_BASELINE_VALID  Set if the baseline length field is filled and valid.
 *
 * SBG_ECOM_GPS_HDT_STATUS enumeration
 * Value Name                           Description
 *   0   SBG_ECOM_HDT_SOL_COMPUTED      A valid solution has been computed.
 *   1   SBG_ECOM_HDT_INSUFFICIENT_OBS  Not enough valid SV to compute a solution.
 *   2   SBG_ECOM_HDT_INTERNAL_ERROR    An internal error has occurred.
 *   3   SBG_ECOM_HDT_HEIGHT_LIMIT      The height limit has been exceeded.
*/
const STATUSES = ['SBG_ECOM_HDT_SOL_COMPUTED', 'SBG_ECOM_HDT_INSUFFICIENT_OBS', 'SBG_ECOM_HDT_INTERNAL_ERROR', 'SBG_ECOM_HDT_HEIGHT_LIMIT', 'UNKNOWN'] as const
type Status = typeof STATUSES[number]

const getStatus = (status: number): Status => {
  if (status === 0) return 'SBG_ECOM_HDT_SOL_COMPUTED'
  if (status === 1) return 'SBG_ECOM_HDT_INSUFFICIENT_OBS'
  if (status === 2) return 'SBG_ECOM_HDT_INTERNAL_ERROR'
  if (status === 3) return 'SBG_ECOM_HDT_HEIGHT_LIMIT'
  return 'UNKNOWN'
}

interface GPSHeadingStatus {
  status: ReturnType<typeof getStatus>
  headingBaseline: ReturnType<typeof bitStatus>
}

const getGPSHeadingStatus = (gpsHeadingStatus: number): GPSHeadingStatus => ({
  status: getStatus(gpsHeadingStatus),
  headingBaseline: bitStatus(gpsHeadingStatus, 6)
})

const SBG_ECOM_LOG_GPS_HDT = (payload: Buffer): object => {
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    gpsHeadingStatus: payload.readUIntLE(4, 2),
    gpsTOW: payload.readUIntLE(6, 4),
    heading: payload.readFloatLE(10),
    headingAccuracy: payload.readFloatLE(14),
    pitch: payload.readFloatLE(18),
    pitchAccuracy: payload.readFloatLE(22),
    baseline: payload.readFloatLE(26),
    metadata: {}
  }
  data.metadata = {
    gpsHeadingStatus: getGPSHeadingStatus(data.gpsHeadingStatus)
  }
  return data
}

export const SBG_ECOM_LOG_GPS1_HDT = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_GPS1_HDT'
  const data = SBG_ECOM_LOG_GPS_HDT(payload)
  return { name, data }
}

export const SBG_ECOM_LOG_GPS2_HDT = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_GPS2_HDT'
  const data = SBG_ECOM_LOG_GPS_HDT(payload)
  return { name, data }
}
