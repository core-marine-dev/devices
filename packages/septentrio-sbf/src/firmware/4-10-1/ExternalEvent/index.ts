// coded
import { extEvent } from './ExtEvent'
import { extEventAttEuler, extEventBaseVectGeod, extEventPVTCartesian, extEventPVTGeodetic } from './variants'

import type { BlockDefinition } from '../../../types'

// §4.2.12 External Event Blocks — COMPLETE for firmware 4.10.1.
export const blocks: readonly BlockDefinition[] = [
  extEvent,
  extEventPVTCartesian,
  extEventPVTGeodetic,
  extEventAttEuler,
  extEventBaseVectGeod,
]
