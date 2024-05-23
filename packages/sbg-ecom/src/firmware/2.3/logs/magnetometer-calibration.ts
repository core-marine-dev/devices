import type { SBGFrameNameData } from '../../../types'
/* Message ID 05 -> SBG_ECOM_LOG_MAG_CALIB => Magnetometer calibration data(raw buffer)
 * Field         Offset  Size   Format   Unit  Description
 * TIME_STAMP         0     4   uint32     µs  Time since sensor is powered up
 * RESERVED           4     2   uint16      -  Reserved field for future uses
 * BUFFER             6    16  bites16      -  Raw magnetic calibration buffer
 *        Total size 22
*/
export const SBG_ECOM_LOG_MAG_CALIB = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_MAG_CALIB'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    reserved: payload.readUIntLE(4, 2),
    buffer: payload.subarray(6, 22)
  }
  return { name, data }
}
