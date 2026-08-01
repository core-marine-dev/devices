// coded
import type { BlockDefinition, FieldDefinition } from '../../../types'

/* Commands -> Number: 4015 => "OnChange" interval: each time a user command is entered

  Every time the user sends a command, a Commands block is output on all ports for
  which this block is enabled. The Commands SBF block is inserted in the SBF
  stream at the very moment when the command starts to take effect.

  Commands -------------------------------------------------------------------
  Block fields       Type  Units Do-Not-Use  Description
  Reserved       uint8[2]                     Reserved for future use, to be ignored by decoding software
  CmdData        uint8[N]                     Command data, this is the command in the SNMP' format (reserved for
                                              maintenance and support only)
  Padding            uint                     Padding bytes

  The datasheet never defines N, so `CmdData` is modelled as the rest of the body
  (`rest: true`). It is read as text because that is what a command is, and a c1
  value stops at the first NUL — so trailing padding lands in `raw`, not in the
  value. The format itself is "reserved for maintenance and support", so the
  string is published as-is with nothing claimed about its structure.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'Reserved', type: 'uint16', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'CmdData', type: 'string', rest: true, description: 'The command as entered, in Septentrio\'s SNMP\' format — documented as reserved for maintenance and support, so no structure is claimed here' },
]

export const commands: BlockDefinition = {
  name: 'Commands',
  number: 4015,
  description: 'A command entered by the user, inserted in the stream at the moment the command takes effect',
  timestamp: 'receiver',
  revisions: [FIELDS],
}
