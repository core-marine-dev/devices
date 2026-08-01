// coded
import { IMU_STATUS, TIME_STAMP, imuStatus } from './shared'

import type { Decoder, FieldDefinition, LogDefinition } from '../../types'
import { scaled } from '../../utils'

/* SBG_ECOM_LOG_IMU_DATA (03) — §2.3.4.1 "Time filtered IMU data"

  Field          Unit   Format  Size  Offset
  TIME_STAMP     µs     uint32     4       0
  IMU_STATUS     -      uint16     2       4
  ACCEL_X        m/s²   float      4       6   Filtered accelerometer, X axis
  ACCEL_Y        m/s²   float      4      10
  ACCEL_Z        m/s²   float      4      14
  GYRO_X         rad/s  float      4      18   Filtered gyroscope, X axis
  GYRO_Y         rad/s  float      4      22
  GYRO_Z         rad/s  float      4      26
  TEMP           °C     float      4      30   Internal temperature
  DELTA_VEL_X    m/s²   float      4      34   Sculling output, X axis
  DELTA_VEL_Y    m/s²   float      4      38
  DELTA_VEL_Z    m/s²   float      4      42
  DELTA_ANGLE_X  rad/s  float      4      46   Coning output, X axis
  DELTA_ANGLE_Y  rad/s  float      4      50
  DELTA_ANGLE_Z  rad/s  float      4      54
                              Total size 58    <- MEASURED: LEN 58 in the corpus
*/
const axis = (name: string, units: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units, description })

const IMU_DATA_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  IMU_STATUS,
  axis('ACCEL_X', 'm/s2', 'Filtered accelerometer, X axis'),
  axis('ACCEL_Y', 'm/s2', 'Filtered accelerometer, Y axis'),
  axis('ACCEL_Z', 'm/s2', 'Filtered accelerometer, Z axis'),
  axis('GYRO_X', 'rad/s', 'Filtered gyroscope, X axis'),
  axis('GYRO_Y', 'rad/s', 'Filtered gyroscope, Y axis'),
  axis('GYRO_Z', 'rad/s', 'Filtered gyroscope, Z axis'),
  axis('TEMP', 'degC', 'Internal temperature'),
  axis('DELTA_VEL_X', 'm/s2', 'Sculling output, X axis'),
  axis('DELTA_VEL_Y', 'm/s2', 'Sculling output, Y axis'),
  axis('DELTA_VEL_Z', 'm/s2', 'Sculling output, Z axis'),
  axis('DELTA_ANGLE_X', 'rad/s', 'Coning output, X axis'),
  axis('DELTA_ANGLE_Y', 'rad/s', 'Coning output, Y axis'),
  axis('DELTA_ANGLE_Z', 'rad/s', 'Coning output, Z axis'),
]

export const imuData: LogDefinition = {
  name: 'SBG_ECOM_LOG_IMU_DATA',
  message: 3,
  description: 'Time-filtered inertial data: accelerometers, gyroscopes, internal temperature, and the sculling and coning outputs',
  fields: IMU_DATA_FIELDS,
  decoders: { IMU_STATUS: imuStatus },
}

/* SBG_ECOM_LOG_IMU_SHORT (44) — §2.3.4.2 "IMU Short data"

  Field          Unit     Format  Size  Offset  Scaling
  TIME_STAMP     µs       uint32     4       0
  IMU_STATUS     -        uint16     2       4
  DELTA_VEL_X    m.s^-2   int32      4       6   1048576 LSB per 1 m.s^-2
  DELTA_VEL_Y    m.s^-2   int32      4      10
  DELTA_VEL_Z    m.s^-2   int32      4      14
  DELTA_ANGLE_X  rad.s^-1 int32      4      18   67108864 LSB per 1 rad.s^-1
  DELTA_ANGLE_Y  rad.s^-1 int32      4      22
  DELTA_ANGLE_Z  rad.s^-1 int32      4      26
  TEMP           °C       int16      2      28   256 LSB per 1 °C
                              Total size 32     <- MEASURED: LEN 32 in the corpus

  ⚠️ EVERY VALUE IN THIS LOG IS A SCALED INTEGER, and the 0.0.x parser applied none
  of the three factors — it reported the raw counts as if they were m/s² and rad/s,
  so a delta velocity came out ~10^6 times too large. The scale factors are
  powers of two (2^20, 2^26, 2^8), so the conversion is exact.

  Per docs/CMA.md the field keeps the datasheet's raw integer as `value` and the
  engineering value is published in its metadata — the raw number is what the wire
  carried, and both are useful. */
const RAW_LSB = 'LSB'
const DELTA_VELOCITY_LSB = 1_048_576
const DELTA_ANGLE_LSB = 67_108_864
const TEMPERATURE_LSB = 256

const counts = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'int32', units: RAW_LSB, description })

const IMU_SHORT_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  IMU_STATUS,
  counts('DELTA_VEL_X', `X axis delta velocity, ${DELTA_VELOCITY_LSB} LSB per m.s^-2`),
  counts('DELTA_VEL_Y', `Y axis delta velocity, ${DELTA_VELOCITY_LSB} LSB per m.s^-2`),
  counts('DELTA_VEL_Z', `Z axis delta velocity, ${DELTA_VELOCITY_LSB} LSB per m.s^-2`),
  counts('DELTA_ANGLE_X', `X axis delta angle, ${DELTA_ANGLE_LSB} LSB per rad.s^-1`),
  counts('DELTA_ANGLE_Y', `Y axis delta angle, ${DELTA_ANGLE_LSB} LSB per rad.s^-1`),
  counts('DELTA_ANGLE_Z', `Z axis delta angle, ${DELTA_ANGLE_LSB} LSB per rad.s^-1`),
  { name: 'TEMP', type: 'int16', units: RAW_LSB, description: `IMU temperature, ${TEMPERATURE_LSB} LSB per degC` },
]

const velocity: Decoder = (value) => scaled(value, DELTA_VELOCITY_LSB, 'm/s2')
const angle: Decoder = (value) => scaled(value, DELTA_ANGLE_LSB, 'rad/s')

export const imuShort: LogDefinition = {
  name: 'SBG_ECOM_LOG_IMU_SHORT',
  message: 44,
  description: 'Compact asynchronous delta angles and delta velocities straight from the IMU, as scaled integers. Recommended for post-processing: smallest size and best accuracy.',
  fields: IMU_SHORT_FIELDS,
  decoders: {
    IMU_STATUS: imuStatus,
    DELTA_VEL_X: velocity,
    DELTA_VEL_Y: velocity,
    DELTA_VEL_Z: velocity,
    DELTA_ANGLE_X: angle,
    DELTA_ANGLE_Y: angle,
    DELTA_ANGLE_Z: angle,
    TEMP: (value) => scaled(value, TEMPERATURE_LSB, 'degC'),
  },
}
