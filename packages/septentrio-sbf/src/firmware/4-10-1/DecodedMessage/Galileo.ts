// coded
import {
  galileoHealthAlmanac,
  galileoHealthOSSOL,
  galileoSource,
  leapSeconds,
  orbit,
  orbitDecoders,
  reserved,
  satelliteDecoders,
  utcPolynomial,
  weekNumber,
} from './keplerian'

import { DO_NOT_USE_FLOAT, DO_NOT_USE_UINT8 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, bitState } from '../../../utils'

/* §4.2.5 Galileo Decoded Message Blocks.

  GALNav -> Number: 4002 => "OnChange" interval: output each time a new navigation
  data batch is decoded.

  The GalNav block contains the following decoded navigation data for one Galileo
  satellite:
    - orbital elements and clock corrections
    - health, Signal-In-Space Accuracy (SISA) indexes and Broadcast Group Delays
      (BGDs) for each carrier or carrier combinations.

  The interpretation of the clock correction parameters (t_oc, a_f0, a_f1, a_f2)
  depends on the value of the Source field:

    Source  Message type  Applicable Clock Model
    2       I/NAV         (L1, E5b)
    16      F/NAV         (L1, E5a)

  If the receiver is decoding both the I/NAV and the F/NAV data stream, it will
  output a GalNav block for the I/NAV stream, containing the (L1, E5b) clock model,
  and a DIFFERENT GalNav block for the F/NAV stream, containing the (L1, E5a) clock
  model.

  Depending on the message type being decoded, some health, SISA or BGD values may
  not be available (in that case they are set to their respective Do-Not-Use
  values). The following are guaranteed to be available for a given Source:

    2  (I/NAV)  At least L1-B_DVS, L1-B_HS, E5b_DVS, E5b_HS, SISA_L1E5b and BGD_L1E5b
    16 (F/NAV)  At least E5a_DVS, E5a_HS, SISA_L1E5a and BGD_L1E5a

  The IODNav field identifies the issue of data. All orbital elements, clock
  parameters and SISA values in the block are guaranteed to refer to the same data
  batch identified by IODNav. The fields Health_OSSOL, BGD_L1E5a, BGD_L1E5b and
  CNAVenc are NOT covered by the issue of data, and the block simply contains the
  latest received value.

  GALNav ---------------------------------------------------------------------
  SVID u1, Source u1, SQRT_A f8, M_0 f8, e f8, i_0 f8, omega f8, OMEGA_0 f8,
  OMEGADOT f4, IDOT f4, DEL_N f4, C_uc f4, C_us f4, C_rc f4, C_rs f4, C_ic f4,
  C_is f4, t_oe u4, t_oc u4, a_f2 f4, a_f1 f4, a_f0 f8, WNt_oe u2, WNt_oc u2,
  IODnav u2, Health_OSSOL u2, Health_PRS u1, SISA_L1E5a u1 (DNU 255),
  SISA_L1E5b u1 (255), SISA_L1AE6A u1 (255), BGD_L1E5a f4 (DNU -2e10),
  BGD_L1E5b f4 (-2e10), BGD_L1AE6A f4 (-2e10), CNAVenc u1 (255)

  126 body bytes -> a 140-byte block, which is what cru's receiver emits.

  NOTE `Source` IS NOT DECORATION HERE. Two GALNav blocks for the same satellite
  can be in flight with different clock parameters, and a consumer that treats the
  later one as an update of the earlier will silently mix the (L1,E5b) and (L1,E5a)
  clock models. So the decoder publishes the applicable clock model by name, not
  just the stream.

  Galileo also puts `a_f0` in float64 while `a_f1`/`a_f2` are float32 — an
  asymmetry that is real and easy to "tidy" into a bug.
*/
const galileoOrbit: readonly FieldDefinition[] = [
  orbit.SQRT_A(),
  orbit.M_0(),
  orbit.e(),
  orbit.i_0(),
  orbit.omega(),
  orbit.OMEGA_0(),
  orbit.OMEGADOT(),
  orbit.IDOT(),
  orbit.DEL_N(),
  orbit.C_uc(),
  orbit.C_us(),
  orbit.C_rc(),
  orbit.C_rs(),
  orbit.C_ic(),
  orbit.C_is(),
  orbit.t_oe(),
  orbit.t_oc(),
  orbit.a_f2(),
  orbit.a_f1(),
  orbit.a_f0('float64'),
]

const sisa = (name: string, what: string): FieldDefinition =>
  ({ name, type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: `Signal-In-Space Accuracy index ${what}` })

const bgd = (name: string, what: string): FieldDefinition =>
  ({ name, type: 'float32', units: 's', doNotUse: DO_NOT_USE_FLOAT, description: `Last received broadcast group delay ${what}` })

/* SISA index -> metres, per the Galileo OS SIS ICD:
     0-49    0.0 to 0.49 m in 0.01 m steps
     50-74   0.50 to 0.98 m in 0.02 m steps
     75-99   1.00 to 1.96 m in 0.04 m steps
     100-125 2.0 to 6.0 m in 0.16 m steps
     126-254 spare
     255     No Accuracy Prediction Available (the Do-Not-Use value)
  A stepped table, not a formula — which is why it is a function and not a
  multiplication. 255 never reaches here: the engine has already nulled it.
*/
const sisaMetres = (index: number): number | null => {
  if (index < 50) return index * 0.01
  if (index < 75) return 0.5 + ((index - 50) * 0.02)
  if (index < 100) return 1 + ((index - 75) * 0.04)
  if (index < 126) return 2 + ((index - 100) * 0.16)
  return null
}

const galNavDecoders: Readonly<Record<string, Decoder>> = {
  ...satelliteDecoders,
  ...orbitDecoders,
  Source: galileoSource,
  Health_OSSOL: galileoHealthOSSOL,
  SISA_L1E5a: (value) => {
    const accuracy = sisaMetres(value)
    return (accuracy === null) ? { index: value } : { index: value, value: accuracy, units: 'm' }
  },
  SISA_L1E5b: (value) => {
    const accuracy = sisaMetres(value)
    return (accuracy === null) ? { index: value } : { index: value, value: accuracy, units: 'm' }
  },
  // The datasheet says "2-bit C/NAV encryption status" and defines no code
  // meanings, so the two bits are published as they are. cru's own receiver
  // reports 3 here, which no invented two-value table would have labelled
  // correctly — a reminder that guessing an enum is worse than reporting a number.
  CNAVenc: (value) => ({ status: bits(value, 0, 1) }),
}

export const galNav: BlockDefinition = {
  name: 'GALNav',
  number: 4002,
  description: 'Decoded ephemeris, clock corrections, health, SISA indexes and broadcast group delays for one Galileo satellite',
  timestamp: 'sis',
  revisions: [[
    { name: 'SVID', type: 'uint8', description: 'SVID of the Galileo satellite (§4.1.9)' },
    { name: 'Source', type: 'uint8', description: 'Navigation stream the data came from — 2 I/NAV, 16 F/NAV — which decides WHICH clock model the clock corrections belong to' },
    ...galileoOrbit,
    weekNumber('WNt_oe', 'Week number associated with t_oe, in the GPS time frame, modulo 4096'),
    weekNumber('WNt_oc', 'Week number associated with t_oc, in the GPS time frame, modulo 4096'),
    { name: 'IODnav', type: 'uint16', description: 'Issue of data, navigation (10 bits); every orbital element, clock parameter and SISA value in this block refers to this batch' },
    { name: 'Health_OSSOL', type: 'uint16', description: 'Bit field: the last received Health Status and Data Validity Status of the E5a, E5b and L1-B signals, each group guarded by a validity bit' },
    reserved('Health_PRS'),
    sisa('SISA_L1E5a', 'for the (L1, E5a) combination'),
    sisa('SISA_L1E5b', 'for the (L1, E5b) combination'),
    { name: 'SISA_L1AE6A', type: 'uint8', reserved: true, doNotUse: DO_NOT_USE_UINT8, description: 'Reserved' },
    bgd('BGD_L1E5a', 'for the (L1, E5a) combination'),
    bgd('BGD_L1E5b', 'for the (L1, E5b) combination'),
    { name: 'BGD_L1AE6A', type: 'float32', units: 's', reserved: true, doNotUse: DO_NOT_USE_FLOAT, description: 'Reserved' },
    { name: 'CNAVenc', type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: '2-bit C/NAV encryption status' },
  ]],
  decoders: galNavDecoders,
  // Which clock model these corrections belong to, restated where a consumer
  // reading the block as a whole will see it. Mixing the two models is the one
  // mistake this block invites.
  payloadMetadata: ({ Source, IODnav }) => {
    if (typeof Source !== 'number') return {}
    const clock: Record<string, unknown> = { ...galileoSource(Source, {}) }
    if (typeof IODnav === 'number') clock.issueOfData = IODnav
    return { clock }
  },
}

/* GALAlm -> Number: 4003 => "OnChange" interval: output each time a new almanac
  set is received for a satellite.

  The GalAlm block contains the decoded almanac data for one Galileo satellite.

  GALAlm ---------------------------------------------------------------------
  SVID u1, Source u1, e f4, t_oa u4, delta_i f4, OMEGADOT f4, SQRT_A f4,
  OMEGA_0 f4, omega f4, M_0 f4, a_f1 f4, a_f0 f4, WN_a u1, SVID_A u1, health u2,
  IODa u1

  `Source` can additionally take the value 18, meaning the almanac was MERGED from
  I/NAV and F/NAV pages — a third case GALNav does not have.

  TWO SVIDs, AND THEY ARE NOT THE SAME SATELLITE. `SVID` is the satellite the
  almanac was RECEIVED FROM; `SVID_A` is the satellite the almanac DESCRIBES. Every
  satellite broadcasts almanacs for its neighbours, so conflating them attributes
  one satellite's orbit to another. Both are resolved through §4.1.9.

  Its `health` is a different bit field from GALNav's `Health_OSSOL`: the guard bits
  are at 0/3/6 and each group is a bare 2-bit HS with NO data-validity bit, so the
  two cannot share a decoder even though both are "Galileo health".
*/
export const galAlm: BlockDefinition = {
  name: 'GALAlm',
  number: 4003,
  description: 'Decoded almanac for one Galileo satellite — note the almanac describes SVID_A, which is not the SVID that broadcast it',
  timestamp: 'sis',
  revisions: [[
    { name: 'SVID', type: 'uint8', description: 'SVID of the Galileo satellite these almanac parameters were RECEIVED FROM (§4.1.9)' },
    { name: 'Source', type: 'uint8', description: 'Navigation stream the data came from — 2 I/NAV, 16 F/NAV, 18 merged from both' },
    orbit.e('float32'),
    { name: 't_oa', type: 'uint32', units: 's', description: 'Almanac reference time of week' },
    { name: 'delta_i', type: 'float32', units: 'semi-circles', description: 'Inclination angle at reference time, relative to nominal' },
    orbit.OMEGADOT(),
    orbit.SQRT_A('float32'),
    orbit.OMEGA_0('float32'),
    orbit.omega('float32'),
    orbit.M_0('float32'),
    orbit.a_f1(),
    orbit.a_f0(),
    { name: 'WN_a', type: 'uint8', units: 'weeks', description: '2-bit almanac reference week' },
    { name: 'SVID_A', type: 'uint8', description: 'SVID of the Galileo satellite these almanac parameters DESCRIBE (§4.1.9)' },
    { name: 'health', type: 'uint16', description: 'Bit field: the Health Status of the E5a, E5b and L1-B signals, each group guarded by a validity bit' },
    { name: 'IODa', type: 'uint8', description: '4-bit issue of data for the almanac' },
  ]],
  decoders: {
    ...satelliteDecoders,
    ...orbitDecoders,
    Source: galileoSource,
    health: galileoHealthAlmanac,
  },
}

/* GALIon -> Number: 4030 => "OnChange" interval: output each time the ionospheric
  parameters are received from a Galileo satellite.

  The GalIon block contains the decoded ionosphere model parameters of the Galileo
  system.

  GALIon ---------------------------------------------------------------------
  SVID u1, Source u1,
  a_i0 f4  1e-22 W / (m2 Hz)
  a_i1 f4  1e-22 W / (m2 Hz) / deg
  a_i2 f4  1e-22 W / (m2 Hz) / deg2
  StormFlags u1  Bit field containing the five ionospheric storm flags:
                   Bit 0: SF5   Bit 1: SF4   Bit 2: SF3   Bit 3: SF2   Bit 4: SF1
                   Bits 5-7: Reserved

  NOT KLOBUCHAR. Galileo broadcasts NeQuick's effective ionisation level as a
  quadratic in latitude, in solar-flux units, where GPS and BeiDou broadcast eight
  Klobuchar delay coefficients — so this block shares nothing with GPSIon/BDSIon
  despite the matching block names.

  The storm flags are numbered BACKWARDS relative to their bit positions (bit 0 is
  SF5, bit 4 is SF1), which is the sort of thing that gets silently reversed.
*/
const NEQUICK_UNITS = '1e-22 W/(m2 Hz)'

export const galIon: BlockDefinition = {
  name: 'GALIon',
  number: 4030,
  description: 'Decoded Galileo NeQuick ionosphere model — the effective ionisation level as a quadratic in latitude — plus the five storm flags',
  timestamp: 'sis',
  revisions: [[
    { name: 'SVID', type: 'uint8', description: 'SVID of the Galileo satellite these parameters were received from (§4.1.9)' },
    { name: 'Source', type: 'uint8', description: 'Navigation stream the data came from — 2 I/NAV, 16 F/NAV' },
    { name: 'a_i0', type: 'float32', units: NEQUICK_UNITS, description: 'Effective ionisation level, ai0' },
    { name: 'a_i1', type: 'float32', units: `${NEQUICK_UNITS}/deg`, description: 'Effective ionisation level, ai1' },
    { name: 'a_i2', type: 'float32', units: `${NEQUICK_UNITS}/deg2`, description: 'Effective ionisation level, ai2' },
    { name: 'StormFlags', type: 'uint8', description: 'Bit field of the five ionospheric storm flags: bit 0 is SF5, bit 1 SF4, bit 2 SF3, bit 3 SF2, bit 4 SF1' },
  ]],
  decoders: {
    ...satelliteDecoders,
    Source: galileoSource,
    // Bit 0 is SF5 and bit 4 is SF1 — the numbering runs backwards, so each flag
    // is named explicitly rather than indexed.
    StormFlags: (value) => ({
      sf1: bitState(value, 4),
      sf2: bitState(value, 3),
      sf3: bitState(value, 2),
      sf4: bitState(value, 1),
      sf5: bitState(value, 0),
      any: bits(value, 0, 4) !== 0,
    }),
  },
}

/* GALUtc -> Number: 4031 => "OnChange" interval: output each time the UTC offset
  parameters are received from a Galileo satellite.

  The GalUtc block contains the decoded UTC parameter information.

  GALUtc: SVID u1, Source u1, A_1 f4 (DNU -2e10), A_0 f8 (DNU -2e10), t_ot u4,
  WN_ot u1, DEL_t_LS i1, WN_LSF u1, DN u1 (1 to 7), DEL_t_LSF i1

  Unlike GPSUtc, the polynomial coefficients here carry Do-Not-Use values — Galileo
  may broadcast the page without valid UTC parameters.
*/
export const galUtc: BlockDefinition = {
  name: 'GALUtc',
  number: 4031,
  description: 'Decoded Galileo GST-UTC offset parameters and the scheduled leap second',
  timestamp: 'sis',
  revisions: [[
    { name: 'SVID', type: 'uint8', description: 'SVID of the Galileo satellite these parameters were received from (§4.1.9)' },
    { name: 'Source', type: 'uint8', description: 'Navigation stream the data came from — 2 I/NAV, 16 F/NAV' },
    ...utcPolynomial(true),
    { name: 't_ot', type: 'uint32', units: 's', description: 'Reference time of week for the UTC data' },
    { name: 'WN_ot', type: 'uint8', units: 'weeks', description: 'UTC reference week number, to which t_ot is referenced' },
    ...leapSeconds('1 to 7'),
  ]],
  decoders: { ...satelliteDecoders, Source: galileoSource },
}

/* GALGstGps -> Number: 4032 => "OnChange" interval: output each time valid GST-GPS
  offset parameters are received from a Galileo satellite.

  This block contains the decoded GPS to Galileo System Time offset parameters.
  This block is ONLY output if these parameters are valid in the navigation page
  (i.e. if they are not set to "all ones").

  GALGstGps: SVID u1, Source u1, A_1G f4 (1e9 ns/s), A_0G f4 (1e9 ns), t_oG u4,
  WN_oG u1

  "Only output if valid" is worth noting: the ABSENCE of this block is itself the
  information that the satellite is not broadcasting a usable GST-GPS offset. There
  is no Do-Not-Use path to handle.
*/
export const galGstGps: BlockDefinition = {
  name: 'GALGstGps',
  number: 4032,
  description: 'Decoded GPS-to-Galileo-System-Time offset; the receiver emits this block only when the broadcast parameters are valid',
  timestamp: 'sis',
  revisions: [[
    { name: 'SVID', type: 'uint8', description: 'SVID of the Galileo satellite these parameters were received from (§4.1.9)' },
    { name: 'Source', type: 'uint8', description: 'Navigation stream the data came from — 2 I/NAV, 16 F/NAV' },
    { name: 'A_1G', type: 'float32', units: 's/s', description: 'Rate of change of the GST-GPS offset' },
    { name: 'A_0G', type: 'float32', units: 's', description: 'Constant term of the GST-GPS offset' },
    { name: 't_oG', type: 'uint32', units: 's', description: 'Reference time of week' },
    { name: 'WN_oG', type: 'uint8', units: 'weeks', description: '6-bit reference week number' },
  ]],
  decoders: { ...satelliteDecoders, Source: galileoSource },
}

/* GALSARRLM -> Number: 4034 => "OnChange" interval: generated each time a SAR RLM
  message is decoded.

  This block contains a decoded Galileo search-and-rescue (SAR) return link message
  (RLM).

  GALSARRLM ------------------------------------------------------------------
  Block fields    Type      Units  Description
  SVID           uint8             SVID of the Galileo satellite this RLM was received from
  Source         uint8             Message type the data was decoded from: 2 I/NAV, 16 F/NAV
  RLMLength      uint8             Length of the RLM message IN BITS. Either 80 (short) or 160 (long).
  Reserved     uint8[3]            Reserved for future use, to be ignored by decoding software
  RLMBits     uint32[N]            Bits in the RLM message, first bit being the MSB of RLMBits[0].
                                   N is 3 for a short message (RLMLength 80) and 5 for a long
                                   one (RLMLength 160). The 16 unused bits of a short message are
                                   set to 0; they are the 16 LSBs of RLMBits[2].
  Padding         uint             Padding bytes, see 4.1.5

  THIS IS A DISTRESS BEACON ACKNOWLEDGEMENT. Galileo's SAR service relays a
  confirmation back to a beacon that its alert was received, and this block is that
  message decoded. Worth knowing what the bytes are for, given the field table
  looks like every other raw-bit array.

  THE ONE FIELD IN THE WHOLE PACKAGE WHOSE WIDTH IS DERIVED RATHER THAN CARRIED.
  `RLMLength` is a BIT count (80 or 160), and N is that many bits rounded up to
  whole 32-bit words — so `lengthFrom` alone would read 80 BYTES. Hence `lengthOf`,
  which maps the sibling's value to the byte width. Reading it as `rest` would
  happen to work on today's frames and silently absorb padding on any frame that
  has some.
*/
const BITS_PER_WORD = 32
const BYTES_PER_WORD = 4
const HEX_DIGITS_PER_WORD = 8

const SHORT_MESSAGE_BITS = 80
const LONG_MESSAGE_BITS = 160

// bits -> whole 32-bit words -> bytes. 80 -> 3 words -> 12 B; 160 -> 5 -> 20 B.
const rlmBytes = (messageBits: number): number =>
  Math.ceil(Math.max(0, messageBits) / BITS_PER_WORD) * BYTES_PER_WORD

const rlmWords = (bytes: Uint8Array): string => {
  const words: string[] = []
  for (let offset = 0; offset + BYTES_PER_WORD <= bytes.byteLength; offset += BYTES_PER_WORD) {
    const word = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
    words.push((word >>> 0).toString(16).toUpperCase().padStart(HEX_DIGITS_PER_WORD, '0'))
  }
  return words.join(' ')
}

const RLM_KIND: Readonly<Record<number, string>> = {
  [SHORT_MESSAGE_BITS]: 'SHORT',
  [LONG_MESSAGE_BITS]: 'LONG',
}

export const galSARRLM: BlockDefinition = {
  name: 'GALSARRLM',
  number: 4034,
  description: 'A decoded Galileo search-and-rescue return link message — the acknowledgement relayed back to a distress beacon',
  timestamp: 'sis',
  revisions: [[
    { name: 'SVID', type: 'uint8', description: 'SVID of the Galileo satellite this RLM was received from (§4.1.9)' },
    { name: 'Source', type: 'uint8', description: 'Navigation stream the data came from — 2 I/NAV, 16 F/NAV' },
    { name: 'RLMLength', type: 'uint8', units: 'bits', description: 'Length of the RLM message in BITS: 80 for a short message, 160 for a long one' },
    reserved('Reserved', 3),
    {
      name: 'RLMBits',
      type: 'string',
      lengthFrom: 'RLMLength',
      lengthOf: rlmBytes,
      format: rlmWords,
      description: 'The RLM bits as 32-bit words in hex, the first bit being the MSB of the first word; a short message pads its final 16 bits with zeros',
    },
  ]],
  decoders: {
    ...satelliteDecoders,
    Source: galileoSource,
    RLMLength: (value) => ({
      label: RLM_KIND[value] ?? 'UNKNOWN',
      words: rlmBytes(value) / BYTES_PER_WORD,
      // A short message's last 16 bits are zero padding, per the datasheet.
      unusedBits: (rlmBytes(value) * 8) - value,
    }),
  },
}
