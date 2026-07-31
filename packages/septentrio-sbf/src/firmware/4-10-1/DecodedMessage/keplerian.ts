// coded
import { DO_NOT_USE_FLOAT, DO_NOT_USE_UINT16 } from '../../../constants'
import type { Decoder, FieldDefinition } from '../../../types'
import { bits, bitState } from '../../../utils'
import { satelliteId } from '../satellites'

/* §4.2.3-4.2.8 — the shapes the decoded-message blocks share.

  These blocks carry the DECODED contents of the navigation broadcasts whose raw
  bits are §4.2.2's job: ephemerides, almanacs, ionosphere models and UTC offsets,
  one block per satellite per data set.

  The repetition across constellations is not superficial. GPS, QZSS, BeiDou and
  Galileo all broadcast a Keplerian orbit with the same named elements, in the same
  order, because they all follow the GPS ICD's parameterisation — so the orbital
  and clock rows below are transcribed ONCE and reused. What differs per
  constellation is the health/accuracy bookkeeping around them, and that is
  declared per block.

  Two conventions worth stating, because they are easy to get wrong:

  - **SEMI-CIRCLES, not radians.** Every angular element here is in semi-circles
    (1 semi-circle = pi radians = 180 degrees), which is how all four ICDs encode
    them. The field keeps the datasheet's own value and unit; the decoder puts the
    DEGREE value in metadata, so a human reads 40.4 deg without having to know the
    convention and a consumer reproducing the ICD maths still gets the raw number.
    Getting this wrong scales every angle by pi and still looks plausible.

  - **`SQRT_A` is the square root of the semi-major axis, in m^(1/2).** Squaring it
    is the only way to get metres, so the decoder publishes the axis alongside —
    a value near 26 560 km for GPS/Galileo, which is a useful sanity read.
*/
const SEMI_CIRCLE_DEGREES = 180

// A semi-circle angle -> degrees, the form a human reads. The field's own `value`
// stays in the datasheet's unit.
export const semiCircles: Decoder = (value) => ({ value: value * SEMI_CIRCLE_DEGREES, units: 'deg' })

// semi-circles/s -> deg/s, for the two rate elements.
export const semiCirclesPerSecond: Decoder = (value) => ({ value: value * SEMI_CIRCLE_DEGREES, units: 'deg/s' })

// sqrt(a) [m^(1/2)] -> a [m]. Published because the semi-major axis is the number
// anyone actually wants, and squaring is not obvious from the field name.
export const semiMajorAxis: Decoder = (value) => ({ value: value * value, units: 'm' })

const angle = (name: string, type: 'float32' | 'float64', description: string): FieldDefinition =>
  ({ name, type, units: 'semi-circles', description })

const rate = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units: 'semi-circles/s', description })

const metres = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units: 'm', description })

const radians = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units: 'rad', description })

// The harmonic correction terms and orbital elements shared by the GPS, QZSS,
// BeiDou and Galileo ephemeris blocks. Order differs slightly per constellation,
// so this exposes the ROWS and each block assembles them in ITS datasheet's order
// — sharing the order too would be exactly the kind of assumption that produced
// the 1.x field-rotation bug.
export const orbit = {
  C_rs: (): FieldDefinition => metres('C_rs', 'Amplitude of the sine harmonic correction term to the orbit radius'),
  C_rc: (): FieldDefinition => metres('C_rc', 'Amplitude of the cosine harmonic correction term to the orbit radius'),
  C_uc: (): FieldDefinition => radians('C_uc', 'Amplitude of the cosine harmonic correction term to the argument of latitude'),
  C_us: (): FieldDefinition => radians('C_us', 'Amplitude of the sine harmonic correction term to the argument of latitude'),
  C_ic: (): FieldDefinition => radians('C_ic', 'Amplitude of the cosine harmonic correction term to the angle of inclination'),
  C_is: (): FieldDefinition => radians('C_is', 'Amplitude of the sine harmonic correction term to the angle of inclination'),
  DEL_N: (): FieldDefinition => rate('DEL_N', 'Mean motion difference from the computed value'),
  M_0: (type: 'float32' | 'float64' = 'float64'): FieldDefinition => angle('M_0', type, 'Mean anomaly at reference time'),
  e: (type: 'float32' | 'float64' = 'float64'): FieldDefinition => ({ name: 'e', type, description: 'Eccentricity' }),
  SQRT_A: (type: 'float32' | 'float64' = 'float64'): FieldDefinition => ({ name: 'SQRT_A', type, units: 'm^(1/2)', description: 'Square root of the semi-major axis' }),
  OMEGA_0: (type: 'float32' | 'float64' = 'float64'): FieldDefinition => angle('OMEGA_0', type, 'Longitude of the ascending node of the orbit plane at the weekly epoch'),
  i_0: (type: 'float32' | 'float64' = 'float64'): FieldDefinition => angle('i_0', type, 'Inclination angle at reference time'),
  omega: (type: 'float32' | 'float64' = 'float64'): FieldDefinition => angle('omega', type, 'Argument of perigee'),
  OMEGADOT: (): FieldDefinition => rate('OMEGADOT', 'Rate of right ascension'),
  IDOT: (): FieldDefinition => rate('IDOT', 'Rate of the inclination angle'),
  t_oe: (): FieldDefinition => ({ name: 't_oe', type: 'uint32', units: 's', description: 'Reference time of ephemeris' }),
  t_oc: (): FieldDefinition => ({ name: 't_oc', type: 'uint32', units: 's', description: 'Clock data reference time' }),
  a_f0: (type: 'float32' | 'float64' = 'float32'): FieldDefinition => ({ name: 'a_f0', type, units: 's', description: 'Satellite clock bias' }),
  a_f1: (): FieldDefinition => ({ name: 'a_f1', type: 'float32', units: 's/s', description: 'Satellite clock drift' }),
  a_f2: (): FieldDefinition => ({ name: 'a_f2', type: 'float32', units: 's/s2', description: 'Satellite clock ageing' }),
}

// The decoders every Keplerian block shares. Keyed by the datasheet's own field
// names, so a block gets them simply by declaring those rows.
export const orbitDecoders: Readonly<Record<string, Decoder>> = {
  M_0: semiCircles,
  OMEGA_0: semiCircles,
  i_0: semiCircles,
  omega: semiCircles,
  delta_i: semiCircles,
  Delta_i: semiCircles,
  lambda: semiCircles,
  OMEGADOT: semiCirclesPerSecond,
  IDOT: semiCirclesPerSecond,
  DEL_N: semiCirclesPerSecond,
  SQRT_A: semiMajorAxis,
}

// PRN and SVID are the same §4.1.9 code under two datasheet spellings — the
// decoded-message blocks say PRN where the raw-page blocks say SVID.
export const satelliteDecoders: Readonly<Record<string, Decoder>> = {
  PRN: satelliteId,
  SVID: satelliteId,
  SVID_A: satelliteId,
}

// The eight Klobuchar coefficients, identical in GPSIon and BDSIon: a cubic in
// latitude for the vertical delay, and a cubic for the model period.
// The unit of the order-N coefficient: s, s/semi-circle, s/semi-circle2, ...
const KLOBUCHAR_UNITS = ['s', 's/semi-circle', 's/semi-circle2', 's/semi-circle3']

const klobucharTerm = (prefix: string, order: number, what: string): FieldDefinition =>
  ({ name: `${prefix}_${order}`, type: 'float32', units: KLOBUCHAR_UNITS[order], description: `${what} coefficient ${order}` })

export const klobuchar = (): readonly FieldDefinition[] => [
  ...[0, 1, 2, 3].map((order) => klobucharTerm('alpha', order, 'Vertical delay')),
  ...[0, 1, 2, 3].map((order) => klobucharTerm('beta', order, 'Model period')),
]

/* The leap-second rows, shared by GPSUtc, GALUtc, BDSUtc and GEONetworkTime.

  This is the one group in these categories with a consequence beyond bookkeeping:
  DEL_t_LS / DEL_t_LSF / WN_LSF / DN are how a receiver learns that a leap second
  is COMING, and which day it takes effect. Two distinct values on purpose — the
  offset before the effectivity time and the offset after it — so a decoder that
  reads only one of them is wrong on one side of the event.

  This package does not use them: leap seconds come from `ReceiverTime.DeltaLS`,
  the receiver's own current answer (see docs/STATUS.md §LOCKED decisions). These
  fields are the raw broadcast for anyone who wants the schedule rather than the
  present value.
*/
export const leapSeconds = (dayRange: string): readonly FieldDefinition[] => [
  { name: 'DEL_t_LS', type: 'int8', units: 's', description: 'Delta time due to leap seconds while the effectivity time is not in the past' },
  { name: 'WN_LSF', type: 'uint8', units: 'weeks', description: 'Effectivity time of the leap second (week)' },
  { name: 'DN', type: 'uint8', units: 'days', description: `Effectivity time of the leap second (day, ${dayRange})` },
  { name: 'DEL_t_LSF', type: 'int8', units: 's', description: 'Delta time due to leap seconds once the effectivity time is in the past' },
]

// A UTC polynomial: UTC = system time - (A_0 + A_1 * dt).
export const utcPolynomial = (doNotUse: boolean): readonly FieldDefinition[] => [
  { name: 'A_1', type: 'float32', units: 's/s', ...(doNotUse ? { doNotUse: DO_NOT_USE_FLOAT } : {}), description: 'First-order term of the UTC offset polynomial' },
  { name: 'A_0', type: 'float64', units: 's', ...(doNotUse ? { doNotUse: DO_NOT_USE_FLOAT } : {}), description: 'Constant term of the UTC offset polynomial' },
]

export const reserved = (name: string, bytes = 1): FieldDefinition =>
  (bytes === 1)
    ? { name, type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' }
    : { name, type: 'string', length: bytes, reserved: true, description: 'Reserved for future use, to be ignored by decoding software' }

export const weekNumber = (name: string, description: string, doNotUse = false): FieldDefinition =>
  ({ name, type: 'uint16', units: 'weeks', ...(doNotUse ? { doNotUse: DO_NOT_USE_UINT16 } : {}), description })

/* GPS/QZSS 6-bit health, §20.3.3.3.1.4 of the GPS ICD.

  Bit 5 (the MSB of the six) is the summary: 0 means all navigation data are OK,
  1 means some or all are bad. The low five bits then say WHICH signals are
  unhealthy. Publishing the summary as a boolean is the useful part — the code
  space is large and mostly reserved, so the individual codes are left as the
  number rather than invented into labels.
*/
export const navigationHealth: Decoder = (value) => ({
  navigationDataValid: !bitState(value, 5),
  signalHealth: bits(value, 0, 4),
})

/* Galileo Health Status / Data Validity Status, GALNav + GALAlm.

  A three-signal bit field with a VALIDITY BIT in front of each group: bit 0 says
  whether the L1-B fields are meaningful at all, bit 4 the same for E5b, bit 8 for
  E5a. The datasheet is explicit — "If set, bits 1 to 3 are valid, otherwise they
  must be ignored" — so reading the status without checking its guard bit reports
  a health for a signal the satellite said nothing about. That is why each entry
  here is `null` rather than a status when its guard is clear.
*/
export const HEALTH_STATUS: Readonly<Record<number, string>> = {
  0: 'OK',
  1: 'OUT_OF_SERVICE',
  2: 'WILL_BE_OUT_OF_SERVICE',
  3: 'IN_TEST',
}

interface SignalHealth {
  dataValid: boolean
  status: string
}

const galileoSignal = (value: number, guard: number, dvs: number | undefined, hsFrom: number): SignalHealth | null => {
  if (!bitState(value, guard)) return null
  return {
    dataValid: (dvs === undefined) ? true : !bitState(value, dvs),
    status: HEALTH_STATUS[bits(value, hsFrom, hsFrom + 1)] ?? 'UNKNOWN',
  }
}

// GALNav's Health_OSSOL: each group is guard + 1-bit DVS + 2-bit HS.
export const galileoHealthOSSOL: Decoder = (value) => ({
  l1b: galileoSignal(value, 0, 1, 2),
  e5b: galileoSignal(value, 4, 5, 6),
  e5a: galileoSignal(value, 8, 9, 10),
})

// GALAlm's health: each group is guard + 2-bit HS, with no DVS bit.
export const galileoHealthAlmanac: Decoder = (value) => ({
  l1b: galileoSignal(value, 0, undefined, 1),
  e5b: galileoSignal(value, 3, undefined, 4),
  e5a: galileoSignal(value, 6, undefined, 7),
})

/* The Galileo `Source` field, in GALNav / GALAlm / GALIon / GALUtc / GALGstGps /
  GALSARRLM: which navigation stream the data was decoded from, because it decides
  WHICH CLOCK MODEL the clock corrections belong to.

    2  I/NAV  -> the (L1, E5b) clock model
    16 F/NAV  -> the (L1, E5a) clock model
    18        -> GALAlm only: almanac merged from I/NAV and F/NAV pages

  A receiver decoding both streams outputs TWO GALNav blocks for the same
  satellite with DIFFERENT clock parameters, so a consumer that ignores `Source`
  will treat one as an update of the other and silently mix two clock models.
*/
export const GALILEO_SOURCE: Readonly<Record<number, string>> = {
  2: 'INAV',
  16: 'FNAV',
  18: 'INAV_FNAV_MERGED',
}

export const GALILEO_CLOCK_MODEL: Readonly<Record<number, string | undefined>> = {
  2: 'L1_E5b',
  16: 'L1_E5a',
}

export const galileoSource: Decoder = (value) => {
  const label = GALILEO_SOURCE[value] ?? 'UNKNOWN'
  const clockModel = GALILEO_CLOCK_MODEL[value]
  return (clockModel === undefined) ? { label } : { label, clockModel }
}
