import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID 19 -> SBG_ECOM_LOG_ODO_VEL => Provides odometer velocity measured by the device
 * Field       Offset  Size  Format  Unit  Description
 * TIME_STAMP       0     4  uint32    μs  Time since sensor is powered up
 * ODO_STATUS       4     2  uint16     -  Odometer velocity status bit-mask
 * ODO_VEL          6     4   float   m/s  Velocity in odometer direction
 *      Total size 10
 *
 * ODO_VEL_STATUS definition
 * Bit       Name                    Description
 *  0 (LSB)  SBG_ECOM_ODO_REAL_MEAS  Set to 1 if this log comes from a real pulse measurement or 0 if it comes from a timeout.
 *  1        SBG_ECOM_ODO_TIME_SYNC  Set to 1 if the velocity information is correctly time synchronized.
*/
interface OdometerStatus {
  SBG_ECOM_ODO_REAL_MEAS: boolean
  SBG_ECOM_ODO_TIME_SYNC: boolean
}
const getOdometerStatus = (odometerStatus: number): OdometerStatus => ({
  SBG_ECOM_ODO_REAL_MEAS: bitStatus(odometerStatus, 0),
  SBG_ECOM_ODO_TIME_SYNC: bitStatus(odometerStatus, 1)
})

export const SBG_ECOM_LOG_ODO_VEL = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_ODO_VEL'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    odometerStatus: payload.readUIntLE(4, 2),
    odometerVelocity: payload.readFloatLE(6),
    metadata: {}
  }
  data.metadata = {
    odometerStatus: getOdometerStatus(data.odometerStatus)
  }
  return { name, data }
}
