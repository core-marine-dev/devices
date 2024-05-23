import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID 04 -> SBG_ECOM_LOG_MAG => Magnetic data with associated accelerometer on each axis
 * Field         Offset  Size  Format   Unit  Description
 * TIME_STAMP         0     4  uint32     µs  Time since sensor is powered up
 * MAG_STATUS         4     2  uint16      -  Magnetometer status bitmask
 * MAG_X              6     4   float    a.u  Magnetometer output – X axis
 * MAG_Y             10     4   float    a.u  Magnetometer output – Y axis
 * MAG_Z             14     4   float    a.u  Magnetometer output – Z axis
 * ACCEL_X           18     4   float   m/s²  Accelerometer output – X axis
 * ACCEL_Y           22     4   float   m/s²  Accelerometer output – Y axis
 * ACCEL_Z           26     4   float   m/s²  Accelerometer output – Z axis
 *        Total size 30
 *
 * MAG_STATUS definition ->
 * Bit  Type  Name                          Description
 *  0   Mask  SBG_ECOM_MAG_MAG_X_BIT        Set to 1 if the magnetometer X has passed the self test.
 *  1   Mask  SBG_ECOM_MAG_MAG_Y_BIT        Set to 1 if the magnetometer Y has passed the self test.
 *  2   Mask  SBG_ECOM_MAG_MAG_Z_BIT        Set to 1 if the magnetometer Z has passed the self test.
 *  3   Mask  SBG_ECOM_MAG_ACCEL_X_BIT      Set to 1 if the accelerometer X has passed the self test.
 *  4   Mask  SBG_ECOM_MAG_ACCEL_Y_BIT      Set to 1 if the accelerometer Y has passed the self test.
 *  5   Mask  SBG_ECOM_MAG_ACCEL_Z_BIT      Set to 1 if the accelerometer Z has passed the self test.
 *  6   Mask  SBG_ECOM_MAG_MAGS_IN_RANGE    Set to 1 if magnetometer is not saturated
 *  7   Mask  SBG_ECOM_MAG_ACCELS_IN_RANGE  Set to 1 if accelerometer is not saturated
 *  8   Mask  SBG_ECOM_MAG_CALIBRATION_OK   Set to 1 if magnetometer seems to be calibrated
*/
export const SBG_ECOM_LOG_MAG = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_MAG'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    magnetometerStatus: payload.readUIntLE(4, 2),
    magnetometerX: payload.readFloatLE(6),
    magnetometerY: payload.readFloatLE(10),
    magnetometerZ: payload.readFloatLE(14),
    accelerometerX: payload.readFloatLE(18),
    accelerometerY: payload.readFloatLE(22),
    accelerometerZ: payload.readFloatLE(26),
    metadata: {}
  }
  data.metadata = {
    magnetometerStatus: {
      magnetometerX: bitStatus(data.magnetometerStatus, 0),
      magnetometerY: bitStatus(data.magnetometerStatus, 1),
      magnetometerZ: bitStatus(data.magnetometerStatus, 2),
      accelerometerX: bitStatus(data.magnetometerStatus, 3),
      accelerometerY: bitStatus(data.magnetometerStatus, 4),
      accelerometerZ: bitStatus(data.magnetometerStatus, 5),
      magnetometer: bitStatus(data.magnetometerStatus, 6),
      accelerometer: bitStatus(data.magnetometerStatus, 7),
      calibration: bitStatus(data.magnetometerStatus, 8)
    }
  }
  return { data, name }
}
