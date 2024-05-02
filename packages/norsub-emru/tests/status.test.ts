import { test, expect } from 'vitest'
import { Status } from '../src/types'
import { getStatus } from '../src/status'
import { StatusSchema } from '../src/schemas'
import { Uint16, Uint32 } from '@coremarine/nmea-parser/lib/types'

/** STATUS
 * Bit - Parameter            - Description
 *  00 - MAIN_OK              - 1 = no errors or warnings, initialization done. Everything OK.
 *  01 - MAIN_HEALTH          - 1 = no serious errors in sensor, algorithm or system.
 *  02 - SYSTEM_OK            - 1 = system operates normally.
 *  03 - SYSTEM_HEALTH        - 0 = system error. Restart required.
 *  04 - SYSTEM_TIME_SYNC     - 1 = time synchronized.
 *  05 - SYSTEM_CLOCK_SYNC    - 1 = clock synchronized.
 *  06 - SYSTEM_CPU_OK        - 1 = CPU load and memory are OK.
 *  07 - SENSOR_OK            - 1 = IMU is OK.
 *  08 - SENSOR_HEALTH        - 0 = IMU is malfunctioning or broken. Repair or replace MRU.
 *  09 - SENSOR_LIMITS        - 0 = IMU sensors are saturated.
 *  10 - ENV_VIBRATION        - 1 = environmental vibration levels are OK.
 *  11 - ENV_TEMPERATRURE     - 1 = environmental temperature is OK.
 *  12 - ALG_OK               - 1 = MRU algorithms are OK.
 *  13 - ALG_HEALTH           - 0 = MRU algorithms are unstable. Restart recommended.
 *  14 - ALG_OBS_INIT         - 1 = initialization of observer.
 *  15 - ALG_HEADING_INIT     - 1 = Initialization of heading.
 *  16 - ALG_ROLLP_OK         - 1 = roll/pitch are OK.
 *  17 - ALG_ROLLP_HEALTH     - 0 = roll/pitch are saturated/unstable. Restart recommended.
 *  18 - ALG_HEAD_OK          - 1 = heading is OK.
 *  19 - ALG_HEAD_HEALTH      - 0 = heading is saturated/unstable. Restart recommended.
 *  20 - ALG_SURGES_OK        - 1 = surge/sway are OK.
 *  21 - ALG_SURGES_HEALTH    - 0 = surge/sway saturated/unstable. Restart recommended.
 *  22 - ALG_HEAVE_OK         - 1 = heave is OK.
 *  23 - ALG_HEAVE_HEALTH     - 0 = heave is saturated or unstable. Restart recommended.
 *  24 - AID_POS_RECEIVED     - 1 = external position aiding is received.
 *  25 - AID_VEL_RECEIVED     - 1 = external velocity aiding is received.
 *  26 - AID_HEAD_RECEIVED    - 1 = external heading aiding is received.
 *  27 - AID_POS_VALID        - 1 = position aiding is valid and used in the observer.
 *  28 - AID_VEL_VALID        - 1 = velocity aiding is valid and used in the observer.
 *  29 - AID_HEAD_VALID       - 1 = heading aiding is valid and used in the observer.
 *  30 - AID_VERTICAL_VALID   - 1 = vertical position is valid and used in the observer.
 *  31 - AID_HORIZONTAL_VALID - 1 = horizontal position is valid and used in the observer.
**/

test('get Status from status full', () => {
  const status: Uint32 = Uint32Array.from([0b0_1010_1010_1010_1010_1010_1010_1010_1010])[0]
  // const status: Uint32 = 2863311530
  const expected: Status = {
    main: { ok: false, health: true },
    system: {
      ok: false, health: true,
      synchronized: { time: false, clock: true },
      cpu: false
    },
    sensor: {
      ok: true,
      health: false, limits: true,
      environmental: { vibration: false, temperature: true },
    },
    algorithms: {
      ok: false, health: true,
      initialization: { observer: false, heading: true },
      roll_pitch: { ok: false, health: true },
      heading: { ok: false, health: true },
      surge_sway: { ok: false, health: true },
      heave: { ok: false, health: true },
    },
    aiding: {
      received: {
        position: false, velocity: true,
        heading: false
      },
      valid: {
        position: true,
        velocity: false, heading: true,
        vertical: false, horizontal: true
      }
    }
  }
  const result = getStatus({ status })
  expect(result).not.toBeNull()
  expect(StatusSchema.safeParse(result).success).toBeTruthy()
  expect(result).toEqual(expected)
})

test('get Status from status_a & status_b', () => {
  const status_a: Uint16 = Uint32Array.from([0b0_1010_1010_1010_1010])[0]
  const status_b: Uint16 = Uint32Array.from([0b0_1010_1010_1010_1010])[0]
  // const status_a: Uint16 = 43690
  // const status_b: Uint16 = 43690
  const expected: Status = {
    main: { ok: false, health: true },
    system: {
      ok: false, health: true,
      synchronized: { time: false, clock: true },
      cpu: false
    },
    sensor: {
      ok: true,
      health: false, limits: true,
      environmental: { vibration: false, temperature: true },
    },
    algorithms: {
      ok: false, health: true,
      initialization: { observer: false, heading: true },
      roll_pitch: { ok: false, health: true },
      heading: { ok: false, health: true },
      surge_sway: { ok: false, health: true },
      heave: { ok: false, health: true },
    },
    aiding: {
      received: {
        position: false, velocity: true,
        heading: false
      },
      valid: {
        position: true,
        velocity: false, heading: true,
        vertical: false, horizontal: true
      }
    }
  }
  const result = getStatus({ status_a, status_b })
  expect(result).not.toBeNull()
  expect(result).toEqual(expected)
})

test('null Status', () => {
  const status_a: Uint16 = Uint32Array.from([0b0_1010_1010_1010_1010])[0]
  const status_b: Uint16 = Uint32Array.from([0b0_1010_1010_1010_1010])[0]
  expect(getStatus({})).toBeNull()
  expect(getStatus({ status: 'hola '})).toBeNull()
  expect(getStatus({ status_a })).toBeNull()
  expect(getStatus({ status_b })).toBeNull()
})