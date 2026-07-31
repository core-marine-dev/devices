// coded
import type { BlockDefinition } from '../../../types'
import { attEuler } from '../GNSSAttitude/AttEuler'
import { baseVectorGeod } from '../GNSSPositionVelocityTime/BaseVectorGeod'
import { pvtCartesian } from '../GNSSPositionVelocityTime/PVTCartesian'
import { pvtGeodetic } from '../GNSSPositionVelocityTime/PVTGeodetic'

/* The four ExtEvent VARIANTS, §4.2.12.

  Each one is, in the datasheet's own words, "the same structure and description
  as the <X> block, except that the TOW and WNc fields refer to the time at which
  the electrical transition on the event pin has been detected". The datasheet
  prints the whole table again for each; here they are the SAME definition with a
  different number, name and time-stamp kind.

  That is the point of keeping a block's layout as data: a block that is another
  block "but triggered differently" is four lines, and it cannot drift from its
  source. A hand-written decoder per block would have been four more copies of
  the same 26 fields to keep in step.

  A user needing the sub-millisecond part of the event time must refer to the
  Offset field of the corresponding ExtEvent block, which is the last ExtEvent
  block output by the receiver.
*/
const asEvent = (source: BlockDefinition, name: string, number: number, what: string): BlockDefinition => ({
  ...source,
  name,
  number,
  timestamp: 'external',
  description: `${what} at the instant of an external event on one of the receiver's Event pins — same structure as ${source.name}, with TOW and WNc referring to the event`,
})

export const extEventPVTCartesian = asEvent(pvtCartesian, 'ExtEventPVTCartesian', 4037, 'GNSS position, velocity and time in Cartesian ECEF coordinates')
export const extEventPVTGeodetic = asEvent(pvtGeodetic, 'ExtEventPVTGeodetic', 4038, 'GNSS position, velocity and time in geodetic coordinates')
export const extEventAttEuler = asEvent(attEuler, 'ExtEventAttEuler', 4237, 'GNSS attitude as Euler angles')
// 4217, NOT 4216 — the datasheet page and Appendix B agree, and a wrong number
// is invisible in a fake round trip (the fake is built from the same wrong
// number) while a real 4217 frame would silently fall through to the
// identified-but-not-modelled tier. Only Appendix B catches it.
export const extEventBaseVectGeod = asEvent(baseVectorGeod, 'ExtEventBaseVectGeod', 4217, 'ENU baseline to the base station')
