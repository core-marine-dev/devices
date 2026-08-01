// coded
import { TIME_STAMP } from './shared'

import type { Decoder, FieldDefinition, LogDefinition } from '../../types'
import { bitState, enumBits } from '../../utils'

/* The miscellaneous logs (§2.3.7): event markers, diagnostics and the raw RTCM
   stream. NONE of these existed in the 0.0.x parser — the nine ids here are the
   gap that made its class-0 coverage 24 of 33. A frame from any of them used to
   come out named 'unknown' with a null body. */

/* SBG_ECOM_LOG_EVENT_A (24) … EVENT_E (28), EVENT_OUT_A (45), EVENT_OUT_B (46)
   — §2.3.7.1 "Event Markers". ONE layout, seven message ids.

  TIME_STAMP µs uint32 4 @0 · EVENT_STATUS - uint16 2 @4
  TIME_OFFSET_0..3 µs uint16 2 @6/8/10/12          Total size 14

  ⚠️ THE OFFSETS ARE RELATIVE, WHICH IS THE WHOLE POINT OF THIS LOG. The device
  detects events at up to 1 kHz but emits at most one frame per 5 ms, so a frame
  reports the FIRST event's time in TIME_STAMP and up to four more as offsets
  from it:

    event 1 at TIME_STAMP
    event 2 at TIME_STAMP + TIME_OFFSET_0
    event 3 at TIME_STAMP + TIME_OFFSET_1   … and so on

  An unused offset field reads 0, which is indistinguishable from "an event that
  arrived in the same microsecond" — so the ONLY way to know how many events a
  frame really carries is EVENT_STATUS bits 1-4. That count and the absolute times
  are computed into payload metadata below, because getting this wrong means
  inventing events that never happened. */
const eventStatus: Decoder = (value) => ({
  // Set when events arrived faster than 1 kHz, i.e. some were LOST.
  overflow: bitState(value, 0),
  offset0Valid: bitState(value, 1),
  offset1Valid: bitState(value, 2),
  offset2Valid: bitState(value, 3),
  offset3Valid: bitState(value, 4),
})

const OFFSET_FIELDS = ['TIME_OFFSET_0', 'TIME_OFFSET_1', 'TIME_OFFSET_2', 'TIME_OFFSET_3']

const offsetField = (index: number): FieldDefinition => ({
  name: OFFSET_FIELDS[index],
  type: 'uint16',
  units: 'us',
  description: `Time of the ${['second', 'third', 'fourth', 'fifth'][index]} event of this 5 ms slot, as an offset FROM TIME_STAMP. Reads 0 when unused — check EVENT_STATUS bit ${index + 1}.`,
})

const EVENT_FIELDS: readonly FieldDefinition[] = [
  { ...TIME_STAMP, description: 'Time of the FIRST event received during this 5 ms slot, as an uptime since power on' },
  { name: 'EVENT_STATUS', type: 'uint16', description: 'Bit 0 signals an overflow (events arrived above 1 kHz and were lost); bits 1-4 say how many of the four time offsets are valid' },
  offsetField(0),
  offsetField(1),
  offsetField(2),
  offsetField(3),
]

// Every event in the frame as an absolute uptime, and how many there really were.
// Aggregated from six fields, so payload level (docs/CMA.md §"Metadata levels").
const eventMetadata = (values: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const base = values.TIME_STAMP
  const status = values.EVENT_STATUS
  if (typeof base !== 'number' || typeof status !== 'number') return {}
  const times = [base]
  for (const [index, name] of OFFSET_FIELDS.entries()) {
    if (!bitState(status, index + 1)) break
    const offset = values[name]
    if (typeof offset !== 'number') break
    times.push(base + offset)
  }
  return {
    events: { value: times.length, description: 'How many events this frame reports, from the EVENT_STATUS valid-offset bits' },
    eventTimes: { value: times, units: 'us', description: 'Every event in this frame as an absolute uptime: TIME_STAMP, then TIME_STAMP + each valid offset' },
  }
}

const eventLog = (name: string, message: number, pin: string, direction: string): LogDefinition => ({
  name,
  message,
  description: `Event marker: the time of each ${direction} detected on ${pin} during the last 5 ms. Up to five events per frame — the first as an absolute uptime, the rest as offsets from it.`,
  fields: EVENT_FIELDS,
  decoders: { EVENT_STATUS: eventStatus },
  payloadMetadata: eventMetadata,
})

export const eventA = eventLog('SBG_ECOM_LOG_EVENT_A', 24, 'the Sync In A pin', 'input signal')
export const eventB = eventLog('SBG_ECOM_LOG_EVENT_B', 25, 'the Sync In B pin', 'input signal')
export const eventC = eventLog('SBG_ECOM_LOG_EVENT_C', 26, 'the Sync In C pin', 'input signal')
export const eventD = eventLog('SBG_ECOM_LOG_EVENT_D', 27, 'the Sync In D pin', 'input signal')
export const eventE = eventLog('SBG_ECOM_LOG_EVENT_E', 28, 'the Sync In E pin', 'input signal')
export const eventOutA = eventLog('SBG_ECOM_LOG_EVENT_OUT_A', 45, 'the Sync Out A pin', 'generated output signal')
export const eventOutB = eventLog('SBG_ECOM_LOG_EVENT_OUT_B', 46, 'the Sync Out B pin', 'generated output signal')

/* SBG_ECOM_LOG_DIAG (48) — §2.3.7.2 "Diagnostic messages"

  TIME_STAMP µs uint32 4 @0 · TYPE - uint8 1 @4 · ERROR_CODE - uint8 1 @5
  MESSAGE — a NUL-terminated C string, from offset 6      Total size 6 + message

  ⚠️ THIS TABLE IS THE WORST IN THE MANUAL and had to be reconstructed. As printed
  it gives ERROR_CODE at offset 6, MESSAGE at offset 34, and "Total size 6" — three
  mutually impossible claims. The only self-consistent reading is that the FIXED
  part is 6 bytes (uint32 + uint8 + uint8, packed) and the variable message follows
  it, which is exactly what "Total size 6" describes for a log whose tail is a
  string. No capture of this log exists to confirm it, so it is datasheet-only and
  reconstructed at that — treat a DIAG frame's decode with suspicion.

  The message rides in metadata.message as text (see `trailingText`), because a
  base64 blob is useless for the one log whose entire purpose is to be read. */
export const DIAG_TYPES: Readonly<Record<number, string>> = {
  0: 'SBG_DEBUG_LOG_TYPE_ERROR',
  1: 'SBG_DEBUG_LOG_TYPE_WARNING',
  2: 'SBG_DEBUG_LOG_TYPE_INFO',
  3: 'SBG_DEBUG_LOG_TYPE_DEBUG',
}

export const diagnostic: LogDefinition = {
  name: 'SBG_ECOM_LOG_DIAG',
  message: 48,
  description: 'A diagnostic message from the device: an error, warning, info or debug line with its own error code. The text arrives at metadata.message. ⚠️ The datasheet\'s field table for this log is self-contradictory and the layout here is reconstructed from its stated total size.',
  fields: [
    TIME_STAMP,
    { name: 'TYPE', type: 'uint8', description: 'Message severity: error, warning, info or debug' },
    { name: 'ERROR_CODE', type: 'uint8', description: 'The device error code, if any' },
  ],
  decoders: { TYPE: (value) => enumBits(DIAG_TYPES, value, 0, 7) },
  trailingText: true,
}

/* SBG_ECOM_LOG_RTCM_RAW (49) — §2.3.7.3 "RAW RTCM Data"
  RAW_BUFFER - void [0-4086] @0     Total size [0-4086]

  The RTCM/NTRIP correction stream the device received, passed through untouched for
  post-processing. RTCM 3.x is a whole protocol of its own with its own framing and
  CRC-24Q; decoding it is not this parser's job, so the bytes go out whole. Carries
  no time stamp. */
export const rtcmRaw: LogDefinition = {
  name: 'SBG_ECOM_LOG_RTCM_RAW',
  message: 49,
  description: 'The raw RTCM/NTRIP correction stream as received, for post-processing. RTCM 3.x has its own framing and CRC and is not decoded here, so the body is emitted as opaque bytes at metadata.body. Carries no time stamp.',
  fields: [],
  opaque: true,
}
