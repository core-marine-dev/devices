// coded
import { orbitDecoders, satelliteDecoders } from './keplerian'

import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, bitState, scaled } from '../../../utils'
import { glonassFrequencyNumber } from '../satellites'

/* §4.2.4 GLONASS Decoded Message Blocks.

  GLONav -> Number: 4004 => "OnChange" interval: block generated each time a new
  navigation data set is received from a GLONASS satellite

  The GLONav block contains the decoded ephemeris data for one GLONASS satellite.

  GLONav ---------------------------------------------------------------------
  Block fields    Type  Units             Description
  SVID           uint8                    ID of the GLONASS satellite (see 4.1.9)
  FreqNr         uint8                    Frequency number of the GLONASS satellite (see 4.1.9)
  X            float64  1000 m            x-component of satellite position in PZ-90.02
  Y            float64  1000 m            y-component of satellite position in PZ-90.02
  Z            float64  1000 m            z-component of satellite position in PZ-90.02
  Dx           float32  1000 m / s        x-component of satellite velocity in PZ-90.02
  Dy           float32  1000 m / s        y-component of satellite velocity in PZ-90.02
  Dz           float32  1000 m / s        z-component of satellite velocity in PZ-90.02
  Ddx          float32  1000 m / s2       x-component of satellite acceleration in PZ-90.02
  Ddy          float32  1000 m / s2       y-component of satellite acceleration in PZ-90.02
  Ddz          float32  1000 m / s2       z-component of satellite acceleration in PZ-90.02
  gamma        float32  1 Hz / Hz         relative deviation of predicted carrier frequency
  tau          float32  1 s               time correction to GLONASS time
  dtau         float32  1 s               time difference between L2 and L1 sub-band
  t_oe          uint32  1 s               reference time-of-week in GPS time frame
  WN_toe        uint16  1 week            reference week number in GPS time frame (modulo 1024)
  P1             uint8  1 minute          time interval between adjacent values of tb
  P2             uint8                    1-bit odd/even flag of tb
  E              uint8  1 day             age of data
  B              uint8                    3-bit health flag, satellite unhealthy if MSB set
  tb            uint16  1 minute          time of day (center of validity interval)
  M              uint8                    2-bit GLONASS-M satellite identifier (01, otherwise 00)
  P              uint8                    2-bit mode of computation of time parameters
  l              uint8                    1-bit health flag, 0=healthy, 1=unhealthy
  P4             uint8                    1-bit 'updated' flag of ephemeris data
  N_T           uint16  1 day             current day number within 4-year interval
  F_T           uint16  0.01 m            predicted user range accuracy at time tb
  Padding         uint                    Padding bytes, see 4.1.5

  GLONASS IS NOT KEPLERIAN. Alone among the five constellations it broadcasts a
  STATE VECTOR — position, velocity and acceleration in the PZ-90.02 earth-fixed
  frame — instead of orbital elements, so none of the shared Keplerian rows apply
  and the ephemeris is integrated forward numerically rather than evaluated.

  The units are the trap here: X/Y/Z are in units of 1000 m (kilometres) and the
  velocities in km/s, so a consumer that reads them as metres is out by a factor of
  a thousand — and 1000x a GLONASS orbit radius is still a finite plausible-looking
  number. The decoders publish metres and m/s alongside.

  TWO independent health flags, and they disagree in scope: `B` is a 3-bit flag
  whose MSB means unhealthy, and `l` is a 1-bit flag where 1 means unhealthy. Both
  are reported; neither is promoted to speak for the satellite.
*/
const KILO = 1000
const CENTIMETRE = 100

const stateVector = (name: string, type: 'float32' | 'float64', units: string, description: string): FieldDefinition =>
  ({ name, type, units, description })

const GLO_NAV_FIELDS: readonly FieldDefinition[] = [
  { name: 'SVID', type: 'uint8', description: 'ID of the GLONASS satellite whose ephemeris this is (§4.1.9)' },
  { name: 'FreqNr', type: 'uint8', description: 'Frequency number of the GLONASS satellite, with an offset of 8 (§4.1.9)' },
  stateVector('X', 'float64', '1000 m', 'x-component of the satellite position in PZ-90.02'),
  stateVector('Y', 'float64', '1000 m', 'y-component of the satellite position in PZ-90.02'),
  stateVector('Z', 'float64', '1000 m', 'z-component of the satellite position in PZ-90.02'),
  stateVector('Dx', 'float32', '1000 m/s', 'x-component of the satellite velocity in PZ-90.02'),
  stateVector('Dy', 'float32', '1000 m/s', 'y-component of the satellite velocity in PZ-90.02'),
  stateVector('Dz', 'float32', '1000 m/s', 'z-component of the satellite velocity in PZ-90.02'),
  stateVector('Ddx', 'float32', '1000 m/s2', 'x-component of the satellite acceleration in PZ-90.02'),
  stateVector('Ddy', 'float32', '1000 m/s2', 'y-component of the satellite acceleration in PZ-90.02'),
  stateVector('Ddz', 'float32', '1000 m/s2', 'z-component of the satellite acceleration in PZ-90.02'),
  { name: 'gamma', type: 'float32', units: 'Hz/Hz', description: 'Relative deviation of the predicted carrier frequency from its nominal value' },
  { name: 'tau', type: 'float32', units: 's', description: 'Time correction to GLONASS time' },
  { name: 'dtau', type: 'float32', units: 's', description: 'Time difference between the L2 and L1 sub-bands' },
  { name: 't_oe', type: 'uint32', units: 's', description: 'Reference time of week, in the GPS time frame' },
  { name: 'WN_toe', type: 'uint16', units: 'weeks', description: 'Reference week number in the GPS time frame, modulo 1024' },
  { name: 'P1', type: 'uint8', units: 'min', description: 'Time interval between adjacent values of tb' },
  { name: 'P2', type: 'uint8', description: '1-bit odd/even flag of tb' },
  { name: 'E', type: 'uint8', units: 'days', description: 'Age of data' },
  { name: 'B', type: 'uint8', description: '3-bit health flag; the satellite is unhealthy if the MSB is set' },
  { name: 'tb', type: 'uint16', units: 'min', description: 'Time of day at the centre of the validity interval' },
  { name: 'M', type: 'uint8', description: '2-bit GLONASS-M satellite identifier: 01 for GLONASS-M, otherwise 00' },
  { name: 'P', type: 'uint8', description: '2-bit mode of computation of the time parameters' },
  { name: 'l', type: 'uint8', description: '1-bit health flag: 0 healthy, 1 unhealthy' },
  { name: 'P4', type: 'uint8', description: '1-bit \'updated\' flag of the ephemeris data' },
  { name: 'N_T', type: 'uint16', units: 'days', description: 'Current day number within the 4-year interval' },
  { name: 'F_T', type: 'uint16', units: '0.01 m', description: 'Predicted user range accuracy at time tb' },
]

// The state vector in SI units. Publishing them is the point: the wire units are
// kilometres and a factor-of-1000 error here is invisible in the number itself.
const kilometres: Decoder = (value) => ({ value: value * KILO, units: 'm' })
const kilometresPerSecond: Decoder = (value) => ({ value: value * KILO, units: 'm/s' })
const kilometresPerSecondSquared: Decoder = (value) => ({ value: value * KILO, units: 'm/s2' })

const gloNavDecoders: Readonly<Record<string, Decoder>> = {
  ...satelliteDecoders,
  FreqNr: (value) => ({ value: glonassFrequencyNumber(value) }),
  X: kilometres,
  Y: kilometres,
  Z: kilometres,
  Dx: kilometresPerSecond,
  Dy: kilometresPerSecond,
  Dz: kilometresPerSecond,
  Ddx: kilometresPerSecondSquared,
  Ddy: kilometresPerSecondSquared,
  Ddz: kilometresPerSecondSquared,
  // MSB of the 3 bits set => unhealthy, per the datasheet's own wording.
  B: (value) => ({ unhealthy: bitState(value, 2), flags: bits(value, 0, 2) }),
  l: (value) => ({ unhealthy: value === 1 }),
  M: (value) => ({ glonassM: value === 1 }),
  P4: (value) => ({ ephemerisUpdated: value === 1 }),
  F_T: (value) => scaled(value, CENTIMETRE, 'm'),
}

export const gloNav: BlockDefinition = {
  name: 'GLONav',
  number: 4004,
  description: 'Decoded ephemeris for one GLONASS satellite — a PZ-90.02 state vector, not orbital elements',
  timestamp: 'sis',
  revisions: [GLO_NAV_FIELDS],
  decoders: gloNavDecoders,
  // Both health flags in one place, because the block has two and they are not
  // the same claim: B is the 3-bit broadcast flag and l the 1-bit one.
  payloadMetadata: ({ B, l }) => {
    if (typeof B !== 'number' || typeof l !== 'number') return {}
    return { health: { unhealthy: bitState(B, 2) || l === 1, broadcastFlag: B, lineFlag: l } }
  },
}

/* GLOAlm -> Number: 4005 => "OnChange" interval: block generated each time a new
  almanac data set is received from a GLONASS satellite

  The GLOAlm block contains the decoded almanac data for one GLONASS satellite.

  GLOAlm ---------------------------------------------------------------------
  Block fields    Type  Units                  Description
  SVID           uint8                         ID of the GLONASS satellite (see 4.1.9)
  FreqNr         uint8                         Frequency number; corresponds to H^A_n in the GLONASS ICD
  epsilon      float32                         epsilon^A_n: orbit eccentricity
  t_oa          uint32  1 s                    Reference time-of-week in GPS time frame
  Delta_i      float32  1 semi-circle          delta i^A_n: correction to inclination
  lambda       float32  1 semi-circle          lambda^A_n: longitude of first ascending node
  t_ln         float32  1 s                    t^A_lambda n: time of first ascending node passage
  omega        float32  1 semi-circle          omega^A_n: argument of perigee
  Delta_T      float32  1 s / orbit-period     delta T^A_n: correction to mean Draconian period
  dDelta_T     float32  1 s / orbit-period2    d delta T^A_n: rate of change of that correction
  tau          float32  1 s                    tau^A_n: coarse correction to satellite time
  WN_a           uint8  1 week                 Reference week in GPS time frame (modulo 256)
  C              uint8                         C^A_n: 1-bit general health flag (1 indicates healthy)
  N             uint16  1 day                  N^A: calendar day number within 4 year period
  M              uint8                         M^A_n: 2-bit GLONASS-M satellite identifier
  N_4            uint8                         N4: 4 year interval number, starting from 1996
  Padding         uint                         Padding bytes, see 4.1.5

  Note the almanac IS parameterised (eccentricity, inclination correction, argument
  of perigee) even though the ephemeris is a state vector — GLONASS uses the
  compact form only for the coarse orbit. And note `C` inverts the usual
  convention: 1 means HEALTHY here, where GLONav's `l` uses 1 for unhealthy.
*/
const GLO_ALM_FIELDS: readonly FieldDefinition[] = [
  { name: 'SVID', type: 'uint8', description: 'ID of the GLONASS satellite whose almanac this is (§4.1.9)' },
  { name: 'FreqNr', type: 'uint8', description: 'Frequency number with an offset of 8, the H^A_n parameter of the GLONASS ICD (§4.1.9)' },
  { name: 'epsilon', type: 'float32', description: 'Orbit eccentricity' },
  { name: 't_oa', type: 'uint32', units: 's', description: 'Almanac reference time of week, in the GPS time frame' },
  { name: 'Delta_i', type: 'float32', units: 'semi-circles', description: 'Correction to the inclination' },
  { name: 'lambda', type: 'float32', units: 'semi-circles', description: 'Longitude of the first ascending node' },
  { name: 't_ln', type: 'float32', units: 's', description: 'Time of the first ascending node passage' },
  { name: 'omega', type: 'float32', units: 'semi-circles', description: 'Argument of perigee' },
  { name: 'Delta_T', type: 'float32', units: 's/orbit', description: 'Correction to the mean Draconian period' },
  { name: 'dDelta_T', type: 'float32', units: 's/orbit2', description: 'Rate of change of the correction to the mean Draconian period' },
  { name: 'tau', type: 'float32', units: 's', description: 'Coarse correction to the satellite time' },
  { name: 'WN_a', type: 'uint8', units: 'weeks', description: 'Reference week in the GPS time frame, modulo 256' },
  { name: 'C', type: 'uint8', description: '1-bit general health flag; 1 indicates HEALTHY' },
  { name: 'N', type: 'uint16', units: 'days', description: 'Calendar day number within the 4-year period' },
  { name: 'M', type: 'uint8', description: '2-bit GLONASS-M satellite identifier' },
  { name: 'N_4', type: 'uint8', description: '4-year interval number, counting from 1996' },
]

export const gloAlm: BlockDefinition = {
  name: 'GLOAlm',
  number: 4005,
  description: 'Decoded almanac — a coarse parameterised orbit — for one GLONASS satellite',
  timestamp: 'sis',
  revisions: [GLO_ALM_FIELDS],
  decoders: {
    ...satelliteDecoders,
    ...orbitDecoders,
    FreqNr: (value) => ({ value: glonassFrequencyNumber(value) }),
    // 1 means healthy here — the opposite of GLONav's `l`. Reported as `healthy`
    // rather than `unhealthy` so the polarity is impossible to misread.
    C: (value) => ({ healthy: value === 1 }),
    M: (value) => ({ glonassM: value === 1 }),
  },
}

/* GLOTime -> Number: 4036 => "OnChange" interval: block generated at the end of
  each GLONASS superframe, i.e. every 2.5 minutes.

  The GLOTime block contains the decoded non-immediate data related to the
  difference between GLONASS and GPS, UTC and UT1 time scales.

  GLOTime --------------------------------------------------------------------
  Block fields    Type  Units          Description
  SVID           uint8                 ID of the GLONASS satellite the data was decoded from (see 4.1.9)
  FreqNr         uint8                 Frequency number of that satellite (see 4.1.9)
  N_4            uint8                 4 year interval number, starting from 1996
  KP             uint8                 notification of leap second
  N             uint16  1 day          calendar day number within 4 year period
  tau_GPS      float32  1 x 10^9 ns    difference with respect to GPS time
  tau_c        float64  1 x 10^9 ns    GLONASS time scale correction to UTC(SU)
  B1           float32  1 s            difference between UT1 and UTC(SU)
  B2           float32  1 s / msd      daily change of B1
  Padding         uint                 Padding bytes, see 4.1.5

  THE UNITS ON tau_GPS AND tau_c ARE "1 x 10^9 ns", WHICH IS SECONDS. Written that
  way in the datasheet because the GLONASS ICD scales them in nanoseconds; the
  decoders publish seconds so nobody applies a 1e9 conversion twice.

  `KP` is the leap-second notification — GLONASS announces a pending leap second
  here — so its two-bit code is decoded rather than left as a number.
*/
const NANOSECONDS_PER_SECOND = 1e9

const LEAP_SECOND_NOTICE: Readonly<Record<number, string>> = {
  0: 'NO_LEAP_SECOND_SCHEDULED',
  1: 'LEAP_SECOND_PLUS_ONE_AT_END_OF_QUARTER',
  2: 'NO_LEAP_SECOND_SCHEDULED',
  3: 'LEAP_SECOND_MINUS_ONE_AT_END_OF_QUARTER',
}

export const gloTime: BlockDefinition = {
  name: 'GLOTime',
  number: 4036,
  description: 'Decoded GLONASS-to-GPS, UTC(SU) and UT1 time-scale differences, plus the pending leap-second notification',
  timestamp: 'sis',
  revisions: [[
    { name: 'SVID', type: 'uint8', description: 'ID of the GLONASS satellite this data was decoded from (§4.1.9)' },
    { name: 'FreqNr', type: 'uint8', description: 'Frequency number of that satellite, with an offset of 8 (§4.1.9)' },
    { name: 'N_4', type: 'uint8', description: '4-year interval number, counting from 1996' },
    { name: 'KP', type: 'uint8', description: 'Notification of a pending leap second' },
    { name: 'N', type: 'uint16', units: 'days', description: 'Calendar day number within the 4-year period' },
    { name: 'tau_GPS', type: 'float32', units: 's', description: 'Difference of GLONASS time with respect to GPS time' },
    { name: 'tau_c', type: 'float64', units: 's', description: 'GLONASS time-scale correction to UTC(SU)' },
    { name: 'B1', type: 'float32', units: 's', description: 'Difference between UT1 and UTC(SU)' },
    { name: 'B2', type: 'float32', units: 's/msd', description: 'Daily change of B1' },
  ]],
  decoders: {
    ...satelliteDecoders,
    FreqNr: (value) => ({ value: glonassFrequencyNumber(value) }),
    KP: (value) => ({ label: LEAP_SECOND_NOTICE[bits(value, 0, 1)] ?? 'UNKNOWN' }),
    tau_GPS: (value) => ({ value: value * NANOSECONDS_PER_SECOND, units: 'ns' }),
    tau_c: (value) => ({ value: value * NANOSECONDS_PER_SECOND, units: 'ns' }),
  },
}
