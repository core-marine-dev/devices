// coded
import { lBandBeams } from './LBandBeams'
import { lBandTrackerStatus } from './LBandTrackerStatus'

import type { BlockDefinition } from '../../../types'

// §4.2.14 L-Band Demodulator Blocks — COMPLETE for firmware 4.10.1.
export const blocks: readonly BlockDefinition[] = [
  lBandTrackerStatus,
  lBandBeams,
]
