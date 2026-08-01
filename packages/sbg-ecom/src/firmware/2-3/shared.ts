// installed
import type { Metadata } from '@coremarine/protocol-core'

// coded
import type { Decoder, FieldDefinition } from '../../types'
import { bitState, degrees, enumBits } from '../../utils'

/* Definitions and decoders shared by more than one log. Kept here rather than
   duplicated so a datasheet correction lands in one place — the 0.0.x parser
   repeated the IMU status bit list in two files and the solution status in three. */

/* EVERY log except the two raw buffers opens with this field, and it is NOT a
   timestamp in the CMA sense: §2.3 calls it "Time since sensor is powered up".

   A microsecond uptime counter is not a clock — you cannot say when the sample was
   taken from it alone. It becomes one only in company with SBG_ECOM_LOG_UTC_TIME,
   which publishes BOTH this counter and the matching UTC, and that pairing is what
   SBGParser learns in order to fill metadata.timestamp.sentence. See docs/STATUS.md
   decision D6: uptime is never presented as a timestamp. */
export const TIME_STAMP: FieldDefinition = {
  name: 'TIME_STAMP',
  type: 'uint32',
  units: 'us',
  description: 'Time since the sensor was powered up. NOT a clock — an uptime counter. It becomes an absolute time only via SBG_ECOM_LOG_UTC_TIME, which pairs this counter with UTC.',
}

// IMU_STATUS — identical bit list in IMU_DATA (03), IMU_SHORT (44) and
// FAST_IMU_DATA (class 1). §2.3.4.1.
export const imuStatus: Decoder = (value) => ({
  communicationOk: bitState(value, 0),
  builtInTestOk: bitState(value, 1),
  accelerometerXOk: bitState(value, 2),
  accelerometerYOk: bitState(value, 3),
  accelerometerZOk: bitState(value, 4),
  gyroscopeXOk: bitState(value, 5),
  gyroscopeYOk: bitState(value, 6),
  gyroscopeZOk: bitState(value, 7),
  accelerometersInRange: bitState(value, 8),
  gyroscopesInRange: bitState(value, 9),
})

export const IMU_STATUS: FieldDefinition = {
  name: 'IMU_STATUS',
  type: 'uint16',
  description: 'IMU status bitmask: communication, built-in test per axis, and whether the sensors are within operating range',
}

// SOLUTION_STATUS — shared by every EKF output log (§2.3.5).
export const SOLUTION_MODES: Readonly<Record<number, string>> = {
  0: 'SBG_ECOM_SOL_MODE_UNINITIALIZED',
  1: 'SBG_ECOM_SOL_MODE_VERTICAL_GYRO',
  2: 'SBG_ECOM_SOL_MODE_AHRS',
  3: 'SBG_ECOM_SOL_MODE_NAV_VELOCITY',
  4: 'SBG_ECOM_SOL_MODE_NAV_POSITION',
}

/* Bits 12, 16, 21, 22, 23 are NOT DEFINED by §2.3.5 — the list jumps 11 -> 13,
   15 -> 17 and 20 -> 24. They are left out rather than guessed at, and a consumer
   reading the integer `value` still has them.

   "Used in solution" flags have a 3-second timeout (§2.3.5 note), so a flag
   reading false does not mean the aiding source is absent — only that it has not
   contributed recently. */
export const solutionStatus: Decoder = (value) => ({
  ...enumBits(SOLUTION_MODES, value, 0, 3),
  attitudeValid: bitState(value, 4),
  headingValid: bitState(value, 5),
  velocityValid: bitState(value, 6),
  positionValid: bitState(value, 7),
  verticalReferenceUsed: bitState(value, 8),
  magnetometerUsed: bitState(value, 9),
  gps1VelocityUsed: bitState(value, 10),
  gps1PositionUsed: bitState(value, 11),
  gps1HeadingUsed: bitState(value, 13),
  gps2VelocityUsed: bitState(value, 14),
  gps2PositionUsed: bitState(value, 15),
  gps2HeadingUsed: bitState(value, 17),
  odometerUsed: bitState(value, 18),
  dvlBottomTrackUsed: bitState(value, 19),
  dvlWaterTrackUsed: bitState(value, 20),
  usblUsed: bitState(value, 24),
  airDataUsed: bitState(value, 25),
  zeroVelocityUpdateUsed: bitState(value, 26),
  alignmentValid: bitState(value, 27),
  depthSensorUsed: bitState(value, 28),
})

export const SOLUTION_STATUS: FieldDefinition = {
  name: 'SOLUTION_STATUS',
  type: 'uint32',
  description: 'Kalman filter status: the solution mode in bits 0-3, then which aiding data is valid and which contributed to the solution',
}

// GPS_TOW — GPS time of week, in three of the GNSS logs. Not a UTC time: it is
// seconds into the current GPS week, with no week number anywhere in the log, so
// it cannot be resolved to an epoch on its own.
export const GPS_TOW: FieldDefinition = {
  name: 'GPS_TOW',
  type: 'uint32',
  units: 'ms',
  description: 'GPS time of week. Carries no week number, so it cannot be resolved to an absolute time from this log alone.',
}

// The raw GNSS solution status enum, bits 0-5 of every GPS_*_STATUS word. The
// three logs use different names for the same four codes (§2.3.6.3/4/5).
const gnssStatus = (prefix: string): Readonly<Record<number, string>> => ({
  0: `SBG_ECOM_${prefix}_SOL_COMPUTED`,
  1: `SBG_ECOM_${prefix}_INSUFFICIENT_OBS`,
  2: `SBG_ECOM_${prefix}_INTERNAL_ERROR`,
  3: (prefix === 'VEL') ? 'SBG_ECOM_VEL_LIMIT' : `SBG_ECOM_${prefix}_HEIGHT_LIMIT`,
})

export const GPS_POS_STATUSES = gnssStatus('POS')
export const GPS_VEL_STATUSES = gnssStatus('VEL')
export const GPS_HDT_STATUSES = gnssStatus('HDT')

// A degrees-per-second / degrees field pair helper used by several tables: the
// datasheet reports angles in radians, and marine consumers want degrees.
export const radians = (name: string, description: string): FieldDefinition => ({
  name,
  type: 'float32',
  units: 'rad',
  description,
})

export const metres = (name: string, description: string): FieldDefinition => ({
  name,
  type: 'float32',
  units: 'm',
  description,
})

export const degreesField = (name: string, description: string): FieldDefinition => ({
  name,
  type: 'float32',
  units: 'deg',
  description,
})

// Every angular field publishes its degree equivalent, so no consumer has to
// rediscover the conversion. Applied by name in each log's `decoders`.
export const angleDecoders = (...names: string[]): Readonly<Record<string, Decoder>> => {
  const decoders: Record<string, Decoder> = {}
  for (const name of names) decoders[name] = (value): Metadata => degrees(value)
  return decoders
}
