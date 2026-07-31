// coded
import { baseVectorCart } from './BaseVectorCart'
import { baseVectorGeod } from './BaseVectorGeod'
import { posCovCartesian, velCovCartesian, velCovGeodetic } from './covariance'
import { dop } from './DOP'
import { endOfPVT } from './EndOfPVT'
import { posLocal, posProjected } from './local'
import { posCart } from './PosCart'
import { posCovGeodetic } from './PosCovGeodetic'
import { pvtCartesian } from './PVTCartesian'
import { pvtGeodetic } from './PVTGeodetic'
import { pvtSupport } from './PVTSupport'
import { pvtSupportA } from './PVTSupportA'

import type { BlockDefinition } from '../../../types'

// §4.2.9 GNSS Position, Velocity and Time Blocks.
//
// COMPLETE for firmware 4.10.1: all 15 blocks of §4.2.9 are modelled.
export const blocks: readonly BlockDefinition[] = [
  pvtCartesian,
  pvtGeodetic,
  posCovCartesian,
  posCovGeodetic,
  velCovCartesian,
  velCovGeodetic,
  dop,
  posCart,
  posLocal,
  posProjected,
  baseVectorCart,
  baseVectorGeod,
  pvtSupport,
  pvtSupportA,
  endOfPVT,
]
