import * as v from 'valibot'
import { ValibotValidator } from '@schemasjs/validator'
import {
  UnsignedIntegerSchema as ValibotUnsignedIntegerSchema,
  Uint16Schema as ValibotUint16Schema,
  Uint32Schema as ValibotUint32Schema
} from '@schemasjs/valibot-numbers'

const ValibotBooleanSchema = v.boolean()
export const BooleanSchema = ValibotValidator<v.InferInput<typeof ValibotBooleanSchema>>(ValibotBooleanSchema)

export const UnsignedIntegerSchema = ValibotValidator<v.InferInput<typeof ValibotUnsignedIntegerSchema>>(ValibotUnsignedIntegerSchema)

// STATUS
const ValibotStatusInputSchema = v.object({
  status: v.optional(ValibotUint32Schema),
  status_a: v.optional(ValibotUint16Schema),
  status_b: v.optional(ValibotUint16Schema)
})
export const StatusInputSchema = ValibotValidator<v.InferInput<typeof ValibotStatusInputSchema>>(ValibotStatusInputSchema)
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
const ValibotStatusSchema = v.object({
  main: v.object({
    ok: ValibotBooleanSchema,
    health: ValibotBooleanSchema
  }),
  system: v.object({
    ok: ValibotBooleanSchema,
    health: ValibotBooleanSchema,
    synchronized: v.object({
      time: ValibotBooleanSchema,
      clock: ValibotBooleanSchema
    }),
    cpu: ValibotBooleanSchema
  }),
  sensor: v.object({
    ok: ValibotBooleanSchema,
    health: ValibotBooleanSchema,
    limits: ValibotBooleanSchema,
    environmental: v.object({
      vibration: ValibotBooleanSchema,
      temperature: ValibotBooleanSchema
    })
  }),
  algorithms: v.object({
    ok: ValibotBooleanSchema,
    health: ValibotBooleanSchema,
    initialization: v.object({
      observer: ValibotBooleanSchema,
      heading: ValibotBooleanSchema
    }),
    roll_pitch: v.object({
      ok: ValibotBooleanSchema,
      health: ValibotBooleanSchema
    }),
    heading: v.object({
      ok: ValibotBooleanSchema,
      health: ValibotBooleanSchema
    }),
    surge_sway: v.object({
      ok: ValibotBooleanSchema,
      health: ValibotBooleanSchema
    }),
    heave: v.object({
      ok: ValibotBooleanSchema,
      health: ValibotBooleanSchema
    })
  }),
  aiding: v.object({
    received: v.object({
      position: ValibotBooleanSchema,
      velocity: ValibotBooleanSchema,
      heading: ValibotBooleanSchema
    }),
    valid: v.object({
      position: ValibotBooleanSchema,
      velocity: ValibotBooleanSchema,
      heading: ValibotBooleanSchema,
      vertical: ValibotBooleanSchema,
      horizontal: ValibotBooleanSchema
    })
  })
})
export const StatusSchema = ValibotValidator<v.InferInput<typeof ValibotStatusSchema>>(ValibotStatusSchema)
