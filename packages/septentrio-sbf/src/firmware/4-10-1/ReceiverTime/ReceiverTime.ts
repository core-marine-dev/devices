// coded
import { DO_NOT_USE_DELTA_LS } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bitState } from '../../../utils'

/* ReceiverTime -> Number: 5914 => "OnChange" interval: 1 second
  The ReceiverTime block provides the current time with a 1-second resolution
  in the receiver time scale and UTC.

  The level of synchronization of the receiver time with the satellite system
  time is provided in the SyncLevel field.

  UTC time is provided if the UTC parameters have been received from at least
  one GNSS satellite. If the UTC time is not available, the corresponding
  fields are set to their Do-Not-Use value.

  ReceiverTime ----------------------------------------------------------------
  Block fields   Type   Units  Do-Not-Use  Description
  UTCYear        int8    year        -128  Current year in the UTC time scale (2 digits). From 0 to 99, or -128 if not available
  UTCMonth       int8   month        -128  Current month in the UTC time scale. From 1 to 12, or -128 if not available
  UTCDay         int8     day        -128  Current day in the UTC time scale. From 1 to 31, or -128 if not available
  UTCHour        int8    hour        -128  Current hour in the UTC time scale. From 0 to 23, or -128 if not available
  UTCMin         int8  minute        -128  Current minute in the UTC time scale. From 0 to 59, or -128 if not available
  UTCSec         int8  second        -128  Current second in the UTC time scale. From 0 to 59, or -128 if not available
  DeltaLS        int8  second        -128  Integer second difference between UTC time and GPS system time.
                                           Positive if GPS time is ahead of UTC. Set to -128 if not available.
  SyncLevel     uint8                      Bit field indicating the synchronization level of the receiver time.
                                           If bits 0 to 2 are set, full synchronization is achieved:
                                             Bit 0: WNSET:    if this bit is set, the receiver week number is set.
                                             Bit 1: TOWSET:   if this bit is set, the receiver time-of-week is set to within 20 ms.
                                             Bit 2: FINETIME: if this bit is set, the receiver time-of-week is within the limit
                                                              specified by the setClockSyncThreshold command.
                                             Bit 3: Reserved
                                             Bit 4: Reserved
                                             Bits 5-7: Reserved
  Padding        uint                      Padding bytes

  ⭐ THIS BLOCK IS SPECIAL: `DeltaLS` is the receiver's own GPS-UTC offset, so
  the parser LEARNS the leap seconds from it (see protocol-sbf.ts) instead of
  trusting a hardcoded table that will eventually go stale. The device is the
  authority on its own clock.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'UTCYear', type: 'int8', units: 'year', doNotUse: -128, description: 'Current year in the UTC time scale, 2 digits (0-99)' },
  { name: 'UTCMonth', type: 'int8', units: 'month', doNotUse: -128, description: 'Current month in the UTC time scale (1-12)' },
  { name: 'UTCDay', type: 'int8', units: 'day', doNotUse: -128, description: 'Current day in the UTC time scale (1-31)' },
  { name: 'UTCHour', type: 'int8', units: 'hour', doNotUse: -128, description: 'Current hour in the UTC time scale (0-23)' },
  { name: 'UTCMin', type: 'int8', units: 'minute', doNotUse: -128, description: 'Current minute in the UTC time scale (0-59)' },
  { name: 'UTCSec', type: 'int8', units: 'second', doNotUse: -128, description: 'Current second in the UTC time scale (0-59)' },
  { name: 'DeltaLS', type: 'int8', units: 's', doNotUse: DO_NOT_USE_DELTA_LS, description: 'Integer second difference between UTC and GPS system time; positive when GPS time is ahead of UTC' },
  { name: 'SyncLevel', type: 'uint8', description: 'Bit field: bit 0 WNSET (week number set), bit 1 TOWSET (time-of-week set within 20 ms), bit 2 FINETIME (within the setClockSyncThreshold limit). All three set means full synchronization' },
]

export const SYNCHRONIZATION = {
  FULL: 'FULL',
  NONE: 'NONE',
  PARTIAL: 'PARTIAL',
} as const

export type Synchronization = typeof SYNCHRONIZATION[keyof typeof SYNCHRONIZATION]

const synchronization = (wnSet: boolean, towSet: boolean, fineTime: boolean): Synchronization => {
  if (wnSet && towSet && fineTime) return SYNCHRONIZATION.FULL
  if (!wnSet && !towSet && !fineTime) return SYNCHRONIZATION.NONE
  return SYNCHRONIZATION.PARTIAL
}

const decoders: Readonly<Record<string, Decoder>> = {
  SyncLevel: (value) => {
    const wnSet = bitState(value, 0)
    const towSet = bitState(value, 1)
    const fineTime = bitState(value, 2)
    return { synchronization: synchronization(wnSet, towSet, fineTime), wnSet, towSet, fineTime }
  },
}

export const receiverTime: BlockDefinition = {
  name: 'ReceiverTime',
  number: 5914,
  description: 'Current time with 1-second resolution in the receiver time scale and in UTC, plus the synchronization level',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
  // The six UTC fields only mean something together, and this is the value the
  // whole timestamp chain is verified against: it is the receiver stating, in
  // UTC, the instant its own TOW/WNc refers to.
  payloadMetadata: (values) => {
    const parts = ['UTCYear', 'UTCMonth', 'UTCDay', 'UTCHour', 'UTCMin', 'UTCSec']
    if (parts.some((name) => typeof values[name] !== 'number')) return {}
    const [year, month, day, hour, minute, second] = parts.map((name) => values[name] as number)
    return { utc: { timestamp: Date.UTC(2000 + year, month - 1, day, hour, minute, second) } }
  },
}
