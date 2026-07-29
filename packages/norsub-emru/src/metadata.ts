// installed
import type { Metadata, MetadataAggregator, MetadataAggregators, Value } from '@coremarine/nmea-parser'

// coded
import { getStatus } from './status'

// Derived metadata for the NorSub proprietary sentences, registered on the NMEA
// protocol parser via `registerAggregators`. Keyed `${id}:${payloadLength}` — the
// stable identity of a definition (field names are unofficial), so aggregators
// read the payload BY INDEX.

// STATUS ---------------------------------------------------------------------------------------------------------------
// Placement follows the three locked CMA rules:
//   1. a field that decodes on its own carries its own decode  -> field metadata
//   2. metadata describing the whole DEVICE rather than one field belongs to the payload
//   3. ...and MAY be mirrored there even when a single field produced it, so equivalent
//      sentences from different device variants expose ONE read path (swapping a
//      PNORSUB7b for a PNORSUB8 costs a consumer nothing).
// See docs/CMA.md §"Device-level metadata may be mirrored at payload level".

// The five single-`status` sentences (PNORSUB, 2, 6, 7, 8) all carry the uint32
// bitfield as their LAST payload field, so one aggregator covers them all — the
// registry key's payload length is what tells them apart, not this code.
const aggregateStatus: MetadataAggregator = (sentence) => {
  const index = sentence.payload.length - 1
  const value = sentence.payload[index].value
  if (typeof value !== 'number') return {}
  const status = getStatus({ status: value })
  if (status === null) return {}
  return { fields: { [index]: { status } }, payload: { status } }
}

// PNORSUB7b splits those same 32 bits across two uint16 fields. NEITHER half
// decodes on its own, so there is deliberately NO field-level metadata here and
// the payload level is mandatory rather than a mirror.
const aggregateSplitStatus: MetadataAggregator = (sentence) => {
  const low = sentence.payload.at(-2)?.value
  const high = sentence.payload.at(-1)?.value
  if (typeof low !== 'number' || typeof high !== 'number') return {}
  const status = getStatus({ status_a: low, status_b: high })
  return (status === null) ? {} : { payload: { status } }
}

// PTVG -----------------------------------------------------------------------------------------------------------------
// The Tokimek telegram glues the unit letter to the number and scales pitch/roll
// by 100 (`$PTVG,abbbbP,accccR,ddd.dT*hh`), so the raw fields can only be
// `string` — a numeric type would decode every one of them to `null`. The real
// quantities live in the field metadata. `a` is the sign: `-` bow up, ` ` bow down.
const ptvgDegrees = (value: Value, letter: string, scale: number): number | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed.endsWith(letter)) return null
  // The sign position is a space when positive and the field is space-padded, so
  // drop all whitespace: `- 036` and `-0036` must both read as -36.
  const digits = trimmed.slice(0, -1).replaceAll(' ', '')
  if (digits === '' || Number.isNaN(Number(digits))) return null
  return Number(digits) / scale
}

// idx 0 pitch (x100), idx 1 roll (x100), idx 2 heading (plain degrees).
const PTVG_DECODES: { letter: string, scale: number }[] = [
  { letter: 'P', scale: 100 },
  { letter: 'R', scale: 100 },
  { letter: 'T', scale: 1 },
]

const aggregatePTVG: MetadataAggregator = (sentence) => {
  const fields: Record<number, Metadata> = {}
  PTVG_DECODES.forEach(({ letter, scale }, index) => {
    const degrees = ptvgDegrees(sentence.payload[index].value, letter, scale)
    if (degrees !== null) fields[index] = { degrees }
  })
  return { fields }
}

// REGISTRY -------------------------------------------------------------------------------------------------------------
export const NORSUB_METADATA_AGGREGATORS: MetadataAggregators = {
  'PNORSUB:7': aggregateStatus,
  'PNORSUB2:8': aggregateStatus,
  'PNORSUB6:18': aggregateStatus,
  'PNORSUB7:24': aggregateStatus,
  'PNORSUB7b:25': aggregateSplitStatus,
  'PNORSUB8:24': aggregateStatus,
  'PTVG:3': aggregatePTVG,
}
