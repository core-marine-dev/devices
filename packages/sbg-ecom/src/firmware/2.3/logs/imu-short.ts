import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID 44 -> SBG_ECOM_LOG_IMU_SHORT => Asynchronous delta angles and delta velocities values from IMU directly
 * Field          Offset  Size  Format     Unit  Description
 * TIME_STAMP          0     4  uint32       µs  Time since sensor is powered up
 * IMU_STATUS          4     2  uint16        -  IMU Status bitmask
 * DELTA_VEL_X         6     4   int32    m.s-2  X axis delta velocity – Scaling  1048576 LSB for 1 m.s-2
 * DELTA_VEL_Y        10     4   int32    m.s-2  Y axis delta velocity – Scaling  1048576 LSB for 1 m.s-2
 * DELTA_VEL_Z        14     4   int32    m.s-2  Z axis delta velocity – Scaling  1048576 LSB for 1 m.s-2
 * DELTA_ANGLE_X      18     4   int32  rad.s-1  X axis delta angle    – Scaling 67108864 LSB for 1 rad.s -1
 * DELTA_ANGLE_Y      22     4   int32  rad.s-1  Y axis delta angle    – Scaling 67108864 LSB for 1 rad.s -1
 * DELTA_ANGLE_Z      26     4   int32  rad.s-1  Z axis delta angle    – Scaling 67108864 LSB for 1 rad.s-1
 * TEMP               30     2   int16       °C  IMU Temperature       – Scaling      256 LSB for 1°C
 *         Total size 32
 *
 * IMU_STATUS definition -> Status used to know if sensors are working correctly and are in their measurement range.
 * Bit  Name                          Description
 *  0   SBG_ECOM_IMU_COM_OK           Set to 1 if the communication with the IMU is ok.
 *  1   SBG_ECOM_IMU_STATUS_BIT       Set to 1 if internal IMU passes Built In Test (Calibration, CPU)
 *  2   SBG_ECOM_IMU_ACCEL_X_BIT      Set to 1 if accelerometer X passes Built In Test
 *  3   SBG_ECOM_IMU_ACCEL_Y_BIT      Set to 1 if accelerometer Y passes Built In Test
 *  4   SBG_ECOM_IMU_ACCEL_Z_BIT      Set to 1 if accelerometer Z passes Built In Test
 *  5   SBG_ECOM_IMU_GYRO_X_BIT       Set to 1 if gyroscope X passes Built In Test
 *  6   SBG_ECOM_IMU_GYRO_Y_BIT       Set to 1 if gyroscope Y passes Built In Test
 *  7   SBG_ECOM_IMU_GYRO_Z_BIT       Set to 1 if gyroscope Z passes Built In Test
 *  8   SBG_ECOM_IMU_ACCELS_IN_RANGE  Set to 1 if accelerometers are within operating range
 *  9   SBG_ECOM_IMU_GYROS_IN_RANGE   Set to 1 if gyroscopes are within operating range
*/
interface IMUStatus {
  ok: boolean
  status: boolean
  accelerationX: boolean
  accelerationY: boolean
  accelerationZ: boolean
  gyroX: boolean
  gyroY: boolean
  gyroZ: boolean
  accelerationsInRange: boolean
  gyrosInRange: boolean
}

const getIMUStatus = (imuStatus: number): IMUStatus => ({
  ok: bitStatus(imuStatus, 0),
  status: bitStatus(imuStatus, 1),
  accelerationX: bitStatus(imuStatus, 2),
  accelerationY: bitStatus(imuStatus, 3),
  accelerationZ: bitStatus(imuStatus, 4),
  gyroX: bitStatus(imuStatus, 5),
  gyroY: bitStatus(imuStatus, 6),
  gyroZ: bitStatus(imuStatus, 7),
  accelerationsInRange: bitStatus(imuStatus, 8),
  gyrosInRange: bitStatus(imuStatus, 9)
})

export const SBG_ECOM_LOG_IMU_SHORT = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_IMU_SHORT'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    imuStatus: payload.readUIntLE(4, 2),
    deltaVelocityX: payload.readIntLE(6, 4),
    deltaVelocityY: payload.readIntLE(10, 4),
    deltaVelocityZ: payload.readIntLE(14, 4),
    deltaAngleX: payload.readIntLE(18, 4),
    deltaAngleY: payload.readIntLE(22, 4),
    deltaAngleZ: payload.readIntLE(26, 4),
    temperature: payload.readIntLE(30, 2),
    metadata: {}
  }
  data.metadata = {
    imuStatus: getIMUStatus(data.imuStatus)
  }
  return { name, data }
}
