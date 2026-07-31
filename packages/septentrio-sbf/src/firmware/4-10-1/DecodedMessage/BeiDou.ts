// coded
import { klobuchar, leapSeconds, orbit, orbitDecoders, reserved, satelliteDecoders, utcPolynomial, weekNumber } from './keplerian'

import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, FieldDefinition } from '../../../types'
import { bits, bitState } from '../../../utils'

/* §4.2.6 BeiDou Decoded Message Blocks.

  BDSNav -> Number: 4081 => "OnChange" interval: block generated each time a new
  navigation data set is received from a BeiDou satellite

  The BDSNav block contains the decoded navigation data for one BeiDou satellite,
  as received from the D1 or D2 nav message.

  BDSNav ---------------------------------------------------------------------
  Block fields    Type  Units              Do-Not-Use  Description
  PRN            uint8                                 ID of the BeiDou satellite (see 4.1.9)
  Reserved       uint8                                 Reserved for future use
  WN            uint16  1 week                         BeiDou week number as received from the navigation message (0 to 8191)
  URA            uint8                                 User range accuracy index (4-bit value)
  SatH1          uint8                                 1-bit autonomous health
  IODC           uint8                                 Age of data, clock (5 bits)
  IODE           uint8                                 Age of data, ephemeris (5 bits)
  Reserved2     uint16                                 unused, to be ignored by decoding software
  T_GD1        float32  1 s                            B1I equipment group delay differential
  T_GD2        float32  1 s                 -2 x 10^10 B2I equipment group delay differential (Do-Not-Use when unknown)
  t_oc          uint32  1 s                            clock data reference time, in BeiDou system time (lagging GPS time by 14 s)
  a_f2         float32  1 s / s2                       SV clock aging
  a_f1         float32  1 s / s                        SV clock drift
  a_f0         float32  1 s                            SV clock bias
  C_rs         float32  1 m                            Amplitude of the sine harmonic correction term to the orbit radius
  DEL_N        float32  1 semi-circle / s              Mean motion difference from computed value
  M_0          float64  1 semi-circle                  Mean anomaly at reference time
  C_uc         float32  1 rad                          Amplitude of the cosine harmonic correction term to the argument of latitude
  e            float64                                 Eccentricity
  C_us         float32  1 rad                          Amplitude of the sine harmonic correction term to the argument of latitude
  SQRT_A       float64  1 m1/2                         Square root of the semi-major axis
  t_oe          uint32  1 s                            Reference time ephemeris, in BeiDou system time (lagging GPS time by 14 s)
  C_ic         float32  1 rad                          Amplitude of the cosine harmonic correction term to the angle of inclination
  OMEGA_0      float64  1 semi-circle                  Longitude of ascending node of orbit plane at weekly epoch
  C_is         float32  1 rad                          Amplitude of the sine harmonic correction term to the angle of inclination
  i_0          float64  1 semi-circle                  Inclination angle at reference time
  C_rc         float32  1 m                            Amplitude of the cosine harmonic correction term to the orbit radius
  omega        float64  1 semi-circle                  Argument of perigee
  OMEGADOT     float32  1 semi-circle / s              Rate of right ascension
  IDOT         float32  1 semi-circle / s              Rate of inclination angle
  WNt_oc        uint16  1 week                         BeiDou week number associated with t_oc, modulo 8192
  WNt_oe        uint16  1 week                         BeiDou week number associated with t_oe, modulo 8192
  Padding         uint                                 Padding bytes, see 4.1.5

  126 body bytes -> a 140-byte block, which is what cru's receiver emits.

  THE TIMES IN THIS BLOCK ARE BEIDOU SYSTEM TIME, WHICH LAGS GPS TIME BY 14
  SECONDS. The datasheet says so on `t_oc` and `t_oe` explicitly, and the week
  numbers are BeiDou weeks modulo 8192 rather than GPS weeks modulo 1024. Mixing
  them with a GPS-frame time gives an error of exactly 14 s — small enough to look
  like a clock problem rather than a units problem. Flagged in field metadata.

  The Keplerian body is GPS's, in GPS's order, because BeiDou follows the same
  parameterisation; the bookkeeping around it (URA/SatH1/IODC/IODE and the two
  group delays) is BeiDou's own.
*/
// BDT lags GPS time by 14 s, so GPS time = BDT + 14.
const BDT_GPS_LAG_SECONDS = 14

const bdsNavFields: readonly FieldDefinition[] = [
  { name: 'PRN', type: 'uint8', description: 'ID of the BeiDou satellite whose ephemeris this is (§4.1.9)' },
  reserved('Reserved'),
  weekNumber('WN', 'BeiDou week number as received from the navigation message, 0 to 8191'),
  { name: 'URA', type: 'uint8', description: 'User range accuracy index, a 4-bit value' },
  { name: 'SatH1', type: 'uint8', description: '1-bit autonomous satellite health' },
  { name: 'IODC', type: 'uint8', description: 'Age of data, clock — 5 bits' },
  { name: 'IODE', type: 'uint8', description: 'Age of data, ephemeris — 5 bits' },
  reserved('Reserved2', 2),
  { name: 'T_GD1', type: 'float32', units: 's', description: 'B1I equipment group delay differential' },
  { name: 'T_GD2', type: 'float32', units: 's', doNotUse: DO_NOT_USE_FLOAT, description: 'B2I equipment group delay differential; Do-Not-Use when unknown' },
  orbit.t_oc(),
  orbit.a_f2(),
  orbit.a_f1(),
  orbit.a_f0(),
  orbit.C_rs(),
  orbit.DEL_N(),
  orbit.M_0(),
  orbit.C_uc(),
  orbit.e(),
  orbit.C_us(),
  orbit.SQRT_A(),
  orbit.t_oe(),
  orbit.C_ic(),
  orbit.OMEGA_0(),
  orbit.C_is(),
  orbit.i_0(),
  orbit.C_rc(),
  orbit.omega(),
  orbit.OMEGADOT(),
  orbit.IDOT(),
  weekNumber('WNt_oc', 'BeiDou week number associated with t_oc, modulo 8192 — BeiDou system time, not GPS'),
  weekNumber('WNt_oe', 'BeiDou week number associated with t_oe, modulo 8192 — BeiDou system time, not GPS'),
]

// BeiDou system time lags GPS time by 14 s. Saying so on the two reference times
// is cheaper than a consumer discovering it as a 14-second bias.
const beidouTime = (value: number): Record<string, unknown> => ({
  timeScale: 'BDT',
  gpsTimeOfWeek: { value: value + BDT_GPS_LAG_SECONDS, units: 's' },
})

export const bdsNav: BlockDefinition = {
  name: 'BDSNav',
  number: 4081,
  description: 'Decoded ephemeris and clock parameters for one BeiDou satellite, from the D1 or D2 navigation message; its reference times are in BeiDou system time',
  timestamp: 'sis',
  revisions: [bdsNavFields],
  decoders: {
    ...satelliteDecoders,
    ...orbitDecoders,
    SatH1: (value) => ({ unhealthy: value === 1 }),
    URA: (value) => ({ index: bits(value, 0, 3) }),
    t_oc: beidouTime,
    t_oe: beidouTime,
  },
}

/* BDSAlm -> Number: 4119 => "OnChange" interval: block generated each time a new
  almanac data set is received from a BeiDou satellite

  The BDSAlm block contains the decoded almanac data for one BeiDou satellite.

  BDSAlm ---------------------------------------------------------------------
  PRN u1, WN_a u1 (1 week), t_oa u4 (1 s), SQRT_A f4 (1 m1/2), e f4,
  omega f4 (1 semi-circle), M_0 f4 (1 semi-circle), OMEGA_0 f4 (1 semi-circle),
  OMEGADOT f4 (1 semi-circle/s), delta_i f4 (1 semi-circle), a_f0 f4 (1 s),
  a_f1 f4 (1 s/s), Health u2 (9 bits), Reserved u1[2]

  NOTE THERE IS NO `Reserved` BYTE AFTER `PRN` here — BDSAlm goes straight from PRN
  to WN_a, where GPSAlm, QZSAlm and BDSNav all have a reserved byte in that slot.
  Its element ORDER is different too (SQRT_A before e, omega before M_0). Both are
  reasons this block gets its own table rather than reusing the GPS almanac's.
*/
export const bdsAlm: BlockDefinition = {
  name: 'BDSAlm',
  number: 4119,
  description: 'Decoded almanac — a coarse orbit — for one BeiDou satellite',
  timestamp: 'sis',
  revisions: [[
    { name: 'PRN', type: 'uint8', description: 'ID of the BeiDou satellite whose almanac this is (§4.1.9)' },
    { name: 'WN_a', type: 'uint8', units: 'weeks', description: 'Almanac week number' },
    { name: 't_oa', type: 'uint32', units: 's', description: 'Almanac reference time' },
    orbit.SQRT_A('float32'),
    orbit.e('float32'),
    orbit.omega('float32'),
    orbit.M_0('float32'),
    orbit.OMEGA_0('float32'),
    orbit.OMEGADOT(),
    { name: 'delta_i', type: 'float32', units: 'semi-circles', description: 'Correction to the orbit reference inclination at reference time' },
    orbit.a_f0(),
    orbit.a_f1(),
    { name: 'Health', type: 'uint16', description: 'Satellite health information, 9 bits' },
    reserved('Reserved', 2),
  ]],
  decoders: {
    ...satelliteDecoders,
    ...orbitDecoders,
    // 9 bits of health; bit 0 set means the satellite is unusable, per the BeiDou
    // ICD. The remaining bits are per-signal detail the datasheet does not break
    // out here, so they are reported as the number rather than named.
    Health: (value) => ({ unhealthy: bitState(value, 0), bits: bits(value, 0, 8) }),
  },
}

/* BDSIon -> Number: 4120 => "OnChange" interval: output each time the ionospheric
  parameters are received from a BeiDou satellite

  The BDSIon block contains the BeiDou ionosphere data (the Klobuchar
  coefficients), as received from the D1 or D2 nav message.

  BDSIon: PRN u1, Reserved u1, alpha_0..3 f4, beta_0..3 f4 — 34 body bytes, so a
  48-byte block, which is what cru's receiver emits.

  Same eight Klobuchar coefficients as GPSIon, so the rows are shared. BeiDou
  genuinely broadcasts the GPS ionosphere model here — unlike Galileo, which uses
  NeQuick and shares nothing.
*/
export const bdsIon: BlockDefinition = {
  name: 'BDSIon',
  number: 4120,
  description: 'Decoded BeiDou ionosphere model — the eight Klobuchar coefficients — from the D1 or D2 navigation message',
  timestamp: 'sis',
  revisions: [[
    { name: 'PRN', type: 'uint8', description: 'ID of the BeiDou satellite the coefficients came from (§4.1.9)' },
    reserved('Reserved'),
    ...klobuchar(),
  ]],
  decoders: satelliteDecoders,
}

/* BDSUtc -> Number: 4121 => "OnChange" interval: output each time the UTC offset
  parameters are received from a BeiDou satellite

  The BDSUtc block contains the BeiDou UTC data, as received from the D1 or D2 nav
  message.

  Note that BDT (BeiDou time) started on January 1st, 2006 (GPS week 1356).
  Therefore the delta time between BDT and UTC due to leap seconds is 14 LESS than
  the value in GPSUtc.

  BDSUtc: PRN u1, Reserved u1, A_1 f4 (1 s/s), A_0 f8 (1 s), DEL_t_LS i1,
  WN_LSF u1, DN u1 (0 to 6), DEL_t_LSF i1

  TWO differences from GPSUtc that matter, both stated by the datasheet:
    - the leap-second delta is 14 LESS, because BDT started in 2006 rather than 1980
    - `DN` runs 0..6 here where GPSUtc's runs 1..7
  And there is no t_ot / WN_t pair: BDSUtc omits the UTC reference time entirely.
*/
export const bdsUtc: BlockDefinition = {
  name: 'BDSUtc',
  number: 4121,
  description: 'Decoded BeiDou BDT-UTC offset parameters and the scheduled leap second; its leap-second delta is 14 s less than GPS reports',
  timestamp: 'sis',
  revisions: [[
    { name: 'PRN', type: 'uint8', description: 'ID of the BeiDou satellite the parameters came from (§4.1.9)' },
    reserved('Reserved'),
    ...utcPolynomial(false),
    ...leapSeconds('0 to 6'),
  ]],
  decoders: {
    ...satelliteDecoders,
    // The GPS-equivalent value, since every other time scale in this repo is
    // referenced to GPS and the 14 s offset is the whole trap of this block.
    DEL_t_LS: (value) => ({ gpsEquivalent: { value: value + BDT_GPS_LAG_SECONDS, units: 's' }, timeScale: 'BDT' }),
    DEL_t_LSF: (value) => ({ gpsEquivalent: { value: value + BDT_GPS_LAG_SECONDS, units: 's' }, timeScale: 'BDT' }),
  },
}
