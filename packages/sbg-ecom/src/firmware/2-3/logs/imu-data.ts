import type { SBGFrameNameData } from '../../../types'
import { bitStatus } from '../../../utils'
/* Message ID 03 -> SBG_ECOM_LOG_IMU_DATA => Includes IMU status, acc., gyro, temp delta speeds and delta angles values
 * Field          Offset  Size  Format   Unit  Description
 * TIME_STAMP          0     4  uint32     µs  Time since sensor is powered up
 * IMU_STATUS          4     2  uint16      -  IMU Status bitmask
 * ACCEL_X             6     4   float   m/s²  Filtered Accelerometer – X axis
 * ACCEL_Y            10     4   float   m/s²  Filtered Accelerometer – Y axis
 * ACCEL_Z            14     4   float   m/s²  Filtered Accelerometer – Z axis
 * GYRO_X             18     4   float  rad/s  Filtered Gyroscope – X axis
 * GYRO_Y             22     4   float  rad/s  Filtered Gyroscope – Y axis
 * GYRO_Z             26     4   float  rad/s  Filtered Gyroscope – Z axis
 * TEMPInternal       30     4   float     °C  Temperature
 * DELTA_VEL_X        34     4   float   m/s²  Sculling output – X axis
 * DELTA_VEL_Y        38     4   float   m/s²  Sculling output – Y axis
 * DELTA_VEL_Z        42     4   float   m/s²  Sculling output – Z axis
 * DELTA_ANGLE_X      46     4   float  rad/s  Coning output – X axis
 * DELTA_ANGLE_Y      50     4   float  rad/s  Coning output – Y axis
 * DELTA_ANGLE_Z      54     4   float  rad/s  Coning output – Z axis
 *         Total size 58
 *
 * IMU_STATUS definition -> Provide status on the clock stability, error and synchronization.
 * Bit  Name                          Type  Description
 *  0   SBG_ECOM_IMU_COM_OK           Mask  Set to 1 if the communication with the IMU is ok.
 *  1   SBG_ECOM_IMU_STATUS_BIT       Mask  Set to 1 if internal IMU passes Built In Test (Calibration, CPU)
 *  2   SBG_ECOM_IMU_ACCEL_X_BIT      Mask  Set to 1 if accelerometer X passes Built In Test
 *  3   SBG_ECOM_IMU_ACCEL_Y_BIT      Mask  Set to 1 if accelerometer Y passes Built In Test
 *  4   SBG_ECOM_IMU_ACCEL_Z_BIT      Mask  Set to 1 if accelerometer Z passes Built In Test
 *  5   SBG_ECOM_IMU_GYRO_X_BIT       Mask  Set to 1 if gyroscope X passes Built In Test
 *  6   SBG_ECOM_IMU_GYRO_Y_BIT       Mask  Set to 1 if gyroscope Y passes Built In Test
 *  7   SBG_ECOM_IMU_GYRO_Z_BIT       Mask  Set to 1 if gyroscope Z passes Built In Test
 *  8   SBG_ECOM_IMU_ACCELS_IN_RANGE  Mask  Set to 1 if accelerometers are within operating range
 *  9   SBG_ECOM_IMU_GYROS_IN_RANGE   Mask  Set to 1 if gyroscopes are within operating range
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

const getIMUStatus = (imuStatus: number): IMUStatus => {
  return {
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
  }
}

export const SBG_ECOM_LOG_IMU_DATA = (payload: Buffer): SBGFrameNameData => {
  const name = 'SBG_ECOM_LOG_IMU_DATA'
  const data = {
    timestamp: payload.readUIntLE(0, 4),
    imuStatus: payload.readUIntLE(4, 2),
    accelerationX: payload.readFloatLE(6),
    accelerationY: payload.readFloatLE(10),
    accelerationZ: payload.readFloatLE(14),
    gyroX: payload.readFloatLE(18),
    gyroY: payload.readFloatLE(22),
    gyroZ: payload.readFloatLE(26),
    temperatureInternal: payload.readFloatLE(30),
    deltaVelocityX: payload.readFloatLE(34),
    deltaVelocityY: payload.readFloatLE(38),
    deltaVelocityZ: payload.readFloatLE(42),
    deltaAngleX: payload.readFloatLE(46),
    deltaAngleY: payload.readFloatLE(50),
    deltaAngleZ: payload.readFloatLE(54),
    metadata: {}
  }
  data.metadata = {
    imuStatus: getIMUStatus(data.imuStatus)
  }
  return { name, data }
}
