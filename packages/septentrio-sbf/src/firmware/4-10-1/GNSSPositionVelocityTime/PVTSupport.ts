// coded
import type { BlockDefinition } from '../../../types'

/* PVTSupport -> Number: 4076 => "OnChange" interval: default PVT output rate
  This block contains various internal parameters that can be used for
  maintenance and support.

  The detailed definition of this block is not available.

  PVTSupport -------------------------------------------------------------
  UNKNOWN

  Septentrio publishes no field layout, so there is nothing to decode and
  inventing one would be a guess presented as data. The body is published as
  OPAQUE bytes at metadata.body ({ raw, bytes }) — not as padding, which it is
  not, and not as a payload field, because we cannot name or type it. The whole
  frame is in cma.raw either way, so nothing is lost: a Septentrio support
  engineer with the real definition can decode it from the output.

  (Same call as thelmabiotel-tblive's emitter `data` field: when the meaning of
  bytes belongs to someone else, publish the bytes and stop.)
*/
export const pvtSupport: BlockDefinition = {
  name: 'PVTSupport',
  number: 4076,
  description: 'Internal parameters for maintenance and support; Septentrio publishes no field definition',
  timestamp: 'receiver',
  revisions: [[]],
  opaque: true,
}
