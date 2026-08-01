// coded
import { baselineMisc, pvtError, pvtMode } from './common'

import { DO_NOT_USE_FLOAT, DO_NOT_USE_UINT8, DO_NOT_USE_UINT16 } from '../../../constants'
import type { Decoder, FieldDefinition } from '../../../types'
import { bits, bitState, label, scaled, UNKNOWN_LABEL } from '../../../utils'
import { signalInfo } from '../signals'

/* The PVT SOLUTION, shared by PVTCartesian (4006) and PVTGeodetic (4007) — and,
  through them, by ExtEventPVTCartesian (4037) and ExtEventPVTGeodetic (4038).

  The datasheet prints the two tables in full, twice, and they are identical
  except for the coordinate and velocity triples: X/Y/Z + Vx/Vy/Vz in the
  Cartesian one, Latitude/Longitude/Height + Vn/Ve/Vu in the geodetic one.
  Everything from COG onwards — including both revisions — is the same, so it is
  written once here. A datasheet change to AlertFlag, or a revision 3, is then one
  edit rather than four.
*/
export const PVT_HEAD: readonly FieldDefinition[] = [
  { name: 'Mode', type: 'uint8', description: 'Bit field: bits 0-3 type of PVT solution, bit 6 set while determining a fixed position, bit 7 set in 2D mode' },
  { name: 'Error', type: 'uint8', description: 'PVT error code; 0 means no error' },
]

export const PVT_TAIL: readonly FieldDefinition[] = [
  { name: 'COG', type: 'float32', units: 'deg', doNotUse: DO_NOT_USE_FLOAT, description: 'Course over ground, 0 to 360 increasing towards East; Do-Not-Use below 0.1 m/s' },
  { name: 'RxClkBias', type: 'float64', units: 'ms', doNotUse: DO_NOT_USE_FLOAT, description: 'Receiver clock bias relative to the GNSS system time given by TimeSystem; positive when the receiver is ahead' },
  { name: 'RxClkDrift', type: 'float32', units: 'ppm', doNotUse: DO_NOT_USE_FLOAT, description: 'Receiver clock drift relative to the GNSS system time; positive when the receiver clock runs faster' },
  { name: 'TimeSystem', type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: 'Time system the reported clock offset refers to' },
  { name: 'Datum', type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: 'Datum the coordinates are expressed in' },
  { name: 'NrSV', type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: 'Total number of satellites used in the PVT computation' },
  { name: 'WACorrInfo', type: 'uint8', doNotUse: 0, description: 'Bit field: which wide-area corrections have been applied' },
  { name: 'ReferenceID', type: 'uint16', doNotUse: DO_NOT_USE_UINT16, description: 'Reference ID of the differential information used: base station identifier, or SBAS satellite PRN, or 65534 when several were used' },
  { name: 'MeanCorrAge', type: 'uint16', units: '0.01 s', doNotUse: DO_NOT_USE_UINT16, description: 'Mean age of the differential corrections (DGPS/RTK) or of the SBAS fast corrections' },
  { name: 'SignalInfo', type: 'uint32', doNotUse: 0, description: 'Bit field: signal types used in the PVT computation, bit i = signal number i (§4.1.10)' },
  { name: 'AlertFlag', type: 'uint8', doNotUse: 0, description: 'Bit field: bits 0-1 RAIM integrity flag, bit 2 Galileo HPCA integrity failed, bit 3 Galileo ionospheric storm' },
]

export const PVT_REVISION_1: readonly FieldDefinition[] = [
  { name: 'NrBases', type: 'uint8', doNotUse: 0, description: 'Number of base stations used in the PVT computation' },
  { name: 'PPPInfo', type: 'uint16', units: 's', doNotUse: 0, description: 'Bit field: bits 0-11 age of the last seed in seconds (clipped to 4091), bits 13-15 seed type' },
]

export const PVT_REVISION_2: readonly FieldDefinition[] = [
  { name: 'Latency', type: 'uint16', units: '0.0001 s', doNotUse: DO_NOT_USE_UINT16, description: 'Time between the fix time of applicability and the generation of this block, including receiver processing but not communication latency' },
  { name: 'HAccuracy', type: 'uint16', units: '0.01 m', doNotUse: DO_NOT_USE_UINT16, description: '2DRMS horizontal accuracy, 95% confidence, clipped to 655.34 m' },
  { name: 'VAccuracy', type: 'uint16', units: '0.01 m', doNotUse: DO_NOT_USE_UINT16, description: '2-sigma vertical accuracy, 95% confidence, clipped to 655.34 m' },
  { name: 'Misc', type: 'uint8', description: 'Bit field: bit 0 baseline points to the base station ARP, bit 1 phase center offset compensated, bits 6-7 whether the marker position is also the ARP position' },
]

// The three stacked revisions, given a block's own coordinate/velocity fields.
export const pvtRevisions = (position: readonly FieldDefinition[]): readonly (readonly FieldDefinition[])[] => {
  const revision0 = [...PVT_HEAD, ...position, ...PVT_TAIL]
  const revision1 = [...revision0, ...PVT_REVISION_1]
  return [revision0, revision1, [...revision1, ...PVT_REVISION_2]]
}

export const TIME_SYSTEM: Readonly<Record<number, string>> = {
  0: 'GPS',
  1: 'Galileo',
  3: 'GLONASS',
  4: 'BeiDou',
  5: 'QZSS',
}

export const DATUM: Readonly<Record<number, string>> = {
  0: 'WGS84/ITRS',
  19: 'DGNSS/RTK base station',
  30: 'ETRS89',
  31: 'NAD83(2011)',
  32: 'NAD83(PA11)',
  33: 'NAD83(MA11)',
  34: 'GDA94(2010)',
  35: 'GDA2020',
  250: 'FIRST_USER_DEFINED_DATUM',
  251: 'SECOND_USER_DEFINED_DATUM',
}

export const RAIM_INTEGRITY: Readonly<Record<number, string>> = {
  0: 'RAIM_NOT_ACTIVE',
  1: 'RAIM_SUCCESSFUL',
  2: 'RAIM_FAILED',
  3: 'RESERVED',
}

export const LAST_SEED: Readonly<Record<number, string>> = {
  0: 'NOT_SEEDED',
  1: 'MANUAL_SEED',
  2: 'DGPS_SEED',
  3: 'RTK_FIXED_SEED',
}

export const ARP_POSITION: Readonly<Record<number, string>> = {
  0: 'UNKNOWN',
  1: 'ARP_TO_MARKER_OFFSET_IS_ZERO',
  2: 'ARP_TO_MARKER_OFFSET_IS_NOT_ZERO',
}

// Everything both blocks decode identically. A block adds its own on top (the
// geodetic one converts radians to degrees; the Cartesian one has nothing to add).
export const pvtCommonDecoders: Readonly<Record<string, Decoder>> = {
  Mode: pvtMode,
  Error: pvtError,
  TimeSystem: (value) => label(TIME_SYSTEM, value),
  Datum: (value) => label(DATUM, value),
  WACorrInfo: (value) => ({
    clockCorrection: bitState(value, 0),
    rangeCorrection: bitState(value, 1),
    ionosphericInformation: bitState(value, 2),
    orbitAccuracy: bitState(value, 3),
    do229PrecisionApproach: bitState(value, 4),
  }),
  MeanCorrAge: (value) => scaled(value, 100, 's'),
  SignalInfo: (value) => ({ signals: signalInfo(value) }),
  AlertFlag: (value) => ({
    raimIntegrityFlag: RAIM_INTEGRITY[bits(value, 0, 1)] ?? UNKNOWN_LABEL,
    galileoIntegrityFailed: bitState(value, 2),
    galileoIonosphericStorm: bitState(value, 3),
  }),
  PPPInfo: (value) => ({
    ageOfLastSeed: bits(value, 0, 11),
    units: 's',
    lastSeed: LAST_SEED[bits(value, 13, 15)] ?? UNKNOWN_LABEL,
  }),
  Latency: (value) => scaled(value, 10_000, 's'),
  HAccuracy: (value) => scaled(value, 100, 'm'),
  VAccuracy: (value) => scaled(value, 100, 'm'),
  Misc: (value) => ({
    ...baselineMisc(value, {}),
    arpPosition: ARP_POSITION[bits(value, 6, 7)] ?? UNKNOWN_LABEL,
  }),
}
