import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID 47 -> SBG_ECOM_LOG_DEPTH => Depth sensor measurement log used for subsea navigation
 * Field       Offset  Size  Format  Unit  Description
 * TIME_STAMP       0     4  uint32    μs  Time since sensor is powered up or delay
 * DEPTH_STATUS     4     2  uint16     -  Depth sensor status bit-mask
 * PRESSURE_ABS     6     4   float    Pa  Absolute water pressure expressed in Pascals
 * DEPTH           10     4   float   m/s  Underwater depth measurement, positive upward
 *      Total size 14
 *
 * DEPTH_STATUS definition
 * Bit       Type  Name                               Description
 *  0 (LSB)  Mask  SBG_ECOM_DEPTH_TIME_IS_DELAY       Set to 1 if the time stamp field represents a delay instead of an absolute time stamp.
 *  1        Mask  SBG_ECOM_DEPTH_PRESSURE_ABS_VALID  Set to 1 if the pressure field is filled and valid.
 *  2        Mask  SBG_ECOM_DEPTH_ALTITUDE_VALID      Set to 1 if the depth altitude field is filled and valid.
*/
interface DepthStatus {
  SBG_ECOM_DEPTH_TIME_IS_DELAY: boolean
  SBG_ECOM_DEPTH_PRESSURE_ABS_VALID: boolean
  SBG_ECOM_DEPTH_ALTITUDE_VALID: boolean
}

const getDepthStatus = (depthStatus: number): DepthStatus => ({
  SBG_ECOM_DEPTH_TIME_IS_DELAY: bitStatus(depthStatus, 0),
  SBG_ECOM_DEPTH_PRESSURE_ABS_VALID: bitStatus(depthStatus, 1),
  SBG_ECOM_DEPTH_ALTITUDE_VALID: bitStatus(depthStatus, 1)
})

export const SBG_ECOM_LOG_DEPTH = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_DEPTH'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    depthStatus: payload.readUIntLE(4, 2),
    pressureAbsolute: payload.readFloatLE(6),
    depth: payload.readFloatLE(10),
    metadata: {}
  }
  data.metadata = {
    odometerStatus: getDepthStatus(data.depthStatus)
  }
  return { name, data }
}
