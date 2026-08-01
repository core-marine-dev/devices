// coded
import { leapSeconds, reserved, satelliteDecoders, utcPolynomial } from './keplerian'

import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* §4.2.8 SBAS L1 Decoded Message Blocks — fourteen blocks, one per DO-229 message
  type, carrying the decoded contents of the SBAS L1 frames whose raw bits are
  GEORawL1 (4020).

  SBAS (WAAS, EGNOS, MSAS, GAGAN…) does not broadcast an ephemeris and leave it
  there: it broadcasts a stream of NUMBERED MESSAGE TYPES that reference each other
  through issue-of-data tags, and these blocks preserve that structure. Two
  consequences run through the whole category:

  1. **A slot number is only meaningful against the mask that defined it.** The
     `PRNMaskNo` fields in MT02-05/24 (fast corrections), MT24/25 (long-term
     corrections) and MT28 (covariances) are positions in the PRN mask broadcast by
     MT01 — i.e. in GEOPRNMask's `PRNMask` array. Likewise `IGPMaskNo` in MT26
     indexes GEOIGPMask's `IGPMask`. The `IODP` / `IODI` tags are how a consumer
     checks it is using the right mask: if the IODP of a correction does not match
     the IODP of the mask it holds, the correction refers to a DIFFERENT satellite
     and must be discarded. This is why every block here carries its issue of data
     and none of them resolves a slot to a PRN — the parser does not hold the mask,
     and guessing across an IODP change would silently mis-attribute a correction.

  2. **These are integrity data.** DO-229 exists so an aviation receiver can bound
     its own position error, so the UDRE/GIVE indicators, degradation factors and
     "Don't use for safety applications" flag are the point of the messages rather
     than incidental. Where the datasheet defines an indicator's meaning it is
     decoded; where it gives only a range, the number is published unlabelled
     rather than invented into a label.

  Refer to DO-229 (sections A.4.4.x) for the interpretation of every field here.
*/
const sbasPRN = (what: string): FieldDefinition =>
  ({ name: 'PRN', type: 'uint8', description: `ID of the SBAS satellite ${what} (§4.1.9)` })

const iodp = (): FieldDefinition =>
  ({ name: 'IODP', type: 'uint8', description: 'Issue of data, PRN — must match the IODP of the MT01 PRN mask these slot numbers index, or the corrections refer to different satellites' })

const iodi = (): FieldDefinition =>
  ({ name: 'IODI', type: 'uint8', description: 'Issue of data, ionosphere — must match the IODI of the MT18 IGP mask these grid-point numbers index' })

const slotNumber = (name: string, range: string, indexes: string): FieldDefinition =>
  ({ name, type: 'uint8', description: `Sequence number in the ${indexes} (${range}); it identifies a satellite only in combination with that mask` })

const subBlockHeader = (count: string, what: string): readonly FieldDefinition[] => [
  { name: count, type: 'uint8', description: `Number of ${what} in this message` },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: `Length of one ${what} sub-block` },
]

/* GEOMT00 -> Number: 5925 => "OnChange" interval: block generated each time MT00
  is received from an SBAS satellite

  This block is sent each time an SBAS satellite transmits a message type 0. MT00
  means "Don't use this satellite for safety applications". It has no body beyond
  the PRN: the ARRIVAL of the message is the information.
*/
export const geoMT00: BlockDefinition = {
  name: 'GEOMT00',
  number: 5925,
  description: 'SBAS message type 0 received: the satellite says DO NOT USE IT for safety applications — the block\'s arrival is the whole message',
  timestamp: 'sis',
  revisions: [[sbasPRN('that sent the message')]],
  decoders: satelliteDecoders,
  payloadMetadata: () => ({ integrity: { doNotUseForSafetyApplications: true } }),
}

/* GEOPRNMask -> Number: 5926 => MT01: PRN Mask assignments
  Refer to section A.4.4.2 of the DO-229 standard.

  PRN u1, IODP u1, NbrPRNs u1, PRNMask u1[NbrPRNs]

  THIS IS THE MASK EVERY OTHER SLOT NUMBER IN THE CATEGORY REFERS TO. PRNMask[0] is
  the first PRN designated in the mask (1 to 210), PRNMask[1] the second, and so on
  — so a `PRNMaskNo` of 3 in a fast correction means PRNMask[2] of the mask whose
  IODP matches. Hold this block and you can resolve the corrections; without it
  they are anonymous.
*/
export const geoPRNMask: BlockDefinition = {
  name: 'GEOPRNMask',
  number: 5926,
  description: 'SBAS MT01 PRN mask — the numbered list of satellites every PRNMaskNo in the other SBAS blocks indexes',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('the message was received from'),
    iodp(),
    { name: 'NbrPRNs', type: 'uint8', description: 'Number of PRNs designated in the mask' },
    {
      name: 'PRNMask',
      count: 'NbrPRNs',
      fields: [{ name: 'MaskPRN', type: 'uint8', description: 'A PRN designated in the mask, from 1 to 210, in mask order' }],
      description: 'The PRNs in the mask, in order: the first entry is mask slot 1',
    },
  ]],
  decoders: satelliteDecoders,
  payloadMetadata: ({ NbrPRNs, IODP }) =>
    (typeof NbrPRNs === 'number' && typeof IODP === 'number') ? { mask: { satellites: NbrPRNs, issueOfData: IODP } } : {},
}

/* GEOFastCorr -> Number: 5927 => MT02-05/24: Fast Corrections
  Refer to section A.4.4.3 of the DO-229 standard.

  PRN u1, MT u1, IODP u1, IODF u1, N u1, SBLength u1, then N x FastCorr:
    PRNMaskNo u1, UDREI u1, Reserved u1[2], PRC f4 (1 m)

  N depends on the message type: 13 for MT00/02/03/04, 12 for MT05, 6 for MT24 —
  which is why N is a field rather than a constant, and why `MT` is worth decoding.

  `PRNMaskNo` "may be set to zero. In that case, all the fields of this sub-block
  must be ignored" — so a zero slot is not slot zero, it is a filler entry.
*/
const UDREI_METRES: Readonly<Record<number, number | undefined>> = {
  0: 0.75, 1: 1, 2: 1.25, 3: 1.75, 4: 2.25, 5: 3, 6: 3.75, 7: 4.5,
  8: 5.25, 9: 6, 10: 7.5, 11: 15, 12: 50, 13: 150,
}

// 14 = "Not Monitored", 15 = "Do Not Use" (DO-229 Table A-12). Both are states
// rather than accuracies, so neither gets a sigma.
const UDREI_STATE: Readonly<Record<number, string | undefined>> = { 14: 'NOT_MONITORED', 15: 'DO_NOT_USE' }

const udreiDecoder: Decoder = (value) => {
  const sigma = UDREI_METRES[value]
  const state = UDREI_STATE[value]
  if (state !== undefined) return { index: value, label: state }
  return (sigma === undefined)
    ? { index: value }
    : { index: value, label: 'MONITORED', sigmaUDRE: { value: sigma, units: 'm' } }
}

const SBAS_MESSAGE_TYPE: Readonly<Record<number, string>> = {
  0: 'MT00_DO_NOT_USE',
  2: 'MT02_FAST_CORRECTIONS',
  3: 'MT03_FAST_CORRECTIONS',
  4: 'MT04_FAST_CORRECTIONS',
  5: 'MT05_FAST_CORRECTIONS',
  24: 'MT24_MIXED_FAST_LONG_TERM',
}

export const geoFastCorr: BlockDefinition = {
  name: 'GEOFastCorr',
  number: 5927,
  description: 'SBAS fast pseudorange corrections and their UDRE integrity bounds, from message types 2-5 and 24',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('the message was received from'),
    { name: 'MT', type: 'uint8', description: 'Message type these fast corrections came from: 0, 2, 3, 4, 5 or 24' },
    iodp(),
    { name: 'IODF', type: 'uint8', description: 'Issue of data, fast corrections' },
    ...subBlockHeader('N', 'FastCorr'),
    {
      name: 'FastCorr',
      count: 'N',
      length: 'SBLength',
      fields: [
        slotNumber('PRNMaskNo', 'zero means this sub-block is filler and must be ignored', 'MT01 PRN mask'),
        { name: 'UDREI', type: 'uint8', description: 'User Differential Range Error Indicator for the satellite at PRNMaskNo' },
        reserved('Reserved', 2),
        { name: 'PRC', type: 'float32', units: 'm', description: 'Pseudorange correction for the satellite at PRNMaskNo' },
      ],
      description: 'A succession of N FastCorr sub-blocks — 13 for MT02-04, 12 for MT05, 6 for MT24',
    },
  ]],
  decoders: {
    ...satelliteDecoders,
    MT: (value) => label(SBAS_MESSAGE_TYPE, value),
    UDREI: udreiDecoder,
    // Zero is not slot zero: the datasheet says the whole sub-block is then to be
    // ignored, so say that rather than publishing a correction for nothing.
    PRNMaskNo: (value) => (value === 0) ? { filler: true } : { maskSlot: value },
  },
}

/* GEOIntegrity -> Number: 5928 => MT06: Integrity information
  Refer to section A.4.4.4 of the DO-229 standard.

  PRN u1, Reserved u1, IODF u1[4], UDREI u1[51]

  TWO FIXED-SIZE ARRAYS, and 51 is not arbitrary: it is the number of slots in the
  SBAS PRN mask, so `UDREI[i]` is the integrity bound for mask slot i+1. This is the
  message that lets a receiver bound its error for every satellite at once, which is
  why it carries all 51 slots rather than only the monitored ones.
*/
export const geoIntegrity: BlockDefinition = {
  name: 'GEOIntegrity',
  number: 5928,
  description: 'SBAS MT06 integrity information — a UDRE indicator for every one of the 51 PRN mask slots',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('the message was received from'),
    reserved('Reserved'),
    {
      name: 'IODF',
      count: 4,
      fields: [{ name: 'IODFEntry', type: 'uint8', description: 'Issue of data for fast corrections, one per message type: MT02, MT03, MT04, MT05 in order' }],
      description: 'Issue of data - fast corrections for MT02, MT03, MT04 and MT05',
    },
    {
      name: 'UDREI',
      count: 51,
      fields: [{ name: 'UDREIEntry', type: 'uint8', description: 'User Differential Range Error Indicator for one PRN mask slot' }],
      description: 'A UDRE indicator for each of the 51 slots in the PRN mask, in mask order',
    },
  ]],
  decoders: { ...satelliteDecoders, UDREIEntry: udreiDecoder },
}

/* GEOFastCorrDegr -> Number: 5929 => MT07: Fast correction degradation factors
  Refer to section A.4.4.5 of the DO-229 standard.

  PRN u1, IODP u1, t_lat u1 (1 s), ai u1[51]

  `t_lat` is the SYSTEM LATENCY — how stale a fast correction may be before it must
  be degraded — and `ai` the per-slot degradation factor indicator (0 to 15). Both
  feed the same error bound the UDREI does.
*/
export const geoFastCorrDegr: BlockDefinition = {
  name: 'GEOFastCorrDegr',
  number: 5929,
  description: 'SBAS MT07 fast-correction degradation factors and the system latency, one factor per PRN mask slot',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('the message was received from'),
    iodp(),
    { name: 't_lat', type: 'uint8', units: 's', description: 'System latency: how stale a fast correction may be before it must be degraded' },
    {
      name: 'ai',
      count: 51,
      fields: [{ name: 'aiEntry', type: 'uint8', description: 'Degradation factor indicator, 0 to 15, for one PRN mask slot' }],
      description: 'A degradation factor indicator for each of the 51 slots in the PRN mask, in mask order',
    },
  ]],
  decoders: satelliteDecoders,
}

/* GEONav -> Number: 5896 => MT09: SBAS navigation message
  Refer to section A.4.4.11 of the DO-229 standard.

  PRN u1, Reserved u1, IODN u2, URA u2, t0 u4 (1 s),
  Xg/Yg/Zg f8 (1 m), Xgd/Ygd/Zgd f8 (1 m/s), Xgdd/Ygdd/Zgdd f8 (1 m/s2),
  aGf0 f4 (1 s), aGf1 f4 (1 s/s)

  A GEOSTATIONARY satellite's own orbit, as a STATE VECTOR — position, velocity and
  acceleration — like GLONASS and unlike the four Keplerian constellations. That
  fits what it describes: an SBAS satellite sits nearly still over one longitude, so
  a short-arc state vector is a better parameterisation than orbital elements.

  Note `t0` is a TIME OF DAY, not a time of week.
*/
const geoStateVector = (): readonly FieldDefinition[] => [
  ...['X', 'Y', 'Z'].map((axis) => ({ name: `${axis}g`, type: 'float64' as const, units: 'm', description: `${axis} position at the time of applicability` })),
  ...['X', 'Y', 'Z'].map((axis) => ({ name: `${axis}gd`, type: 'float64' as const, units: 'm/s', description: `${axis} velocity at the time of applicability` })),
  ...['X', 'Y', 'Z'].map((axis) => ({ name: `${axis}gdd`, type: 'float64' as const, units: 'm/s2', description: `${axis} acceleration at the time of applicability` })),
]

export const geoNav: BlockDefinition = {
  name: 'GEONav',
  number: 5896,
  description: 'SBAS MT09 navigation message — the geostationary satellite own orbit as a state vector, not orbital elements',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('whose navigation data this is'),
    reserved('Reserved'),
    { name: 'IODN', type: 'uint16', description: 'Issue of data, navigation (DO-229B)' },
    { name: 'URA', type: 'uint16', description: 'Accuracy exponent' },
    { name: 't0', type: 'uint32', units: 's', description: 'Time of applicability, as a time of DAY' },
    ...geoStateVector(),
    { name: 'aGf0', type: 'float32', units: 's', description: 'Time offset with respect to SBAS network time' },
    { name: 'aGf1', type: 'float32', units: 's/s', description: 'Time drift with respect to SBAS network time' },
  ]],
  decoders: satelliteDecoders,
}

/* GEODegrFactors -> Number: 5930 => MT10: Degradation factors
  Refer to section A.4.4.6 of the DO-229 standard.

  PRN u1, Reserved u1, Brrc f8 (1 m), Cltc_lsb f8 (1 m), Cltc_v1 f8 (1 m/s),
  Iltc_v1 u4 (1 s), Cltc_v0 f8 (1 m), Iltc_v0 u4 (1 s), Cgeo_lsb f8 (1 m),
  Cgeo_v f8 (1 m/s), Igeo u4 (1 s), Cer f4 (1 m), Ciono_step f8 (1 m),
  Iiono u4 (1 s), Ciono_ramp f8 (1 m/s), RSSudre u1, RSSiono u1,
  Reserved2 u1[2], Ccovariance f8

  The bounds and update intervals a receiver needs to inflate its error estimate
  when a message is MISSED — which is the mechanism by which SBAS stays safe over an
  unreliable link. `RSSudre` and `RSSiono` are root-sum-square flags: they say
  whether the degradation terms combine in quadrature or linearly, so getting them
  wrong changes every bound in the set.
*/
const degradation = (name: string, units: string, description: string): FieldDefinition =>
  ({ name, type: 'float64', units, description })

const interval = (name: string, description: string): FieldDefinition =>
  ({ name, type: 'uint32', units: 's', description })

export const geoDegrFactors: BlockDefinition = {
  name: 'GEODegrFactors',
  number: 5930,
  description: 'SBAS MT10 degradation factors — the bounds and update intervals a receiver uses to inflate its error estimate when a message is missed',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('the message was received from'),
    reserved('Reserved'),
    degradation('Brrc', 'm', 'Parameter associated with the relative estimation noise and round-off error'),
    degradation('Cltc_lsb', 'm', 'Maximum round-off error due to the LSB resolution of the orbit and clock information'),
    degradation('Cltc_v1', 'm/s', 'Velocity error bound on the maximum range-rate difference of missed messages'),
    interval('Iltc_v1', 'Update interval for long-term corrections when the velocity code is 1'),
    degradation('Cltc_v0', 'm', 'Bound on the update delta between successive long-term corrections'),
    interval('Iltc_v0', 'Minimum update interval for long-term messages when the velocity code is 0'),
    degradation('Cgeo_lsb', 'm', 'Maximum round-off error due to the LSB resolution of the orbit and clock information'),
    degradation('Cgeo_v', 'm/s', 'Velocity error bound on the maximum range-rate difference of missed messages'),
    interval('Igeo', 'Update interval for GEO navigation messages'),
    { name: 'Cer', type: 'float32', units: 'm', description: 'A degradation parameter' },
    degradation('Ciono_step', 'm', 'Bound on the difference between successive ionospheric grid delay values'),
    interval('Iiono', 'Minimum update interval for ionospheric correction messages'),
    degradation('Ciono_ramp', 'm/s', 'Rate of change of the ionospheric corrections'),
    { name: 'RSSudre', type: 'uint8', description: 'Root-sum-square flag for UDRE: whether the degradation terms combine in quadrature (1) or linearly (0)' },
    { name: 'RSSiono', type: 'uint8', description: 'Root-sum-square flag for IONO: whether the degradation terms combine in quadrature (1) or linearly (0)' },
    reserved('Reserved2', 2),
    { name: 'Ccovariance', type: 'float64', description: 'Parameter compensating for the errors introduced by quantisation in the covariance matrix' },
  ]],
  decoders: {
    ...satelliteDecoders,
    RSSudre: (value) => ({ rootSumSquare: value === 1 }),
    RSSiono: (value) => ({ rootSumSquare: value === 1 }),
  },
}

/* GEONetworkTime -> Number: 5918 => MT12: SBAS Network Time/UTC offset parameters
  Refer to section A.4.4.15 of the DO-229 standard.

  PRN u1, Reserved u1, A_1 f4, A_0 f8, t_ot u4, WN_t u1, DEL_t_LS i1, WN_LSF u1,
  DN u1, DEL_t_LSF i1, UTC_std u1, GPS_WN u2 (1 week), GPS_TOW u4 (1 s),
  GlonassID u1

  GPSUtc's shape plus THREE extras that make it more than a UTC offset: `UTC_std`
  names WHICH UTC laboratory the offset refers to, and `GPS_WN`/`GPS_TOW` carry the
  SBAS network time expressed in the GPS frame — which is how an SBAS receiver ties
  the two scales together without integrating anything.
*/
const UTC_STANDARD: Readonly<Record<number, string>> = {
  0: 'UTC_NIST',
  1: 'UTC_USNO',
  2: 'UTC_SU',
  3: 'UTC_BIPM',
  4: 'UTC_EUROPE_LABORATORIES',
  5: 'UTC_CRL',
  6: 'UTC_NTSC',
  7: 'NOT_PROVIDED',
}

export const geoNetworkTime: BlockDefinition = {
  name: 'GEONetworkTime',
  number: 5918,
  description: 'SBAS MT12 network time and UTC offset parameters, including which UTC laboratory the offset refers to',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('this network time data was received from'),
    reserved('Reserved'),
    ...utcPolynomial(false),
    { name: 't_ot', type: 'uint32', units: 's', description: 'Reference time of week for the UTC data' },
    { name: 'WN_t', type: 'uint8', units: 'weeks', description: 'UTC reference week number, to which t_ot is referenced' },
    ...leapSeconds('the DO-229 day numbering'),
    { name: 'UTC_std', type: 'uint8', description: 'UTC standard identifier: which laboratory realisation of UTC the offset refers to' },
    { name: 'GPS_WN', type: 'uint16', units: 'weeks', description: 'GPS week number, modulo 1024' },
    { name: 'GPS_TOW', type: 'uint32', units: 's', description: 'GPS time of week' },
    { name: 'GlonassID', type: 'uint8', description: 'GLONASS indicator' },
  ]],
  decoders: { ...satelliteDecoders, UTC_std: (value) => label(UTC_STANDARD, value) },
}

/* GEOAlm -> Number: 5897 => MT17: SBAS satellite almanac
  Refer to section A.4.4.12 of the DO-229 standard.

  PRN u1, Reserved0 u1, DataID u1, Reserved1 u1, Health u2, t_oa u4 (1 s),
  Xg/Yg/Zg f8 (1 m), Xgd/Ygd/Zgd f8 (1 m/s)

  Position and velocity but NO acceleration — the almanac is the coarse form of
  GEONav's state vector, exactly as a Keplerian almanac is the coarse form of an
  ephemeris. `t_oa` is documented as "the time in the day with the day ambiguity
  resolved".

  This is also the message ChannelStatus refers to: the 2-bit SBAS health there "is
  set from the almanac data (MT17)", i.e. from THIS block's `Health` field.
*/
export const geoAlm: BlockDefinition = {
  name: 'GEOAlm',
  number: 5897,
  description: 'SBAS MT17 satellite almanac — the coarse state vector (position and velocity, no acceleration) and the health bits ChannelStatus reports for SBAS',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('whose almanac this is'),
    reserved('Reserved0'),
    { name: 'DataID', type: 'uint8', description: 'Data ID' },
    reserved('Reserved1'),
    { name: 'Health', type: 'uint16', description: 'Health bits; this is the source of the 2-bit SBAS health that ChannelStatus reports' },
    { name: 't_oa', type: 'uint32', units: 's', description: 'Time of applicability, as a time of day with the day ambiguity resolved' },
    ...['X', 'Y', 'Z'].map((axis) => ({ name: `${axis}g`, type: 'float64' as const, units: 'm', description: `${axis} position at t_oa` })),
    ...['X', 'Y', 'Z'].map((axis) => ({ name: `${axis}gd`, type: 'float64' as const, units: 'm/s', description: `${axis} velocity at t_oa` })),
  ]],
  decoders: satelliteDecoders,
}

/* GEOIGPMask -> Number: 5931 => MT18: Ionospheric grid point mask
  Refer to section A.4.4.9 of the DO-229 standard.

  PRN u1, NbrBands u1, BandNbr u1, IODI u1, NbrIGPs u1, IGPMask u1[NbrIGPs]

  The ionospheric counterpart of GEOPRNMask: IGPMask[0] is the first grid point
  designated in the mask (1 to 201), and GEOIonoDelay's `IGPMaskNo` indexes it. The
  mask is broadcast PER BAND, so `BandNbr` is part of the identity of a grid point —
  a slot number alone does not locate one.
*/
export const geoIGPMask: BlockDefinition = {
  name: 'GEOIGPMask',
  number: 5931,
  description: 'SBAS MT18 ionospheric grid point mask for one band — the numbered list GEOIonoDelay indexes',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('the message was received from'),
    { name: 'NbrBands', type: 'uint8', description: 'Number of bands being broadcast' },
    { name: 'BandNbr', type: 'uint8', description: 'Band number this mask applies to; a grid-point slot is only located in combination with it' },
    iodi(),
    { name: 'NbrIGPs', type: 'uint8', description: 'Number of ionospheric grid points designated in the mask' },
    {
      name: 'IGPMask',
      count: 'NbrIGPs',
      fields: [{ name: 'MaskIGP', type: 'uint8', description: 'An ionospheric grid point designated in the mask, from 1 to 201, in mask order' }],
      description: 'The grid points in the mask, in order: the first entry is mask slot 1',
    },
  ]],
  decoders: satelliteDecoders,
  payloadMetadata: ({ NbrIGPs, BandNbr, IODI }) =>
    (typeof NbrIGPs === 'number') ? { mask: { gridPoints: NbrIGPs, band: BandNbr ?? null, issueOfData: IODI ?? null } } : {},
}

/* GEOLongTermCorr -> Number: 5932 => MT24/25: Long term satellite error corrections
  Refer to section A.4.4.7 of the DO-229 standard.

  PRN u1, N u1, SBLength u1, Reserved u1[3], then N x LTCorr:
    VelocityCode u1, PRNMaskNo u1, IODP u1, IODE u1,
    dx/dy/dz f4 (1 m), dxRate/dyRate/dzRate f4 (1 m/s),
    da_f0 f4 (1 s), da_f1 f4 (1 s/s), t_oe u4 (1 s)

  `VelocityCode` DECIDES WHETHER HALF THE SUB-BLOCK MEANS ANYTHING. The datasheet
  says dxRate/dyRate/dzRate are "0.0 if VelocityCode is 0", da_f1 likewise, and
  `t_oe` is "0 if VelocityCode is 0" — so with code 0 those zeros are ABSENT VALUES,
  not measurements of zero drift. Reported as such in the sub-block metadata, which
  is the honest reading and the one a consumer will otherwise get wrong.
*/
export const geoLongTermCorr: BlockDefinition = {
  name: 'GEOLongTermCorr',
  number: 5932,
  description: 'SBAS MT24/25 long-term satellite orbit and clock corrections; with VelocityCode 0 the rate fields are absent rather than zero',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('the message was received from'),
    ...subBlockHeader('N', 'LTCorr'),
    reserved('Reserved', 3),
    {
      name: 'LTCorr',
      count: 'N',
      length: 'SBLength',
      fields: [
        { name: 'VelocityCode', type: 'uint8', description: 'Velocity code, 0 or 1; when 0 the rate fields and t_oe of this sub-block carry no value' },
        slotNumber('PRNMaskNo', 'from 1 to 51', 'MT01 PRN mask'),
        iodp(),
        { name: 'IODE', type: 'uint8', description: 'Issue of data, ephemeris' },
        ...['x', 'y', 'z'].map((axis) => ({ name: `d${axis}`, type: 'float32' as const, units: 'm', description: `Satellite position offset (${axis})` })),
        ...['x', 'y', 'z'].map((axis) => ({ name: `d${axis}Rate`, type: 'float32' as const, units: 'm/s', description: `Satellite velocity offset (${axis}); 0.0 and meaningless when VelocityCode is 0` })),
        { name: 'da_f0', type: 'float32', units: 's', description: 'Satellite clock offset' },
        { name: 'da_f1', type: 'float32', units: 's/s', description: 'Satellite drift correction; 0.0 and meaningless when VelocityCode is 0' },
        { name: 't_oe', type: 'uint32', units: 's', description: 'Time of day of applicability; 0 and meaningless when VelocityCode is 0' },
      ],
      decoders: {
        // The one flag in the sub-block that changes how the rest is read.
        VelocityCode: (value) => ({ ratesPresent: value === 1 }),
      },
      description: 'A succession of N LTCorr sub-blocks, each a long-term correction for one PRN mask slot',
    },
  ]],
  decoders: satelliteDecoders,
}

/* GEOIonoDelay -> Number: 5933 => MT26: Ionospheric delay corrections
  Refer to section A.4.4.10 of the DO-229 standard.

  PRN u1, BandNbr u1, IODI u1, N u1, SBLength u1, Reserved u1, then N x IDC:
    IGPMaskNo u1, GIVEI u1, Reserved u1[2], VerticalDelay f4 (1 m)

  `GIVEI` is the Grid Ionospheric Vertical Error Indicator (0 to 15) — the
  ionospheric counterpart of UDREI, and like it, 14 means "not monitored" and 15
  "do not use" rather than an accuracy.
*/
const GIVEI_METRES: Readonly<Record<number, number | undefined>> = {
  0: 0.3, 1: 0.6, 2: 0.9, 3: 1.2, 4: 1.5, 5: 1.8, 6: 2.1, 7: 2.4,
  8: 2.7, 9: 3, 10: 3.6, 11: 4.5, 12: 6, 13: 15, 14: 45,
}

const GIVEI_STATE: Readonly<Record<number, string | undefined>> = { 15: 'DO_NOT_USE' }

export const geoIonoDelay: BlockDefinition = {
  name: 'GEOIonoDelay',
  number: 5933,
  description: 'SBAS MT26 ionospheric vertical delay corrections and their GIVE integrity bounds, for the grid points of one band',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('the message was received from'),
    { name: 'BandNbr', type: 'uint8', description: 'Band number these grid points belong to' },
    iodi(),
    ...subBlockHeader('N', 'IDC'),
    reserved('Reserved'),
    {
      name: 'IDC',
      count: 'N',
      length: 'SBLength',
      fields: [
        slotNumber('IGPMaskNo', 'from 1 to 201', 'MT18 IGP mask'),
        { name: 'GIVEI', type: 'uint8', description: 'Grid Ionospheric Vertical Error Indicator, 0 to 15' },
        reserved('Reserved', 2),
        { name: 'VerticalDelay', type: 'float32', units: 'm', description: 'Vertical ionospheric delay estimate at this grid point' },
      ],
      description: 'A succession of N ionospheric delay corrections, one per grid point',
    },
  ]],
  decoders: {
    ...satelliteDecoders,
    GIVEI: (value) => {
      const state = GIVEI_STATE[value]
      if (state !== undefined) return { index: value, label: state }
      const sigma = GIVEI_METRES[value]
      return (sigma === undefined) ? { index: value } : { index: value, sigmaGIVE: { value: sigma, units: 'm' } }
    },
  },
}

/* GEOServiceLevel -> Number: 5917 => MT27: SBAS Service Message
  Refer to section A.4.4.13 of the DO-229 standard.

  PRN u1, Reserved u1, IODS u1, nrMessages u1, MessageNR u1, PriorityCode u1,
  dUDREI_In u1, dUDREI_Out u1, N u1, SBLength u1, then N x ServiceRegion:
    Latitude1 i1 (1 deg), Latitude2 i1 (1 deg), Longitude1 i2 (1 deg),
    Longitude2 i2 (1 deg), RegionShape u1 (0 triangular, 1 square)

  MT27 defines GEOGRAPHIC REGIONS and a different UDRE correction inside and
  outside them — `dUDREI_In` versus `dUDREI_Out`. So a receiver's integrity bound
  depends on where it is, and the region geometry here is what decides which
  applies. `RegionShape` matters for that: two corner points describe a square or a
  triangle, and the datasheet gives no third point, so the shape flag is the only
  thing distinguishing them.

  Note the latitudes are i1 and the longitudes i2 — the asymmetry is real (±90 fits
  a byte, ±180 does not).
*/
export const geoServiceLevel: BlockDefinition = {
  name: 'GEOServiceLevel',
  number: 5917,
  description: 'SBAS MT27 service message — the geographic regions and the different UDRE corrections that apply inside and outside them',
  timestamp: 'sis',
  revisions: [[
    sbasPRN('this service level message was received from'),
    reserved('Reserved'),
    { name: 'IODS', type: 'uint8', description: 'Issue of data, service level, 0 to 7' },
    { name: 'nrMessages', type: 'uint8', description: 'Number of MT27 service messages in the set, 1 to 8' },
    { name: 'MessageNR', type: 'uint8', description: 'Which service message this is, 1 to 8' },
    { name: 'PriorityCode', type: 'uint8', description: 'Priority code, 0 to 3; a higher-priority message overrides a lower one for overlapping regions' },
    { name: 'dUDREI_In', type: 'uint8', description: 'Delta UDRE indicator for users INSIDE the service region, 0 to 15' },
    { name: 'dUDREI_Out', type: 'uint8', description: 'Delta UDRE indicator for users OUTSIDE the service region, 0 to 15' },
    ...subBlockHeader('N', 'ServiceRegion'),
    {
      name: 'Regions',
      count: 'N',
      length: 'SBLength',
      fields: [
        { name: 'Latitude1', type: 'int8', units: 'deg', description: 'Latitude of corner 1, -90 to 90' },
        { name: 'Latitude2', type: 'int8', units: 'deg', description: 'Latitude of corner 2, -90 to 90' },
        { name: 'Longitude1', type: 'int16', units: 'deg', description: 'Longitude of corner 1, -180 to 180' },
        { name: 'Longitude2', type: 'int16', units: 'deg', description: 'Longitude of corner 2, -180 to 180' },
        { name: 'RegionShape', type: 'uint8', description: 'Region shape: 0 triangular, 1 square — the only thing distinguishing them, since only two corners are given' },
      ],
      decoders: {
        RegionShape: (value) => ({ label: (value === 1) ? 'SQUARE' : 'TRIANGULAR' }),
      },
      description: 'A succession of N service regions, 0 to 7 of them',
    },
  ]],
  decoders: satelliteDecoders,
}

/* GEOClockEphCovMatrix -> Number: 5934 => MT28: Clock-Ephemeris Covariance Matrix
  Refer to section A.4.4.14 of the DO-229 standard.

  PRN u1, IODP u1, N u1, SBLength u1, Reserved u1[2], then N x CovMatrix:
    PRNMaskNo u1, Reserved u1[2], ScaleExp u1,
    E11 u2, E22 u2, E33 u2, E44 u2, E12 i2, E13 i2, E14 i2, E23 i2, E24 i2, E34 i2

  A 4x4 SYMMETRIC matrix in the same diagonal-then-upper-triangle order the §4.2.9
  covariance blocks use — but NOT interchangeable with them. The elements here are
  the Cholesky factor E of the inverse covariance, SCALED: the datasheet gives
  `ScaleExp` with "scale factor = 2^(scale exponent - 5)", so a consumer must apply
  it to every element. Hence the decoder publishes the scale factor itself rather
  than leaving a bare exponent, and the diagonal is u2 while the off-diagonal is i2
  (a variance cannot be negative, a covariance can).
*/
const SCALE_EXPONENT_BIAS = 5

const covarianceElement = (name: string, type: 'int16' | 'uint16', description: string): FieldDefinition =>
  ({ name, type, description })

export const geoClockEphCovMatrix: BlockDefinition = {
  name: 'GEOClockEphCovMatrix',
  number: 5934,
  description: 'SBAS MT28 clock-ephemeris covariance matrices — the scaled Cholesky factor of the inverse covariance, one per PRN mask slot',
  timestamp: 'sis',
  revisions: [[
    { name: 'PRN', type: 'uint8', description: 'Satellite ID (§4.1.9)' },
    iodp(),
    ...subBlockHeader('N', 'CovMatrix'),
    reserved('Reserved', 2),
    {
      name: 'CovMatrix',
      count: 'N',
      length: 'SBLength',
      fields: [
        slotNumber('PRNMaskNo', 'from 1 to 51', 'MT01 PRN mask'),
        reserved('Reserved', 2),
        { name: 'ScaleExp', type: 'uint8', description: 'Scale exponent; the scale factor to apply to every element below is 2^(ScaleExp - 5)' },
        covarianceElement('E11', 'uint16', 'Element E(1,1) of the Cholesky factor — a diagonal term, so unsigned'),
        covarianceElement('E22', 'uint16', 'Element E(2,2) of the Cholesky factor'),
        covarianceElement('E33', 'uint16', 'Element E(3,3) of the Cholesky factor'),
        covarianceElement('E44', 'uint16', 'Element E(4,4) of the Cholesky factor'),
        covarianceElement('E12', 'int16', 'Element E(1,2) of the Cholesky factor — off-diagonal, so signed'),
        covarianceElement('E13', 'int16', 'Element E(1,3) of the Cholesky factor'),
        covarianceElement('E14', 'int16', 'Element E(1,4) of the Cholesky factor'),
        covarianceElement('E23', 'int16', 'Element E(2,3) of the Cholesky factor'),
        covarianceElement('E24', 'int16', 'Element E(2,4) of the Cholesky factor'),
        covarianceElement('E34', 'int16', 'Element E(3,4) of the Cholesky factor'),
      ],
      decoders: {
        // Every element in this sub-block is meaningless until multiplied by this.
        ScaleExp: (value) => ({ exponent: value, scaleFactor: 2 ** (value - SCALE_EXPONENT_BIAS) }),
      },
      description: 'A succession of N covariance matrices, one per PRN mask slot',
    },
  ]],
  decoders: satelliteDecoders,
}
