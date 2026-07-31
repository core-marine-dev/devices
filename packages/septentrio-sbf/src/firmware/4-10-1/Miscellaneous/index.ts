// coded
import { asciiIn } from './ASCIIIn'
import { bbSamples } from './BBSamples'
import { commands } from './Commands'
import { comment } from './Comment'
import { encapsulatedOutput } from './EncapsulatedOutput'
import { receiverSetup } from './ReceiverSetup'
import { rxMessage } from './RxMessage'

import type { BlockDefinition } from '../../../types'

// §4.2.16 Miscellaneous Blocks.
//
// COMPLETE for firmware 4.10.1: all 7 blocks of §4.2.16 are modelled.
export const blocks: readonly BlockDefinition[] = [
  receiverSetup,
  rxMessage,
  commands,
  comment,
  bbSamples,
  asciiIn,
  encapsulatedOutput,
]
