// coded
import { pvtError, pvtMode } from './common'

import { DO_NOT_USE_FLOAT } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'

/* The four VARIANCE-COVARIANCE blocks of §4.2.9 — PosCovCartesian (5905),
  PosCovGeodetic (5906), VelCovCartesian (5907) and VelCovGeodetic (5908).

  All four have the identical shape: `Mode`, `Error`, then the ten elements of a
  symmetric 4x4 matrix in the order

    ( σ²a   σab   σac   σad )      diagonal first  (aa, bb, cc, dd),
    ( σba   σ²b   σbc   σbd )      then the upper triangle row by row
    ( σca   σcb   σ²c   σcd )      (ab, ac, ad, bc, bd, cd).
    ( σda   σdb   σdc   σ²d )

  The three coordinates differ per block (x/y/z, lat/lon/hgt, Vx/Vy/Vz, Vn/Ve/Vu)
  and the fourth element is the clock bias for a position block and the clock drift
  for a velocity one.

  From the datasheet, and worth keeping in view: "the variances and covariances are
  ESTIMATED: they are not necessarily indicative of the actual scatter of the
  position estimates at a given site." And in 2D mode every height- or
  up-velocity-related component is Do-Not-Use.
*/
interface Matrix {
  // The three coordinate names, in order, as the datasheet spells them.
  axes: readonly [string, string, string]
  // The fourth quantity: 'b' clock bias (position blocks) or 'Dt' clock drift.
  fourth: string
  units: string
  // How to describe an axis in prose ('the x', 'the latitude', 'the x-velocity').
  describe: (axis: string) => string
  fourthDescription: string
}

const element = (name: string, units: string, description: string): FieldDefinition =>
  ({ name, type: 'float32', units, doNotUse: DO_NOT_USE_FLOAT, description })

// Diagonal first, then the upper triangle — the order the datasheet prints.
const matrix = ({ axes, fourth, units, describe, fourthDescription }: Matrix): readonly FieldDefinition[] => {
  const all = [...axes, fourth]
  const names = [...axes, fourth].map((axis) => (axis === fourth) ? fourthDescription : describe(axis))
  const variances = all.map((axis, index) => element(`Cov_${axis}${axis}`, units, `Variance of ${names[index]} estimate`))
  const covariances: FieldDefinition[] = []
  for (let first = 0; first < all.length; first++) {
    for (let second = first + 1; second < all.length; second++) {
      covariances.push(element(`Cov_${all[first]}${all[second]}`, units, `Covariance between ${names[first]} and ${names[second]} estimates`))
    }
  }
  return [...variances, ...covariances]
}

const decoders: Readonly<Record<string, Decoder>> = {
  Mode: pvtMode,
  Error: pvtError,
}

const covarianceBlock = (name: string, number: number, what: string, definition: Matrix): BlockDefinition => ({
  name,
  number,
  description: `Variance-covariance matrix of the ${what}, as estimated by the receiver`,
  timestamp: 'receiver',
  revisions: [[
    { name: 'Mode', type: 'uint8', description: 'Bit field: bits 0-3 type of PVT solution, bit 6 set while determining a fixed position, bit 7 set in 2D mode' },
    { name: 'Error', type: 'uint8', description: 'PVT error code; 0 means no error' },
    ...matrix(definition),
  ]],
  decoders,
})

// PosCovGeodetic (5906) is NOT generated here: the datasheet names its variances
// with `hgt` but its clock-bias covariance with `h` (`Cov_hgthgt` yet `Cov_hb`),
// so a generated name would be wrong. It stays hand-written in its own file, with
// the names exactly as printed.
export const posCovCartesian = covarianceBlock('PosCovCartesian', 5905, 'position in Cartesian ECEF coordinates (x, y, z, clock bias), in m²', {
  axes: ['x', 'y', 'z'],
  fourth: 'b',
  units: 'm²',
  describe: (axis) => `the ${axis}`,
  fourthDescription: 'the clock bias',
})

export const velCovCartesian = covarianceBlock('VelCovCartesian', 5907, 'velocity in Cartesian coordinates (Vx, Vy, Vz, clock drift), in m²/s²', {
  axes: ['Vx', 'Vy', 'Vz'],
  fourth: 'Dt',
  units: 'm²/s²',
  describe: (axis) => `the ${axis.slice(1)}-velocity`,
  fourthDescription: 'the clock drift',
})

export const velCovGeodetic = covarianceBlock('VelCovGeodetic', 5908, 'velocity in geodetic coordinates (Vn, Ve, Vu, clock drift), in m²/s²', {
  axes: ['Vn', 'Ve', 'Vu'],
  fourth: 'Dt',
  units: 'm²/s²',
  describe: (axis) => `the ${{ Vn: 'north', Ve: 'east', Vu: 'up' }[axis] ?? axis}-velocity`,
  fourthDescription: 'the clock drift',
})
