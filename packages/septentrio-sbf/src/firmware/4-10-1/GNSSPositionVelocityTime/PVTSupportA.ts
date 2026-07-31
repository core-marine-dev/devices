// coded
import type { BlockDefinition } from '../../../types'

/* PVTSupportA -> Number: 4079 => "OnChange" interval: default PVT output rate
  This block contains various internal parameters that can be used for
  maintenance and support.

  The detailed definition of this block is not available.

  PVTSupportA -------------------------------------------------------------
  UNKNOWN

  Opaque body, exactly like PVTSupport — see the note there.
*/
export const pvtSupportA: BlockDefinition = {
  name: 'PVTSupportA',
  number: 4079,
  description: 'Internal parameters for maintenance and support; Septentrio publishes no field definition',
  timestamp: 'receiver',
  revisions: [[]],
  opaque: true,
}
