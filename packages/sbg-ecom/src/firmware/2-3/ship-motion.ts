// coded
import { TIME_STAMP, metres } from './shared'

import type { Decoder, FieldDefinition, LogDefinition } from '../../types'
import { bitState } from '../../utils'

/* SBG_ECOM_LOG_SHIP_MOTION (09) and SBG_ECOM_LOG_SHIP_MOTION_HP (32)
   — §2.3.5.4 "Heave, Surge, Sway". ONE layout, two message ids.

  Field         Unit    Format  Size  Offset
  TIME_STAMP    µs      uint32     4       0
  HEAVE_PERIOD  s       float      4       4  Main heave period
  SURGE         m       float      4       8  At main location, positive forward
  SWAY          m       float      4      12  At main location, positive right
  HEAVE         m       float      4      16  At main location, positive down
  ACCEL_X       m.s^-2  float      4      20  Longitudinal, positive forward
  ACCEL_Y       m.s^-2  float      4      24  Lateral, positive right
  ACCEL_Z       m.s^-2  float      4      28  Vertical, positive down
  VEL_X         m.s^-1  float      4      32  Longitudinal, positive forward
  VEL_Y         m.s^-1  float      4      36  Lateral, positive right
  VEL_Z         m.s^-1  float      4      40  Vertical, positive down
  HEAVE_STATUS  -       uint16     2      44
                              Total size 46    <- MEASURED: LEN 46 in the corpus

  Two things §2.3.5.4 is explicit about, and both matter to a consumer:

  - **ELLIPSE products only support heave**, so SURGE and SWAY read zero. A zero
    there means "not provided by this product", not "the vessel did not move" —
    which is why HEAVE_STATUS bit 2 exists and why it is decoded below.
  - **On the _HP variant the time stamp is the data's own time of validity**, not
    the current time, because delayed heave is computed retrospectively. So a HP
    frame legitimately arrives with an uptime EARLIER than frames before it.
*/

// §2.3.5.4 HEAVE_STATUS. Bit 0 is the one to check before trusting HEAVE at all.
const heaveStatus: Decoder = (value) => ({
  heaveValid: bitState(value, 0),
  velocityAided: bitState(value, 1),
  surgeSwayIncluded: bitState(value, 2),
  periodIncluded: bitState(value, 3),
  periodValid: bitState(value, 4),
  swellMode: bitState(value, 5),
})

const acceleration = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units: 'm/s2', description })

const velocity = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units: 'm/s', description })

const FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  { name: 'HEAVE_PERIOD', type: 'float32', units: 's', description: 'Main heave period. Valid only when HEAVE_STATUS reports periodIncluded and periodValid.' },
  metres('SURGE', 'Surge at the main location, positive forward. Zero on ELLIPSE products, which support heave only — check HEAVE_STATUS.surgeSwayIncluded.'),
  metres('SWAY', 'Sway at the main location, positive right. Zero on ELLIPSE products — check HEAVE_STATUS.surgeSwayIncluded.'),
  metres('HEAVE', 'Heave at the main location, positive DOWN. Check HEAVE_STATUS.heaveValid first.'),
  acceleration('ACCEL_X', 'Longitudinal acceleration, positive forward'),
  acceleration('ACCEL_Y', 'Lateral acceleration, positive right'),
  acceleration('ACCEL_Z', 'Vertical acceleration, positive down'),
  velocity('VEL_X', 'Longitudinal velocity, positive forward'),
  velocity('VEL_Y', 'Lateral velocity, positive right'),
  velocity('VEL_Z', 'Vertical velocity, positive down'),
  { name: 'HEAVE_STATUS', type: 'uint16', description: 'Which fields of this log are active and whether the data is valid: heave convergence, velocity aiding, whether surge/sway and the period are provided, and swell mode' },
]

const decoders = { HEAVE_STATUS: heaveStatus }

export const shipMotion: LogDefinition = {
  name: 'SBG_ECOM_LOG_SHIP_MOTION',
  message: 9,
  description: 'Real-time ship motion: heave, surge, sway, and the vessel-frame velocities and accelerations they derive from',
  fields: FIELDS,
  decoders,
}

export const shipMotionHP: LogDefinition = {
  name: 'SBG_ECOM_LOG_SHIP_MOTION_HP',
  message: 32,
  description: 'DELAYED heave, computed retrospectively — same layout as SBG_ECOM_LOG_SHIP_MOTION, but TIME_STAMP is the data\'s own time of validity rather than the current time, so a frame may carry an uptime earlier than one received before it',
  fields: FIELDS,
  decoders,
}
