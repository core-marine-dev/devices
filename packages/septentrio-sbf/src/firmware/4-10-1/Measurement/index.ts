// coded
import { endOfMeas } from './EndOfMeas'
import { meas3CN0HiRes, meas3Doppler, meas3MP, meas3PP, meas3Ranges } from './Meas3'
import { measEpoch } from './MeasEpoch'
import { measExtra } from './MeasExtra'

import type { BlockDefinition } from '../../../types'

// §4.2.1 Measurement Blocks.
//
// COMPLETE for firmware 4.10.1: all 8 blocks of §4.2.1 are modelled — the two
// legacy observable blocks in full (MeasEpoch + MeasExtra), the five Meas3 blocks
// as opaque bodies because Septentrio publishes no layout for them, and the epoch
// marker.
//
// GNSS observables reach a consumer by one of two routes, and this category holds
// both: the legacy MeasEpoch (optionally complemented by MeasExtra), or the
// compressed Meas3Ranges (optionally complemented by Meas3Doppler and
// Meas3CN0HiRes). Only the first is decodable from published documentation.
export const blocks: readonly BlockDefinition[] = [
  measEpoch,
  measExtra,
  meas3Ranges,
  meas3CN0HiRes,
  meas3Doppler,
  meas3PP,
  meas3MP,
  endOfMeas,
]
