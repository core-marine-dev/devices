// coded
import { attCovEuler } from './AttCovEuler'
import { attEuler } from './AttEuler'
import { auxAntPositions } from './AuxAntPositions'
import { endOfAtt } from './EndOfAtt'

import type { BlockDefinition } from '../../../types'

// §4.2.10 GNSS Attitude Blocks — complete for firmware 4.10.1.
export const blocks: readonly BlockDefinition[] = [
  attEuler,
  attCovEuler,
  auxAntPositions,
  endOfAtt,
]
