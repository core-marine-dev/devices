// installed
import type { Value } from '@coremarine/protocol-core'

// coded
import { GPS_TOW, TIME_STAMP } from './shared'

import type { Decoder, FieldDefinition, LogDefinition } from '../../types'
import { bitState, enumBits } from '../../utils'

/* SBG_ECOM_LOG_UTC_TIME (02) — §2.3.3.2 "UTC and GPS Time"

  Field         Unit   Format  Size  Offset  Description
  TIME_STAMP    µs     uint32     4       0  Time since sensor is powered up
  CLOCK_STATUS  -      uint16     2       4  General UTC time and clock sync status
  YEAR          year   uint16     2       6  Year
  MONTH         month  uint8      1       8  Month in year [1 … 12]
  DAY           d      uint8      1       9  Day in month [1 … 31]
  HOUR          h      uint8      1      10  Hour in day [0 … 23]
  MIN           min    uint8      1      11  Minute in hour [0 … 59]
  SEC           s      uint8      1      12  Second in minute [0 … 60] — 60 on a leap second
  NANOSEC       ns     uint32     4      13  Nanosecond of second
  GPS_TOW       ms     uint32     4      17  GPS time of week
                              Total size 21    <- MEASURED: LEN 21 in the corpus

  ⭐ THIS IS THE LOG THAT TURNS UPTIME INTO A CLOCK. The datasheet says it
  outright: "This frame also provides a time correspondence between the device
  TIME_STAMP value and the actual UTC Time. You thus have to use this frame if you
  would like to time stamp all data to an absolute UTC or GPS time reference."

  SBGParser learns that correspondence and applies it to every later log — see
  `learnClock` in src/parser.ts and decision D6 in docs/STATUS.md. It is the exact
  counterpart of septentrio learning its GPS-UTC offset from ReceiverTime.
*/

export const CLOCK_STATUSES: Readonly<Record<number, string>> = {
  0: 'SBG_ECOM_CLOCK_ERROR',
  1: 'SBG_ECOM_CLOCK_FREE_RUNNING',
  // ⚠️ The 0.0.x parser spelled this SBG_ECOM_CLOCK_STEERINGA. §2.3.3.2 Table 37
  // has no trailing A.
  2: 'SBG_ECOM_CLOCK_STEERING',
  3: 'SBG_ECOM_CLOCK_VALID',
}

export const UTC_STATUSES: Readonly<Record<number, string>> = {
  0: 'SBG_ECOM_UTC_INVALID',
  1: 'SBG_ECOM_UTC_NO_LEAP_SEC',
  2: 'SBG_ECOM_UTC_VALID',
}

// §2.3.3.2 CLOCK_STATUS: a mask bit, a 4-bit enum at 1-4, a mask bit, a 4-bit
// enum at 6-9.
const clockStatus: Decoder = (value) => ({
  stableInput: bitState(value, 0),
  clock: enumBits(CLOCK_STATUSES, value, 1, 4).label,
  utcSynchronised: bitState(value, 5),
  utc: enumBits(UTC_STATUSES, value, 6, 9).label,
})

// Whether the device's UTC is good enough to time-stamp other logs with. Anything
// short of SBG_ECOM_UTC_VALID means the device is propagating a guess internally,
// and a guessed clock is worse than an honest absence.
export const utcIsValid = (clock: number): boolean =>
  UTC_STATUSES[(clock >>> 6) & 0b1111] === 'SBG_ECOM_UTC_VALID'

const FIELDS: readonly FieldDefinition[] = [
  TIME_STAMP,
  { name: 'CLOCK_STATUS', type: 'uint16', description: 'Clock stability, error and synchronisation: stable input, the internal clock estimation status (bits 1-4), PPS sync, and UTC validity (bits 6-9)' },
  { name: 'YEAR', type: 'uint16', units: 'year' },
  { name: 'MONTH', type: 'uint8', units: 'month', description: 'Month in year, 1 to 12' },
  { name: 'DAY', type: 'uint8', units: 'd', description: 'Day in month, 1 to 31' },
  { name: 'HOUR', type: 'uint8', units: 'h', description: 'Hour in day, 0 to 23' },
  { name: 'MIN', type: 'uint8', units: 'min', description: 'Minute in hour, 0 to 59' },
  { name: 'SEC', type: 'uint8', units: 's', description: 'Second in minute, 0 to 60 — 60 occurs when a leap second is added' },
  { name: 'NANOSEC', type: 'uint32', units: 'ns', description: 'Nanosecond of second' },
  GPS_TOW,
]

/* The UTC instant as a Unix epoch in ms, or undefined when the device says its UTC
   is not valid. Aggregated from EIGHT fields, so it belongs at payload level
   (docs/CMA.md §"Metadata levels").

   Date.UTC, not a Date constructor: the fields ARE UTC, and a local-time
   interpretation would silently shift the value by the host's offset. The
   nanoseconds are floored to whole milliseconds — CMA timestamps are epoch ms —
   and the sub-millisecond remainder stays visible in the NANOSEC field. */
export const utcEpoch = (values: Readonly<Record<string, Value>>): number | undefined => {
  const clock = values.CLOCK_STATUS
  if (typeof clock !== 'number' || !utcIsValid(clock)) return undefined
  const parts = ['YEAR', 'MONTH', 'DAY', 'HOUR', 'MIN', 'SEC', 'NANOSEC'].map((key) => values[key])
  if (parts.some((part) => typeof part !== 'number')) return undefined
  const [year, month, day, hour, minute, second, nanosecond] = parts as number[]
  // SEC is 60 on a leap second, which Date.UTC rolls into the next minute. That
  // is the only sane epoch for a leap second, since Unix time has no room for it.
  return Date.UTC(year, month - 1, day, hour, minute, second, Math.floor(nanosecond / 1e6))
}

export const utcTime: LogDefinition = {
  name: 'SBG_ECOM_LOG_UTC_TIME',
  message: 2,
  description: 'UTC time reference, and the correspondence between the device uptime counter and absolute UTC — the log that lets every other log be time-stamped',
  fields: FIELDS,
  decoders: { CLOCK_STATUS: clockStatus },
  payloadMetadata: (values) => {
    const utc = utcEpoch(values)
    return (utc === undefined) ? {} : { utc: { value: utc, units: 'ms', description: 'The UTC instant as a Unix epoch in milliseconds, assembled from YEAR..NANOSEC. Present only when CLOCK_STATUS reports SBG_ECOM_UTC_VALID.' } }
  },
}
