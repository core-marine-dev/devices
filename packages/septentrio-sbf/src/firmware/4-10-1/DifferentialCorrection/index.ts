// coded
import { baseStation } from './BaseStation'
import { diffCorrIn } from './DiffCorrIn'
import { rtcmDatum } from './RTCMDatum'

import type { BlockDefinition } from '../../../types'

// §4.2.13 Differential Correction Blocks — COMPLETE for firmware 4.10.1.
export const blocks: readonly BlockDefinition[] = [
  diffCorrIn,
  baseStation,
  rtcmDatum,
]
