// coded
import type { BlockDefinition } from '../../../types'

/* EndOfAtt -> Number: 5943 => "OnChange" interval: default PVT output rate
  This block marks the end of transmission of all GNSS-attitude related blocks
  belonging to the same epoch.

  EndOfAtt -------------------------------------------------------------
  Block fields           Type    Units Do-Not-Use  Description
  Padding                uint                      Padding bytes

  The body is padding only, so the payload is empty by design: §4.1.5 says a
  padding byte's value is undefined and must not be looked at. The 1.x parser
  published it as a field's value — and reading it is what crashed the parser
  whenever there were more than 6 of them. The bytes are still reported, as
  metadata.padding, because nothing is dropped silently.
*/
export const endOfAtt: BlockDefinition = {
  name: 'EndOfAtt',
  number: 5943,
  description: 'Marks the end of transmission of all GNSS-attitude blocks belonging to the same epoch',
  timestamp: 'receiver',
  revisions: [[]],
}
