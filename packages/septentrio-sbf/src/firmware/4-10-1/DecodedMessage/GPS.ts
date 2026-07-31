// coded
import {
  klobuchar,
  leapSeconds,
  navigationHealth,
  orbit,
  orbitDecoders,
  reserved,
  satelliteDecoders,
  utcPolynomial,
  weekNumber,
} from './keplerian'

import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, bitState } from '../../../utils'

/* §4.2.3 GPS Decoded Message Blocks.

  GPSNav -> Number: 5891 => "OnChange" interval: block generated each time a new
  navigation data set is received from a GPS satellite

  The GPSNav block contains the decoded navigation data for one GPS satellite.
  These data are conveyed in subframes 1 to 3 of the satellite navigation message.
  Refer to GPS ICD for further details.

  GPSNav ---------------------------------------------------------------------
  Block fields    Type  Units              Do-Not-Use  Description
  PRN            uint8                                 ID of the GPS satellite of which the ephemeris is given in this block (see 4.1.9)
  Reserved       uint8                                 Reserved for future use, to be ignored by decoding software
  WN            uint16  1 week                  65535  Week number (10 bits from subframe 1, word 3)
  CAorPonL2      uint8                                 Code(s) on L2 channel (2 bits from subframe 1, word 3)
  URA            uint8                                 User Range accuracy index (4 bits from subframe 1 word 3)
  health         uint8                                 6-bit health from subframe 1, word 3
  L2DataFlag     uint8                                 Data flag for L2 P-code (1 bit from subframe 1, word 4)
  IODC          uint16                                 Issue of data, clock (10 bits from subframe 1)
  IODE2          uint8                                 Issue of data, ephemeris (8 bits from subframe 2)
  IODE3          uint8                                 Issue of data, ephemeris (8 bits from subframe 3)
  FitIntFlg      uint8                                 Curve Fit Interval (1 bit from subframe 2, word 10)
  Reserved2      uint8                                 unused, to be ignored by decoding software
  T_gd         float32  1 s                            Estimated group delay differential
  t_oc          uint32  1 s                            clock data reference time
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
  t_oe          uint32  1 s                            Reference time ephemeris
  C_ic         float32  1 rad                          Amplitude of the cosine harmonic correction term to the angle of inclination
  OMEGA_0      float64  1 semi-circle                  Longitude of ascending node of orbit plane at weekly epoch
  C_is         float32  1 rad                          Amplitude of the sine harmonic correction term to the angle of inclination
  i_0          float64  1 semi-circle                  Inclination angle at reference time
  C_rc         float32  1 m                            Amplitude of the cosine harmonic correction term to the orbit radius
  omega        float64  1 semi-circle                  Argument of perigee
  OMEGADOT     float32  1 semi-circle / s              Rate of right ascension
  IDOT         float32  1 semi-circle / s              Rate of inclination angle
  WNt_oc        uint16  1 week                         WN associated with t_oc, modulo 1024
  WNt_oe        uint16  1 week                         WN associated with t_oe, modulo 1024
  Padding         uint                                 Padding bytes, see 4.1.5

  126 body bytes, so a 140-byte block — which is exactly what cru's receiver emits.
  That arithmetic is the check on the whole transcription: the field order above is
  NOT the tidy order the elements are usually printed in (note `M_0` sitting
  between `DEL_N` and `C_uc`, and `e` between `C_uc` and `C_us`), and any
  rearrangement into a more logical order would still produce 126 bytes while
  decoding every element into the wrong slot.
*/
const CODE_ON_L2: Readonly<Record<number, string>> = {
  0: 'RESERVED',
  1: 'P_CODE_ON',
  2: 'CA_CODE_ON',
  3: 'RESERVED',
}

const GPS_NAV_FIELDS: readonly FieldDefinition[] = [
  { name: 'PRN', type: 'uint8', description: 'ID of the GPS satellite whose ephemeris this is (§4.1.9)' },
  reserved('Reserved'),
  weekNumber('WN', 'Week number, the 10 bits from subframe 1 word 3', true),
  { name: 'CAorPonL2', type: 'uint8', description: 'Code(s) on the L2 channel, the 2 bits from subframe 1 word 3' },
  { name: 'URA', type: 'uint8', description: 'User range accuracy index, the 4 bits from subframe 1 word 3' },
  { name: 'health', type: 'uint8', description: 'The 6-bit health from subframe 1 word 3' },
  { name: 'L2DataFlag', type: 'uint8', description: 'Data flag for the L2 P-code, 1 bit from subframe 1 word 4' },
  { name: 'IODC', type: 'uint16', description: 'Issue of data, clock — 10 bits from subframe 1' },
  { name: 'IODE2', type: 'uint8', description: 'Issue of data, ephemeris — 8 bits from subframe 2' },
  { name: 'IODE3', type: 'uint8', description: 'Issue of data, ephemeris — 8 bits from subframe 3' },
  { name: 'FitIntFlg', type: 'uint8', description: 'Curve-fit interval flag, 1 bit from subframe 2 word 10' },
  reserved('Reserved2'),
  { name: 'T_gd', type: 'float32', units: 's', description: 'Estimated group delay differential' },
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
  weekNumber('WNt_oc', 'Week number associated with t_oc, modulo 1024'),
  weekNumber('WNt_oe', 'Week number associated with t_oe, modulo 1024'),
]

// Shared by GPSNav and QZSNav, whose field lists are identical.
export const gpsNavDecoders: Readonly<Record<string, Decoder>> = {
  ...satelliteDecoders,
  ...orbitDecoders,
  health: navigationHealth,
  CAorPonL2: (value) => ({ label: CODE_ON_L2[value] ?? 'UNKNOWN' }),
  // §20.3.3.3.1.3: the index is an exponent, and the accuracy it stands for is
  // what a consumer wants. 2^(1 + N/2) metres for N <= 6 is the standard reading.
  URA: (value) => ({ index: value, accuracy: { value: 2 ** (1 + (value / 2)), units: 'm' } }),
  L2DataFlag: (value) => ({ l2PCodeDataOff: value === 1 }),
  FitIntFlg: (value) => ({ extendedFitInterval: value === 1 }),
}

export const gpsNavFields = GPS_NAV_FIELDS

export const gpsNav: BlockDefinition = {
  name: 'GPSNav',
  number: 5891,
  description: 'Decoded ephemeris and clock parameters for one GPS satellite, from subframes 1-3 of its navigation message',
  timestamp: 'sis',
  revisions: [GPS_NAV_FIELDS],
  decoders: gpsNavDecoders,
}

/* GPSAlm -> Number: 5892 => "OnChange" interval: block generated each time a new
  almanac data set is received from a GPS satellite

  The GPSAlm block contains the decoded almanac data for one GPS satellite. These
  data are conveyed in subframes 4 and 5 of the satellite navigation message.

  GPSAlm ---------------------------------------------------------------------
  Block fields    Type  Units              Description
  PRN            uint8                     ID of the GPS satellite of which the almanac is given in this block
  Reserved       uint8                     Reserved for future use
  e            float32                     Eccentricity
  t_oa          uint32  1 s                almanac reference time of week
  delta_i      float32  1 semi-circle      Inclination angle at reference time, relative to i0 = 0.3 semi-circles
  OMEGADOT     float32  1 semi-circle / s  Rate of right ascension
  SQRT_A       float32  1 m1/2             Square root of the semi-major axis
  OMEGA_0      float32  1 semi-circle      Longitude of ascending node of orbit plane at weekly epoch
  omega        float32  1 semi-circle      Argument of perigee
  M_0          float32  1 semi-circle      Mean anomaly at reference time
  a_f1         float32  1 s / s            SV clock drift
  a_f0         float32  1 s                SV clock bias
  WN_a           uint8  1 week             Almanac reference week, to which t_oa is referenced
  config         uint8                     Anti-spoofing and satellite configuration (4 bits from subframe 4, page 25)
  health8        uint8                     health on 8 bits from the almanac page
  health6        uint8                     health summary on 6 bits
  Padding         uint                     Padding bytes, see 4.1.5

  An almanac is a COARSE orbit: every element is float32 here where the ephemeris
  uses float64, and `delta_i` is a correction to a nominal inclination of 0.3
  semi-circles rather than the inclination itself. Treating an almanac element as
  an ephemeris element gives a position wrong by kilometres.
*/
const almanacBody = (configField: FieldDefinition): readonly FieldDefinition[] => [
  { name: 'PRN', type: 'uint8', description: 'ID of the satellite whose almanac this is (§4.1.9)' },
  reserved('Reserved'),
  orbit.e('float32'),
  { name: 't_oa', type: 'uint32', units: 's', description: 'Almanac reference time of week' },
  { name: 'delta_i', type: 'float32', units: 'semi-circles', description: 'Inclination angle at reference time, RELATIVE to the nominal 0.3 semi-circles' },
  orbit.OMEGADOT(),
  orbit.SQRT_A('float32'),
  orbit.OMEGA_0('float32'),
  orbit.omega('float32'),
  orbit.M_0('float32'),
  orbit.a_f1(),
  orbit.a_f0(),
  { name: 'WN_a', type: 'uint8', units: 'weeks', description: 'Almanac reference week, to which t_oa is referenced' },
  configField,
  { name: 'health8', type: 'uint8', description: 'The 8-bit health from the almanac page' },
  { name: 'health6', type: 'uint8', description: 'The 6-bit health summary, from subframe 4 page 25 and subframe 5 page 25' },
]

// The nominal inclination an almanac's delta_i is relative to (GPS ICD).
const NOMINAL_INCLINATION_SEMI_CIRCLES = 0.3
const SEMI_CIRCLE_DEGREES = 180

const ANTI_SPOOFING = 8

export const almanacDecoders: Readonly<Record<string, Decoder>> = {
  ...satelliteDecoders,
  ...orbitDecoders,
  // The ABSOLUTE inclination, which is what delta_i is for and what nobody
  // remembers to add the nominal to.
  delta_i: (value) => ({
    value: (value + NOMINAL_INCLINATION_SEMI_CIRCLES) * SEMI_CIRCLE_DEGREES,
    units: 'deg',
    relative: { value: value * SEMI_CIRCLE_DEGREES, units: 'deg' },
  }),
  health6: navigationHealth,
  health8: (value) => ({ navigationDataValid: !bitState(value, 5), signalHealth: bits(value, 0, 4) }),
  config: (value) => ({ antiSpoofing: bitState(value, 3), configuration: bits(value, 0, 2), raw: value & ANTI_SPOOFING }),
}

export const gpsAlm: BlockDefinition = {
  name: 'GPSAlm',
  number: 5892,
  description: 'Decoded almanac — a coarse orbit — for one GPS satellite, from subframes 4 and 5 of its navigation message',
  timestamp: 'sis',
  revisions: [almanacBody({ name: 'config', type: 'uint8', description: 'Anti-spoofing and satellite configuration, the 4 bits from subframe 4 page 25' })],
  decoders: almanacDecoders,
}

export const almanacFields = almanacBody

/* GPSIon -> Number: 5893 => "OnChange" interval: block generated each time
  subframe 4, page 18, is received from a GPS satellite

  The GPSIon block contains the decoded ionosphere data (the Klobuchar
  coefficients). These data are conveyed in subframe 4, page 18.

  GPSIon: PRN uint8, Reserved uint8, then alpha_0..alpha_3 and beta_0..beta_3, all
  float32 — 34 body bytes, so a 48-byte block, which is what cru's receiver emits.
*/
export const gpsIon: BlockDefinition = {
  name: 'GPSIon',
  number: 5893,
  description: 'Decoded GPS ionosphere model — the eight Klobuchar coefficients — from subframe 4 page 18',
  timestamp: 'sis',
  revisions: [[
    { name: 'PRN', type: 'uint8', description: 'ID of the GPS satellite the coefficients came from (§4.1.9)' },
    reserved('Reserved'),
    ...klobuchar(),
  ]],
  decoders: satelliteDecoders,
}

/* GPSUtc -> Number: 5894 => "OnChange" interval: block generated each time
  subframe 4, page 18, is received from a GPS satellite

  The GPSUtc block contains the decoded UTC data, conveyed in subframe 4 page 18.

  GPSUtc ---------------------------------------------------------------------
  PRN uint8, Reserved uint8, A_1 float32 (1 s/s), A_0 float64 (1 s),
  t_ot uint32 (1 s), WN_t uint8 (1 week), DEL_t_LS int8 (1 s),
  WN_LSF uint8 (1 week), DN uint8 (1 day, from 1 to 7), DEL_t_LSF int8 (1 s)

  Note DN runs 1..7 here; BDSUtc's runs 0..6 for the same field. That off-by-one
  between constellations is exactly the sort of thing worth carrying in the field
  description rather than assuming.
*/
export const gpsUtc: BlockDefinition = {
  name: 'GPSUtc',
  number: 5894,
  description: 'Decoded GPS-UTC offset parameters and the scheduled leap second, from subframe 4 page 18',
  timestamp: 'sis',
  revisions: [[
    { name: 'PRN', type: 'uint8', description: 'ID of the GPS satellite the parameters came from (§4.1.9)' },
    reserved('Reserved'),
    ...utcPolynomial(false),
    { name: 't_ot', type: 'uint32', units: 's', description: 'Reference time of week for the UTC data' },
    { name: 'WN_t', type: 'uint8', units: 'weeks', description: 'UTC reference week number, to which t_ot is referenced' },
    ...leapSeconds('1 to 7'),
  ]],
  decoders: satelliteDecoders,
}
