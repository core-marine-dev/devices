// installed
import { describe, expect, test } from 'vitest'

// coded
import { STREAM_LOGS, STREAM_MIXED, capture } from './fixtures'

import { SBGParser } from '../src'
import type { CMA, Field } from '../src'

/* THE LOG TABLES, checked against REAL FRAMES and against physics.

   These are the tests a fake round trip cannot replace: a fake is built from the same
   table it is decoded with, so it agrees with itself even when the table is wrong.
   What catches a wrong table is a real capture plus a sanity check on the number —
   an ELLIPSE bolted to a quay does not roll 40 degrees. */

const parse = (name: string): CMA[] => new SBGParser().parseData(capture(name))

const firstOf = (sentences: CMA[], name: string): CMA => {
  const found = sentences.find((one) => one.metadata.name === name)
  if (found === undefined) throw new Error(`no ${name} in this capture`)
  return found
}

const field = (sentence: CMA, name: string): Field => {
  const found = sentence.payload.find((one) => one.name === name)
  if (found === undefined) throw new Error(`${sentence.metadata.name as string} has no field ${name}`)
  return found
}

const value = (sentence: CMA, name: string): number => {
  const raw = field(sentence, name).value
  if (typeof raw !== 'number') throw new Error(`${name} is ${JSON.stringify(raw)}, not a number`)
  return raw
}

const MIXED = parse(STREAM_MIXED)
const LOGS = parse(STREAM_LOGS)

describe('field names come from the datasheet, so a consumer is not misled', () => {
  test('EKF_EULER reports ACCURACIES, not accelerations', () => {
    const euler = firstOf(MIXED, 'SBG_ECOM_LOG_EKF_EULER')
    expect(euler.payload.map((one) => one.name)).toEqual([
      'TIME_STAMP', 'ROLL', 'PITCH', 'YAW', 'ROLL_ACC', 'PITCH_ACC', 'YAW_ACC', 'SOLUTION_STATUS',
    ])
    // The 0.0.x parser called these rollAcceleration/pitchAcceleration/yawAcceleration.
    // §2.3.5.1 defines them as "1σ Roll angle accuracy" — an uncertainty, in radians.
    expect(field(euler, 'ROLL_ACC').description).toMatch(/ACCURACY/)
    expect(field(euler, 'ROLL_ACC').units).toBe('rad')
  })
})

describe('the values are physically plausible, which is what catches a wrong order', () => {
  test('attitude from a quay-side ELLIPSE is small, and the rates are radians', () => {
    const euler = firstOf(MIXED, 'SBG_ECOM_LOG_EKF_EULER')
    // Radians. A stationary unit on a quay: roll and pitch within a few degrees.
    expect(Math.abs(value(euler, 'ROLL'))).toBeLessThan(0.2)
    expect(Math.abs(value(euler, 'PITCH'))).toBeLessThan(0.2)
    expect(Math.abs(value(euler, 'YAW'))).toBeLessThanOrEqual(Math.PI * 2)
    // An accuracy is a standard deviation: non-negative, and small when converged.
    expect(value(euler, 'ROLL_ACC')).toBeGreaterThanOrEqual(0)
    expect(value(euler, 'ROLL_ACC')).toBeLessThan(1)
  })

  test('every angular field publishes its degree equivalent in metadata', () => {
    const euler = firstOf(MIXED, 'SBG_ECOM_LOG_EKF_EULER')
    const roll = field(euler, 'ROLL')
    const degrees = (roll.metadata as { value: number }).value
    expect(degrees).toBeCloseTo(value(euler, 'ROLL') * (180 / Math.PI), 9)
    expect((roll.metadata as { units: string }).units).toBe('deg')
  })

  test('GPS position lands where the capture was taken, and undulation is a FLOAT', () => {
    const position = firstOf(MIXED, 'SBG_ECOM_LOG_GPS1_POS')
    // The corpus is from Spain: ~40.41 N, ~3.72 W. This is the assertion that would
    // have caught the 0.0.x float64 read of UNDULATION, because an 8-byte read there
    // consumed POS_ACC_LAT too and the field after it drifted.
    expect(value(position, 'LAT')).toBeGreaterThan(40)
    expect(value(position, 'LAT')).toBeLessThan(41)
    expect(value(position, 'LONG')).toBeGreaterThan(-4)
    expect(value(position, 'LONG')).toBeLessThan(-3)
    expect(field(position, 'UNDULATION').type).toBe('float32')
    // The Iberian geoid undulation is ~50 m, and the capture's own GGA agrees: its
    // geoidal separation field reads 50.238.
    expect(value(position, 'UNDULATION')).toBeCloseTo(50.238, 2)
  })

  test('the last two GPS_POS fields are where the frame length says, not where the offset column says', () => {
    const position = firstOf(MIXED, 'SBG_ECOM_LOG_GPS1_POS')
    // Packed at 53 and 55. If they were at the printed 54/56 the log would be 58
    // bytes and every frame in the corpus would report a trailing byte.
    expect(position.metadata.trailing).toBeUndefined()
    expect(value(position, 'BASE_STATION_ID')).toBeGreaterThanOrEqual(0)
    expect(value(position, 'DIFF_AGE')).toBeGreaterThanOrEqual(0)
    expect(position.metadata.length).toMatchObject({ value: 57 })
  })

  test('GPS_POS publishes the ellipsoid altitude, which takes TWO fields', () => {
    const position = firstOf(MIXED, 'SBG_ECOM_LOG_GPS1_POS')
    const payload = position.metadata.payload as { ellipsoidAltitude: { value: number } }
    expect(payload.ellipsoidAltitude.value).toBeCloseTo(value(position, 'ALT') + value(position, 'UNDULATION'), 6)
  })

  test('IMU_SHORT applies its three scale factors', () => {
    const short = firstOf(LOGS, 'SBG_ECOM_LOG_IMU_SHORT')
    // The raw value stays on the field, per docs/CMA.md; the engineering value is in
    // metadata. The 0.0.x parser published the raw counts AS m/s2 — off by 2^20.
    const raw = value(short, 'DELTA_VEL_Z')
    const scaled = field(short, 'DELTA_VEL_Z').metadata as { value: number, units: string }
    expect(scaled.value).toBeCloseTo(raw / 1_048_576, 12)
    expect(scaled.units).toBe('m/s2')
    // Gravity dominates the Z delta velocity of a stationary unit: ~9.8 m/s2.
    expect(Math.abs(scaled.value)).toBeGreaterThan(9)
    expect(Math.abs(scaled.value)).toBeLessThan(11)
    // Temperature: 256 LSB per degC, and the box is somewhere between 0 and 70.
    const temperature = (field(short, 'TEMP').metadata as { value: number }).value
    expect(temperature).toBeGreaterThan(0)
    expect(temperature).toBeLessThan(70)
  })

  test('IMU_DATA acceleration is dominated by gravity on the Z axis', () => {
    const imu = firstOf(LOGS, 'SBG_ECOM_LOG_IMU_DATA')
    const magnitude = Math.hypot(value(imu, 'ACCEL_X'), value(imu, 'ACCEL_Y'), value(imu, 'ACCEL_Z'))
    // A stationary IMU measures 1 g whatever its orientation. This one assertion
    // proves the three axes are read at the right offsets and as float32.
    expect(magnitude).toBeGreaterThan(9.5)
    expect(magnitude).toBeLessThan(10.1)
    expect(value(imu, 'TEMP')).toBeGreaterThan(0)
    expect(value(imu, 'TEMP')).toBeLessThan(70)
  })

  test('EKF_QUAT quaternions are normalised', () => {
    const quat = firstOf(LOGS, 'SBG_ECOM_LOG_EKF_QUAT')
    const norm = Math.hypot(value(quat, 'Q0'), value(quat, 'Q1'), value(quat, 'Q2'), value(quat, 'Q3'))
    // A unit quaternion, by definition. Nothing else would come out at 1.0 if the
    // four float32 reads were misaligned by even one byte.
    expect(norm).toBeCloseTo(1, 5)
  })

  test('UTC_TIME decodes to the date the capture was taken', () => {
    const utc = firstOf(MIXED, 'SBG_ECOM_LOG_UTC_TIME')
    expect(value(utc, 'YEAR')).toBeGreaterThan(2000)
    expect(value(utc, 'MONTH')).toBeGreaterThanOrEqual(1)
    expect(value(utc, 'MONTH')).toBeLessThanOrEqual(12)
    expect(value(utc, 'DAY')).toBeLessThanOrEqual(31)
    expect(value(utc, 'HOUR')).toBeLessThanOrEqual(23)
    // The capture's own GGA sentences read 0937xx UTC, so the hour must agree.
    expect(value(utc, 'HOUR')).toBe(9)
    expect(value(utc, 'MIN')).toBe(38)
  })
})

describe('bitfields and enums land in metadata, decoded by documented bit ranges', () => {
  test('SOLUTION_STATUS reports a mode and the aiding flags', () => {
    const euler = firstOf(MIXED, 'SBG_ECOM_LOG_EKF_EULER')
    const status = field(euler, 'SOLUTION_STATUS').metadata as Record<string, unknown>
    expect(status.label).toMatch(/^SBG_ECOM_SOL_MODE_/)
    expect(typeof status.attitudeValid).toBe('boolean')
    expect(typeof status.gps1PositionUsed).toBe('boolean')
    // Bits 12, 16, 21, 22 and 23 are undefined by §2.3.5 and are NOT invented.
    expect(Object.keys(status)).not.toContain('bit12')
  })

  test('the CAN bus enum is read from THREE bits, so bit 31 cannot leak in', () => {
    const status = firstOf(MIXED, 'SBG_ECOM_LOG_STATUS')
    const com = field(status, 'COM_STATUS').metadata as { canBus: string }
    expect(['SBG_ECOM_CAN_BUS_OFF', 'SBG_ECOM_CAN_BUS_TX_RX_ERR', 'SBG_ECOM_CAN_BUS_OK', 'SBG_ECOM_CAN_BUS_ERROR', 'UNKNOWN']).toContain(com.canBus)
  })

  test('STATUS decodes the three status words and reports uptime in hours', () => {
    const status = firstOf(MIXED, 'SBG_ECOM_LOG_STATUS')
    expect((field(status, 'GENERAL_STATUS').metadata as { mainPowerOk: boolean }).mainPowerOk).toBe(true)
    expect((field(status, 'AIDING_STATUS').metadata as { gps1Position: boolean }).gps1Position).toBe(true)
    const hours = (field(status, 'UP_TIME').metadata as { value: number }).value
    expect(hours).toBeCloseTo(value(status, 'UP_TIME') / 3600, 9)
  })

  test('reserved fields stay in the payload but are flagged', () => {
    const status = firstOf(MIXED, 'SBG_ECOM_LOG_STATUS')
    // Kept so payload[i] stays aligned 1:1 with the datasheet's rows.
    expect(status.payload.map((one) => one.name)).toContain('RESERVED_1')
    expect((field(status, 'RESERVED_1').metadata as { reserved: boolean }).reserved).toBe(true)
  })

  test('GPS_POS_STATUS reports which constellations contributed', () => {
    const position = firstOf(MIXED, 'SBG_ECOM_LOG_GPS1_POS')
    const status = field(position, 'GPS_POS_STATUS').metadata as { status: string, type: string, signals: Record<string, boolean> }
    expect(status.status).toBe('SBG_ECOM_POS_SOL_COMPUTED')
    expect(status.type).toMatch(/^SBG_ECOM_POS_/)
    expect(status.signals.gpsL1).toBe(true)
  })

  test('SHIP_MOTION says whether its heave is usable at all', () => {
    const motion = firstOf(MIXED, 'SBG_ECOM_LOG_SHIP_MOTION')
    const status = field(motion, 'HEAVE_STATUS').metadata as { heaveValid: boolean, surgeSwayIncluded: boolean }
    expect(typeof status.heaveValid).toBe('boolean')
    // An ELLIPSE supports heave only, so surge and sway read zero — and this flag is
    // the only thing distinguishing "not provided" from "the vessel did not move".
    expect(status.surgeSwayIncluded).toBe(false)
    expect(value(motion, 'SURGE')).toBe(0)
  })
})

describe('every capture frame is fully consumed by its table', () => {
  test('no modelled log reports trailing bytes', () => {
    // A trailing run would mean the table is SHORTER than the device's log — either a
    // firmware that grew it (§2.4) or a table that is wrong. On firmware 2.3 with
    // this corpus, neither should be true.
    for (const sentence of [...MIXED, ...LOGS]) {
      if (sentence.metadata.name === 'unknown' || sentence.protocol.name !== 'SBG ECOM') continue
      expect(sentence.metadata.trailing, `${sentence.metadata.name as string} has trailing bytes`).toBeUndefined()
    }
  })

  test('no field failed to decode', () => {
    for (const sentence of [...MIXED, ...LOGS]) {
      for (const one of sentence.payload) {
        expect(one.errors, `${sentence.metadata.name as string}.${one.name}`).toBeUndefined()
      }
    }
  })
})
