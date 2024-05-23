import type { SBGFrameNameData } from '../../../types'
/* Message ID 31 -> SBG_ECOM_LOG_GPS1_RAW => GNSS raw data from primary receiver
 * Message ID 38 -> SBG_ECOM_LOG_GPS2_RAW => GNSS raw data from secondary receiver
 * Field            Offset    Size    Format  Unit  Description
 * RAW_BUFFER            0  [0-4096]  binary     -  Buffer that stores GNSS raw data as returned by the receiver.
 *     Total size [0-4096]
*/
const SBG_ECOM_LOG_GPS_RAW = (payload: Buffer): { rawBuffer: Buffer } => ({ rawBuffer: payload })

export const SBG_ECOM_LOG_GPS1_RAW = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_GPS1_RAW'
  const data = SBG_ECOM_LOG_GPS_RAW(payload)
  return { name, data }
}

export const SBG_ECOM_LOG_GPS2_RAW = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_GPS2_RAW'
  const data = SBG_ECOM_LOG_GPS_RAW(payload)
  return { name, data }
}
