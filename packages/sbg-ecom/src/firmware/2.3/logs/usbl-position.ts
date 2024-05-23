import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID 37 -> SBG_ECOM_LOG_USBL => Raw USBL position data for subsea navigation
 * Field       Offset  Size  Format  Unit  Description
 * TIME_STAMP       0     4  uint32    μs  Time since sensor is powered up or delay
 * USBL_STATUS      4     2  uint16     -  USBL system status bitmask
 * LATITUDE         6     8  double     °  Latitude in degrees, positive north
 * LONGITUDE       14     8  double     °  Longitude in degrees, positive east
 * DEPTH           22     4   float     m  Depth in meters below mean sea level (positive down)
 * LATITUDE_STD    26     4   float     m  1σ latitude accuracy in meters
 * LONGITUDE_STD   30     4   float     m  1σ longitude accuracy in meters
 * DEPTH_STD       34     4   float     m  1σ depth accuracy in meters
 *      Total size 38
 *
 * USBL_STATUS definition
 * Bit       Type  Name                          Description
 *  0 (LSB)  Mask  SBG_ECOM_USBL_TIME_SYNC       Set to 1 if the altimeter equipment was correctly initialized
 *  1        Mask  SBG_ECOM_USBL_POSITION_VALID  Set to 1 if the USBL data represents a valid 2D position
 *  2        Mask  SBG_ECOM_USBL_DEPTH_VALID     Set to 1 if the USBL data has a valid depth information
*/
interface USBStatus {
  SBG_ECOM_USBL_TIME_SYNC: boolean
  SBG_ECOM_USBL_POSITION_VALID: boolean
  SBG_ECOM_USBL_DEPTH_VALID: boolean
}

const getUSBLStatus = (usblStatus: number): USBStatus => ({
  SBG_ECOM_USBL_TIME_SYNC: bitStatus(usblStatus, 0),
  SBG_ECOM_USBL_POSITION_VALID: bitStatus(usblStatus, 1),
  SBG_ECOM_USBL_DEPTH_VALID: bitStatus(usblStatus, 1)
})

export const SBG_ECOM_LOG_USBL = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_USBL'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    usblStatus: payload.readUIntLE(4, 2),
    latitude: payload.readDoubleLE(6),
    longitude: payload.readDoubleLE(14),
    depth: payload.readFloatLE(22),
    latitudeSTD: payload.readFloatLE(26),
    longitudeSTD: payload.readFloatLE(30),
    depthSTD: payload.readFloatLE(34),
    metadata: {}
  }
  data.metadata = {
    odometerStatus: getUSBLStatus(data.usblStatus)
  }
  return { name, data }
}
