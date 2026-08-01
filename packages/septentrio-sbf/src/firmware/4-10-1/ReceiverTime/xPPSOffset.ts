// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label, scaled } from '../../../utils'

/* xPPSOffset -> Number: 5911 => "OnChange" interval: PPS rate
  The xPPSOffset block contains the offset between the true xPPS pulse and
  the actual pulse output by the receiver. It is output right after each xPPS pulse.

  On receivers with more than one independent PPS output, this block always
  refers to the first PPS output.

  xPPSOffset ----------------------------------------------------------------
  Block fields  Type        Units  Do-Not-Use  Description
  SyncAge      uint8          sec              Age of the last synchronization to system time.
                                               The xPPS pulse is regularly resynchronized with system time.
                                               This field indicates the number of seconds elapsed since the last
                                               resynchronization. SyncAge is constrained to the 0-255 s range;
                                               if the age is higher than 255 s, SyncAge is set to 255.
                                               If the PPS is synchronized with the internal receiver time
                                               (TimeScale = 3), SyncAge is always set to 0.
  TimeScale    uint8                           Time scale to which the xPPS pulse is referenced, as set with the
                                               setPPSParameters command:
                                                 1: GPS time
                                                 2: UTC
                                                 3: Receiver time
                                                 4: GLONASS time
                                                 5: Galileo time
                                                 6: BeiDou time
  Offset     float32  1*10^-9 sec              Offset of the xPPS output by the receiver with respect to its true
                                               position. Offset is negative when the xPPS pulse is in advance with
                                               respect to its true position.
  Padding       uint                           Padding bytes

  Note on SyncAge: the datasheet says the RECEIVER already sets it to 0 when the
  time scale is Receiver. The 1.x parser overwrote the field with 0 itself in
  that case — a parser inventing data. Whatever the receiver sent is what is
  reported here.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'SyncAge', type: 'uint8', units: 's', description: 'Seconds since the last resynchronization of the xPPS pulse to system time, clipped to 255. Always 0 when TimeScale is Receiver time' },
  { name: 'TimeScale', type: 'uint8', description: 'Time scale the xPPS pulse is referenced to, as set with setPPSParameters' },
  { name: 'Offset', type: 'float32', units: '1e-9 s', description: 'Offset of the xPPS output with respect to its true position; negative when the pulse is in advance' },
]

export const TIME_SCALE: Readonly<Record<number, string>> = {
  1: 'GPS',
  2: 'UTC',
  3: 'RECEIVER',
  4: 'GLONASS',
  5: 'Galileo',
  6: 'BeiDou',
}

const NANOSECONDS_PER_SECOND = 1_000_000_000

const decoders: Readonly<Record<string, Decoder>> = {
  TimeScale: (value) => label(TIME_SCALE, value),
  Offset: (value) => scaled(value, NANOSECONDS_PER_SECOND, 's'),
}

export const xPPSOffset: BlockDefinition = {
  name: 'xPPSOffset',
  number: 5911,
  description: 'Offset between the true xPPS pulse and the pulse actually output by the receiver',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
