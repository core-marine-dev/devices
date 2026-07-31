// coded
import { receiverTime } from './ReceiverTime'
import { xPPSOffset } from './xPPSOffset'

import type { BlockDefinition } from '../../../types'

// §4.2.11 Receiver Time Blocks — complete for firmware 4.10.1.
export const blocks: readonly BlockDefinition[] = [
  receiverTime,
  xPPSOffset,
]
