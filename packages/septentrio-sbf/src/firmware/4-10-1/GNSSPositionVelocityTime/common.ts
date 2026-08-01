// coded
import type { Decoder } from '../../../types'
import { bits, bitState, label, UNKNOWN_LABEL } from '../../../utils'

// The Mode and Error fields are defined identically in several PVT blocks
// (PVTCartesian, PVTGeodetic, PosCovGeodetic, PosLocal, BaseVectorGeod…), so
// they are decoded from one place: a change to the datasheet's list of PVT
// solution types must not have to be applied in six files.

export const PVT_SOLUTION: Readonly<Record<number, string>> = {
  0: 'NO_PVT',
  1: 'STANDALONE',
  2: 'DIFFERENTIAL',
  3: 'FIXED_LOCATION',
  4: 'RTK_FIXED',
  5: 'RTK_FLOAT',
  6: 'SBAS',
  7: 'MOVING_BASE_RTK_FIXED',
  8: 'MOVING_BASE_RTK_FLOAT',
  10: 'PPP',
  12: 'RESERVED',
}

export const PVT_ERROR: Readonly<Record<number, string>> = {
  0: 'NO_ERROR',
  1: 'NOT_ENOUGH_MEASUREMENTS',
  2: 'NOT_ENOUGH_EPHEMERIDES',
  3: 'DOP_TOO_LARGE',
  4: 'SUM_OF_SQUARED_RESIDUALS_TOO_LARGE',
  5: 'NO_CONVERGENCE',
  6: 'NOT_ENOUGH_MEASUREMENTS_AFTER_OUTLIER_REJECTION',
  7: 'POSITION_OUTPUT_PROHIBITED_DUE_TO_EXPORT_LAWS',
  8: 'NOT_ENOUGH_DIFFERENTIAL_CORRECTIONS',
  9: 'BASE_STATION_COORDINATES_UNAVAILABLE',
  10: 'AMBIGUITIES_NOT_FIXED_AND_USER_REQUESTED_RTK_FIXED',
}

// Bits 0-3 solution type, bit 6 "still determining a static position", bit 7 2D.
export const pvtMode: Decoder = (value) => ({
  pvtSolution: PVT_SOLUTION[bits(value, 0, 3)] ?? UNKNOWN_LABEL,
  determiningFixedPosition: bitState(value, 6),
  mode2D: bitState(value, 7),
})

export const pvtError: Decoder = (value) => label(PVT_ERROR, value)

// The Misc bit field of the baseline blocks. NOT the same as PVTGeodetic's Misc,
// which uses bits 6-7 for the ARP-to-marker flag while here they are reserved —
// which is exactly why each lives next to its own block.
export const baselineMisc: Decoder = (value) => ({
  baselinePointsToBaseStationARP: bitState(value, 0),
  phaseCenterOffsetCompensated: bitState(value, 1),
})
