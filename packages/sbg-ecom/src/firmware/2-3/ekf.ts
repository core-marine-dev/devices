// coded
import { SOLUTION_STATUS, TIME_STAMP, angleDecoders, metres, radians, solutionStatus } from './shared'

import type { FieldDefinition, LogDefinition } from '../../types'

/* The EKF output logs (§2.3.5). All three end with the shared SOLUTION_STATUS word.

   ⚠️ NAMING CORRECTED. The 0.0.x parser called EKF_EULER's ROLL_ACC / PITCH_ACC /
   YAW_ACC `rollAcceleration`, `pitchAcceleration` and `yawAcceleration`. They are
   not accelerations — §2.3.5.1 defines them as "1σ Roll angle accuracy", i.e. the
   uncertainty of the angle, in radians. A consumer reading `rollAcceleration` off
   that library got a standard deviation and had no way to know. The field tables
   here use the datasheet's own names, which is the whole point of having them. */

/* SBG_ECOM_LOG_EKF_EULER (06) — §2.3.5.1 "Euler angles"

  Field            Unit  Format  Size  Offset
  TIME_STAMP       µs    uint32     4       0
  ROLL             rad   float      4       4
  PITCH            rad   float      4       8
  YAW              rad   float      4      12  Yaw angle (heading)
  ROLL_ACC         rad   float      4      16  1σ roll angle accuracy
  PITCH_ACC        rad   float      4      20  1σ pitch angle accuracy
  YAW_ACC          rad   float      4      24  1σ yaw angle accuracy
  SOLUTION_STATUS  -     uint32     4      28
                              Total size 32    <- MEASURED: LEN 32 in the corpus
*/
const EULER_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  radians('ROLL', 'Roll angle'),
  radians('PITCH', 'Pitch angle'),
  radians('YAW', 'Yaw angle (heading)'),
  radians('ROLL_ACC', '1 sigma roll angle ACCURACY — the uncertainty of ROLL, not a rate of change'),
  radians('PITCH_ACC', '1 sigma pitch angle ACCURACY — the uncertainty of PITCH, not a rate of change'),
  radians('YAW_ACC', '1 sigma yaw angle ACCURACY — the uncertainty of YAW, not a rate of change'),
  SOLUTION_STATUS,
]

export const ekfEuler: LogDefinition = {
  name: 'SBG_ECOM_LOG_EKF_EULER',
  message: 6,
  description: 'Computed orientation as Euler angles, with a 1 sigma accuracy per axis and the Kalman filter solution status',
  fields: EULER_FIELDS,
  decoders: {
    SOLUTION_STATUS: solutionStatus,
    ...angleDecoders('ROLL', 'PITCH', 'YAW', 'ROLL_ACC', 'PITCH_ACC', 'YAW_ACC'),
  },
}

/* SBG_ECOM_LOG_EKF_QUAT (07) — §2.3.5.2 "Quaternion attitude"

  Field            Unit  Format  Size  Offset
  TIME_STAMP       µs    uint32     4       0
  Q0               -     float      4       4  First quaternion parameter (W)
  Q1               -     float      4       8  Second (X)
  Q2               -     float      4      12  Third (Y)
  Q3               -     float      4      16  Fourth (Z)
  ROLL_ACC         rad   float      4      20
  PITCH_ACC        rad   float      4      24
  YAW_ACC          rad   float      4      28
  SOLUTION_STATUS  -     uint32     4      32
                              Total size 36    <- MEASURED: LEN 36 in the corpus
*/
const quaternion = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', description })

const QUAT_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  quaternion('Q0', 'First quaternion parameter (W)'),
  quaternion('Q1', 'Second quaternion parameter (X)'),
  quaternion('Q2', 'Third quaternion parameter (Y)'),
  quaternion('Q3', 'Fourth quaternion parameter (Z)'),
  radians('ROLL_ACC', '1 sigma roll angle accuracy'),
  radians('PITCH_ACC', '1 sigma pitch angle accuracy'),
  radians('YAW_ACC', '1 sigma yaw angle accuracy'),
  SOLUTION_STATUS,
]

export const ekfQuat: LogDefinition = {
  name: 'SBG_ECOM_LOG_EKF_QUAT',
  message: 7,
  description: 'Computed orientation as a quaternion, with the same 1 sigma Euler accuracies and solution status as EKF_EULER',
  fields: QUAT_FIELDS,
  decoders: {
    SOLUTION_STATUS: solutionStatus,
    ...angleDecoders('ROLL_ACC', 'PITCH_ACC', 'YAW_ACC'),
  },
}

/* SBG_ECOM_LOG_EKF_NAV (08) — §2.3.5.3 "Navigation, position, velocity"

  Field            Unit  Format  Size  Offset
  TIME_STAMP       µs    uint32     4       0
  VELOCITY_N       m/s   float      4       4
  VELOCITY_E       m/s   float      4       8
  VELOCITY_D       m/s   float      4      12
  VELOCITY_N_ACC   m/s   float      4      16
  VELOCITY_E_ACC   m/s   float      4      20
  VELOCITY_D_ACC   m/s   float      4      24
  LATITUDE         °     double     8      28
  LONGITUDE        °     double     8      36
  ALTITUDE         m     double     8      44  Above mean sea level
  UNDULATION       m     float      4      52  WGS-84 altitude = MSL altitude + undulation
  LATITUDE_ACC     m     float      4      56
  LONGITUDE_ACC    m     float      4      60
  ALTITUDE_ACC     m     float      4      64
  SOLUTION_STATUS  -     uint32     4      68
                              Total size 72    <- MEASURED: LEN 72 in the corpus

  Note UNDULATION is a 4-byte FLOAT here, exactly as in GPS_POS, where the 0.0.x
  parser read it as a double and overlapped the next field. */
const velocity = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units: 'm/s', description })

const degreesWide = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float64', units: 'deg', description })

const NAV_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  velocity('VELOCITY_N', 'Velocity in the North direction'),
  velocity('VELOCITY_E', 'Velocity in the East direction'),
  velocity('VELOCITY_D', 'Velocity in the Down direction'),
  velocity('VELOCITY_N_ACC', '1 sigma North velocity accuracy'),
  velocity('VELOCITY_E_ACC', '1 sigma East velocity accuracy'),
  velocity('VELOCITY_D_ACC', '1 sigma Down velocity accuracy'),
  degreesWide('LATITUDE', 'Latitude, positive North'),
  degreesWide('LONGITUDE', 'Longitude, positive East'),
  { name: 'ALTITUDE', type: 'float64', units: 'm', description: 'Altitude above mean sea level' },
  metres('UNDULATION', 'Height of the geoid above the ellipsoid: WGS-84 altitude = MSL altitude + undulation'),
  metres('LATITUDE_ACC', '1 sigma latitude accuracy'),
  metres('LONGITUDE_ACC', '1 sigma longitude accuracy'),
  metres('ALTITUDE_ACC', '1 sigma vertical position accuracy'),
  SOLUTION_STATUS,
]

export const ekfNav: LogDefinition = {
  name: 'SBG_ECOM_LOG_EKF_NAV',
  message: 8,
  description: 'Navigation solution: NED velocity, geodetic position, the geoid undulation and a 1 sigma accuracy for each, with the Kalman filter solution status',
  fields: NAV_FIELDS,
  decoders: { SOLUTION_STATUS: solutionStatus },
  // WGS-84 altitude is what a GNSS consumer usually wants, and it takes TWO
  // fields to compute — the textbook case for payload-level metadata.
  payloadMetadata: (values) => {
    const altitude = values.ALTITUDE
    const undulation = values.UNDULATION
    if (typeof altitude !== 'number' || typeof undulation !== 'number') return {}
    return { ellipsoidAltitude: { value: altitude + undulation, units: 'm', description: 'Altitude above the WGS-84 ellipsoid: ALTITUDE (MSL) + UNDULATION' } }
  },
}
