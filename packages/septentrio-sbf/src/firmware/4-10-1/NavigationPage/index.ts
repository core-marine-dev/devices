// coded
import { bdsRaw, bdsRawB1C, bdsRawB2a } from './BeiDou'
import { galRawFNAV, galRawINAV } from './Galileo'
import { gloRawCA } from './GLONASS'
import { gpsRawCA, gpsRawL2C, gpsRawL5 } from './GPS'
import { navicRaw } from './NavIC'
import { qzsRawL1CA, qzsRawL2C, qzsRawL5 } from './QZSS'
import { geoRawL1, geoRawL5 } from './SBAS'

import type { BlockDefinition } from '../../../types'

// §4.2.2 Navigation Page Blocks.
//
// COMPLETE for firmware 4.10.1: all 15 blocks of §4.2.2 are modelled, grouped by
// constellation the way the datasheet itself orders them.
//
// These carry the RAW broadcast bits, straight off the signal; §4.2.3-4.2.8 carry
// the DECODED contents of the same broadcasts. Every one of them is stamped with
// SIS time — when the satellite transmitted the bits — so none is promoted to
// `cma.timestamp`.
export const blocks: readonly BlockDefinition[] = [
  gpsRawCA,
  gpsRawL2C,
  gpsRawL5,
  gloRawCA,
  galRawFNAV,
  galRawINAV,
  geoRawL1,
  geoRawL5,
  bdsRaw,
  bdsRawB1C,
  bdsRawB2a,
  qzsRawL1CA,
  qzsRawL2C,
  qzsRawL5,
  navicRaw,
]
