// coded
import {
  GPS_HDT_STATUSES,
  GPS_POS_STATUSES,
  GPS_TOW,
  GPS_VEL_STATUSES,
  TIME_STAMP,
  degreesField,
  metres,
} from './shared'

import type { Decoder, FieldDefinition, LogDefinition } from '../../types'
import { bitState, enumBits } from '../../utils'

/* The GNSS aiding logs (§2.3.6.3 to §2.3.6.6). Each exists TWICE — once per
   receiver — with an identical layout: VEL 13/16, POS 14/17, HDT 15/18, RAW 31/38.

   §2.3.6.3 note, which applies to all of them: "Both the GPS velocity status and
   type should be tested to make sure that the output velocity is valid." The status
   enum says whether a solution was computed, the type enum says what KIND — and a
   computed solution of type NO_SOLUTION is still nothing. */

const POS_TYPES: Readonly<Record<number, string>> = {
  0: 'SBG_ECOM_POS_NO_SOLUTION',
  1: 'SBG_ECOM_POS_UNKNOWN_TYPE',
  2: 'SBG_ECOM_POS_SINGLE',
  3: 'SBG_ECOM_POS_PSRDIFF',
  4: 'SBG_ECOM_POS_SBAS',
  5: 'SBG_ECOM_POS_OMNISTAR',
  6: 'SBG_ECOM_POS_RTK_FLOAT',
  7: 'SBG_ECOM_POS_RTK_INT',
  8: 'SBG_ECOM_POS_PPP_FLOAT',
  9: 'SBG_ECOM_POS_PPP_INT',
  10: 'SBG_ECOM_POS_FIXED',
}

const VEL_TYPES: Readonly<Record<number, string>> = {
  0: 'SBG_ECOM_VEL_NO_SOLUTION',
  1: 'SBG_ECOM_VEL_UNKNOWN_TYPE',
  2: 'SBG_ECOM_VEL_DOPPLER',
  3: 'SBG_ECOM_VEL_DIFFERENTIAL',
}

/* §2.3.6.4 GPS_POS_STATUS: two 6-bit enums, then one mask bit per signal used in
   the solution. Bits 29-31 are undefined and are left out rather than guessed. */
const positionStatus: Decoder = (value) => ({
  status: enumBits(GPS_POS_STATUSES, value, 0, 5).label,
  type: enumBits(POS_TYPES, value, 6, 11).label,
  signals: {
    gpsL1: bitState(value, 12),
    gpsL2: bitState(value, 13),
    gpsL5: bitState(value, 14),
    glonassL1: bitState(value, 15),
    glonassL2: bitState(value, 16),
    glonassL3: bitState(value, 17),
    galileoE1: bitState(value, 18),
    galileoE5a: bitState(value, 19),
    galileoE5b: bitState(value, 20),
    galileoE5AltBoc: bitState(value, 21),
    galileoE6: bitState(value, 22),
    beidouB1: bitState(value, 23),
    beidouB2: bitState(value, 24),
    beidouB3: bitState(value, 25),
    qzssL1: bitState(value, 26),
    qzssL2: bitState(value, 27),
    // §2.3.6.4 names this QZSS_L3 but describes it as "QZSS L5". The datasheet
    // contradicts itself in one row; both readings are recorded here.
    qzssL5: bitState(value, 28),
  },
})

const velocityStatus: Decoder = (value) => ({
  status: enumBits(GPS_VEL_STATUSES, value, 0, 5).label,
  type: enumBits(VEL_TYPES, value, 6, 11).label,
})

// §2.3.6.5 GPS_HDT_STATUS: a 6-bit enum then ONE mask bit. Note it is a uint16
// here, not the uint32 the other two use.
const headingStatus: Decoder = (value) => ({
  status: enumBits(GPS_HDT_STATUSES, value, 0, 5).label,
  baselineValid: bitState(value, 6),
})

/* SBG_ECOM_LOG_GPS1_VEL (13) / GPS2_VEL (16) — §2.3.6.3

  TIME_STAMP µs uint32 4 @0 · GPS_VEL_STATUS - uint32 4 @4 · GPS_TOW ms uint32 4 @8
  VEL_N/E/D m/s float 4 @12/16/20 · VEL_ACC_N/E/D m/s float 4 @24/28/32
  COURSE ° float 4 @36 · COURSE_ACC ° float 4 @40      Total size 44  <- MEASURED
*/
const velocity = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units: 'm/s', description })

const VEL_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  { name: 'GPS_VEL_STATUS', type: 'uint32', description: 'GNSS velocity fix status (bits 0-5) and type (bits 6-11). BOTH must be tested — a computed solution of type NO_SOLUTION is not a velocity.' },
  GPS_TOW,
  velocity('VEL_N', 'Velocity in the North direction'),
  velocity('VEL_E', 'Velocity in the East direction'),
  velocity('VEL_D', 'Velocity in the Down direction'),
  velocity('VEL_ACC_N', '1 sigma accuracy in the North direction'),
  velocity('VEL_ACC_E', '1 sigma accuracy in the East direction'),
  velocity('VEL_ACC_D', '1 sigma accuracy in the Down direction'),
  degreesField('COURSE', 'True direction of motion over ground, 0 to 360'),
  degreesField('COURSE_ACC', '1 sigma course accuracy'),
]

const velocityLog = (name: string, message: number, receiver: string): LogDefinition => ({
  name,
  message,
  description: `GNSS velocity and course from the ${receiver} receiver. The time stamp dates the GNSS measurement itself, not the main loop.`,
  fields: VEL_FIELDS,
  decoders: { GPS_VEL_STATUS: velocityStatus },
})

export const gps1Velocity = velocityLog('SBG_ECOM_LOG_GPS1_VEL', 13, 'primary')
export const gps2Velocity = velocityLog('SBG_ECOM_LOG_GPS2_VEL', 16, 'secondary')

/* SBG_ECOM_LOG_GPS1_POS (14) / GPS2_POS (17) — §2.3.6.4

  TIME_STAMP µs uint32 4 @0 · GPS_POS_STATUS - uint32 4 @4 · GPS_TOW ms uint32 4 @8
  LAT/LONG/ALT ° ° m double 8 @12/20/28 · UNDULATION m float 4 @36
  POS_ACC_LAT/LONG/ALT m float 4 @40/44/48 · NUM_SV_USED - uint8 1 @52
  BASE_STATION_ID - uint16 2 @53 · DIFF_AGE 0.01s uint16 2 @55   Total size 57

  ⚠️ TWO CORRECTIONS, and the frame length settles both.

  1. UNDULATION is a 4-byte FLOAT. The 0.0.x parser read `readDoubleLE(36)`, an
     8-byte read that overlapped POS_ACC_LAT at 40 — so undulation was garbage AND
     it happened to be invisible, because every later field was addressed by its own
     hardcoded offset and stayed correct. A single ordered table cannot do that.

  2. THE DATASHEET'S OWN OFFSET COLUMN IS WRONG for the last two fields: it prints
     54 for BASE_STATION_ID and 56 for DIFF_AGE, which would put the end of the log
     at 58 while the same table says "Total size 57". The fields are packed —
     53 and 55 — and that is not a guess: EVERY GPS1_POS frame in the committed
     corpus has LEN 57. Packing the table derives it correctly by construction.
*/
const POS_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  { name: 'GPS_POS_STATUS', type: 'uint32', description: 'GNSS position fix status (bits 0-5), type (bits 6-11) and which constellation signals contributed (bits 12-28). BOTH enums must be tested.' },
  GPS_TOW,
  { name: 'LAT', type: 'float64', units: 'deg', description: 'Latitude, positive North' },
  { name: 'LONG', type: 'float64', units: 'deg', description: 'Longitude, positive East' },
  { name: 'ALT', type: 'float64', units: 'm', description: 'Altitude above mean sea level' },
  metres('UNDULATION', 'Height of the geoid above the ellipsoid: WGS-84 altitude = MSL altitude + undulation'),
  metres('POS_ACC_LAT', '1 sigma latitude accuracy'),
  metres('POS_ACC_LONG', '1 sigma longitude accuracy'),
  metres('POS_ACC_ALT', '1 sigma altitude accuracy'),
  { name: 'NUM_SV_USED', type: 'uint8', description: 'Number of space vehicles used in the GNSS solution' },
  { name: 'BASE_STATION_ID', type: 'uint16', description: 'Identifier of the DGPS/RTK base station in use' },
  { name: 'DIFF_AGE', type: 'uint16', units: '0.01 s', description: 'Age of the differential corrections, in hundredths of a second' },
]

const positionLog = (name: string, message: number, receiver: string): LogDefinition => ({
  name,
  message,
  description: `GNSS position from the ${receiver} receiver, with a 1 sigma accuracy per axis, the geoid undulation and the differential correction age. The time stamp dates the GNSS measurement itself.`,
  fields: POS_FIELDS,
  decoders: {
    GPS_POS_STATUS: positionStatus,
    DIFF_AGE: (value) => ({ value: value / 100, units: 's' }),
  },
  payloadMetadata: (values) => {
    const altitude = values.ALT
    const undulation = values.UNDULATION
    if (typeof altitude !== 'number' || typeof undulation !== 'number') return {}
    return { ellipsoidAltitude: { value: altitude + undulation, units: 'm', description: 'Altitude above the WGS-84 ellipsoid: ALT (MSL) + UNDULATION' } }
  },
})

export const gps1Position = positionLog('SBG_ECOM_LOG_GPS1_POS', 14, 'primary')
export const gps2Position = positionLog('SBG_ECOM_LOG_GPS2_POS', 17, 'secondary')

/* SBG_ECOM_LOG_GPS1_HDT (15) / GPS2_HDT (18) — §2.3.6.5

  TIME_STAMP µs uint32 4 @0 · GPS_HDT_STATUS - uint16 2 @4 · GPS_TOW ms uint32 4 @6
  GPS_TRUE_HEADING ° float 4 @10 · GPS_TRUE_HEADING_ACC ° float 4 @14
  GPS_PITCH ° float 4 @18 · GPS_PITCH_ACC ° float 4 @22 · GPS_BASELINE m float 4 @26
                                                       Total size 30  <- MEASURED

  Note GPS_HDT_STATUS is a uint16 while VEL and POS use a uint32, so GPS_TOW starts
  at 6 rather than 8. A copy-paste of the VEL table would be off by two bytes for
  every field after it.
*/
const HDT_FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  { name: 'GPS_HDT_STATUS', type: 'uint16', description: 'GNSS true heading status (bits 0-5) plus, in bit 6, whether GPS_BASELINE is filled and valid' },
  GPS_TOW,
  degreesField('GPS_TRUE_HEADING', 'True heading angle, 0 to 360'),
  degreesField('GPS_TRUE_HEADING_ACC', '1 sigma true heading accuracy'),
  degreesField('GPS_PITCH', 'Pitch angle from the master antenna to the rover'),
  degreesField('GPS_PITCH_ACC', '1 sigma pitch accuracy'),
  metres('GPS_BASELINE', 'Distance between the main and auxiliary antennas. Valid only when GPS_HDT_STATUS reports baselineValid.'),
]

const headingLog = (name: string, message: number, receiver: string): LogDefinition => ({
  name,
  message,
  description: `GNSS true heading from the ${receiver} dual-antenna receiver, with the antenna baseline length. The time stamp dates the GNSS measurement itself.`,
  fields: HDT_FIELDS,
  decoders: { GPS_HDT_STATUS: headingStatus },
})

export const gps1Heading = headingLog('SBG_ECOM_LOG_GPS1_HDT', 15, 'primary')
export const gps2Heading = headingLog('SBG_ECOM_LOG_GPS2_HDT', 18, 'secondary')

/* SBG_ECOM_LOG_GPS1_RAW (31) / GPS2_RAW (38) — §2.3.6.6 "GNSS raw data"

  RAW_BUFFER - void [0-4096] @0     Total size [0-4096]

  There is no field table to have: the body is "directly untouched binary messages
  that are relevant for post processing from the GNSS receiver" — i.e. the GNSS
  chipset's OWN protocol, nested inside this one, and which protocol that is depends
  on the receiver fitted. Decoding it belongs to a post-processing tool that knows
  the chipset, so the bytes are published whole at metadata.body.

  Note it also carries NO TIME_STAMP, the only class-0 logs that do not. */
const rawLog = (name: string, message: number, receiver: string): LogDefinition => ({
  name,
  message,
  description: `Untouched binary GNSS data from the ${receiver} receiver, for post-processing. The body is the GNSS chipset's own protocol and has no published layout, so it is emitted as opaque bytes at metadata.body. Carries no time stamp.`,
  fields: [],
  opaque: true,
})

export const gps1Raw = rawLog('SBG_ECOM_LOG_GPS1_RAW', 31, 'primary')
export const gps2Raw = rawLog('SBG_ECOM_LOG_GPS2_RAW', 38, 'secondary')
