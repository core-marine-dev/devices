import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID 29 -> SBG_ECOM_LOG_DVL_BOTTOM_TRACK => Doppler Velocity Log for bottom tracking data
/* Message ID 30 -> SBG_ECOM_LOG_DVL_WATER_TRACK  => Doppler Velocity log for water layer data
 * Field           Offset  Size  Format  Unit  Description
 * TIME_STAMP           0     4  uint32    μs  Time since sensor is powered up or delay
 * DVL_STATUS           4     2  uint16     -  DVL velocity status bit-mask
 * VELOCITY_X           6     4   float   m/s  Velocity X expressed in the DVL instrument frame
 * VELOCITY_Y          10     4   float   m/s  Velocity Y expressed in the DVL instrument frame
 * VELOCITY_Z          14     4   float   m/s  Velocity Z expressed in the DVL instrument frame
 * VELOCITY_QUALITY_X  18     4   float   m/s  X velocity quality expressed in the DVL instrument frame
 * VELOCITY_QUALITY_Y  22     4   float   m/s  Y velocity quality expressed in the DVL instrument frame
 * VELOCITY_QUALITY_Z  26     4   float   m/s  Z velocity quality expressed in the DVL instrument frame
 *          Total size 30
 *
 * DVL_STATUS definition
 * Bit       Type  Name                          Description
 *  0 (LSB)  Mask  SBG_ECOM_DVL_VELOCITY_VALID   Set to 1 if the DVL equipment was able to measure a valid velocity.
 *  1        Mask  SBG_ECOM_DVL_TIME_SYNC        Set to 1 if the data is accurately time stamped using a Sync In or Sync Out.
*/
interface DopplerVelocityStatus {
  SBG_ECOM_DVL_VELOCITY_VALID: boolean
  SBG_ECOM_DVL_TIME_SYNC: boolean
}

const getDopplerVelocityStatus = (dopplerVelocityStatus: number): DopplerVelocityStatus => ({
  SBG_ECOM_DVL_VELOCITY_VALID: bitStatus(dopplerVelocityStatus, 0),
  SBG_ECOM_DVL_TIME_SYNC: bitStatus(dopplerVelocityStatus, 1)
})

const SBG_ECOM_LOG_DVL = (payload: Buffer): object => {
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    dopplerVelocityStatus: payload.readUIntLE(4, 2),
    velocityX: payload.readFloatLE(6),
    velocityY: payload.readFloatLE(10),
    velocityZ: payload.readFloatLE(14),
    velocityQualityX: payload.readFloatLE(18),
    velocityQualityY: payload.readFloatLE(22),
    velocityQualityZ: payload.readFloatLE(26),
    metadata: {}
  }
  data.metadata = {
    odometerStatus: getDopplerVelocityStatus(data.dopplerVelocityStatus)
  }
  return data
}

export const SBG_ECOM_LOG_DVL_BOTTOM_TRACK = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_DVL_BOTTOM_TRACK'
  const data = SBG_ECOM_LOG_DVL(payload)
  return { name, data }
}

export const SBG_ECOM_LOG_DVL_WATER_TRACK = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_DVL_WATER_TRACK'
  const data = SBG_ECOM_LOG_DVL(payload)
  return { name, data }
}
