// coded
import type { BlockDefinition } from '../../../types'

/* EndOfPVT -> Number: 5921 => "OnChange" interval: default PVT output rate
  This block marks the end of transmission of all PVT related blocks
  belonging to the same epoch.

  EndOfPVT -------------------------------------------------------------
  Block fields           Type    Units Do-Not-Use  Description
  Padding                uint                      Padding bytes

  Body is padding only — see EndOfAtt for why that means an empty payload.
*/
export const endOfPVT: BlockDefinition = {
  name: 'EndOfPVT',
  number: 5921,
  description: 'Marks the end of transmission of all PVT blocks belonging to the same epoch',
  timestamp: 'receiver',
  revisions: [[]],
}
