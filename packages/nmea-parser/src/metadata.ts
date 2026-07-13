// installed
import type { DraftCMA, Field, Metadata, Value } from '@coremarine/protocol-core'

// Field-level + payload-level metadata for known sentences (the two derived
// metadata levels above the always-present sentence metadata — checksum/talker).
//
// A MetadataAggregator is dev-authored and reads an already-upgraded CMA BY
// FIELD INDEX. Field names are unofficial, so the stable identity of a
// definition is `id + payload length`; that is the registry key. An aggregator
// returns:
//   - `fields`  : field index -> metadata, merged into payload[index].metadata
//   - `payload` : flat metadata (needs ≥2 fields), merged into cma.metadata.payload
export type MetadataAggregator = (sentence: DraftCMA) => {
  fields?: Record<number, Metadata>
  payload?: Metadata
}

// GGA ----------------------------------------------------------------------------------------------------------------
const GGA_QUALITIES: Record<number, string> = {
  0: 'Fix not valid',
  1: 'GPS fix',
  2: 'Differential GPS fix (DGNSS), SBAS, OmniSTAR VBS, Beacon, RTX in GVBS mode',
  3: 'Not applicable',
  4: 'RTK Fixed, xFill',
  5: 'RTK Float, OmniSTAR XP/HP, Location RTK, RTX',
  6: 'INS Dead reckoning',
  7: 'Manual Input Mode',
  8: 'Simulator Mode',
}

// hhmmss.ss (UTC time of day) -> epoch ms, dated to today (GGA carries no date).
const utcPositionToEpoch = (utc: string): number | null => {
  if (utc.length < 6 || Number.isNaN(Number(utc))) return null
  const seconds = Number(utc.slice(4))
  const date = new Date()
  date.setUTCHours(Number(utc.slice(0, 2)), Number(utc.slice(2, 4)), Math.trunc(seconds), Math.round((seconds % 1) * 1000))
  return date.getTime()
}

// ddmm.mmmm + hemisphere letter -> signed decimal degrees.
const decimalDegrees = (value: Value, hemisphere: Value, negative: string): number | null => {
  if (typeof value !== 'string' || typeof hemisphere !== 'string') return null
  if (value === '' || Number.isNaN(Number(value))) return null
  const [left, right = ''] = value.split('.')
  const degrees = Number(left.slice(0, -2))
  const minutes = Number(`${left.slice(-2)}.${right}`)
  const sign = (hemisphere === negative) ? -1 : 1
  return sign * (degrees + (minutes / 60))
}

// idx 0: utc_position -> epoch-ms timestamp.
const ggaTimestamp = (payload: Field[]): Record<number, Metadata> => {
  const utc = payload[0].value
  if (typeof utc !== 'string') return {}
  const timestamp = utcPositionToEpoch(utc)
  return (timestamp === null) ? {} : { 0: { timestamp } }
}

// idx 5: gps_quality code -> human-readable label.
const ggaQuality = (payload: Field[]): Record<number, Metadata> => {
  const quality = payload[5].value
  if (typeof quality !== 'number') return {}
  return { 5: { label: GGA_QUALITIES[quality] ?? 'unknown' } }
}

// idx 1+2 / 3+4: latitude/longitude in decimal degrees.
const ggaPosition = (payload: Field[]): Metadata => {
  const result: Metadata = {}
  const latitude = decimalDegrees(payload[1].value, payload[2].value, 'S')
  if (latitude !== null) result.latitude = latitude
  const longitude = decimalDegrees(payload[3].value, payload[4].value, 'W')
  if (longitude !== null) result.longitude = longitude
  return result
}

const aggregateGGA: MetadataAggregator = (sentence) => ({
  fields: { ...ggaTimestamp(sentence.payload), ...ggaQuality(sentence.payload) },
  payload: ggaPosition(sentence.payload),
})

// REGISTRY -----------------------------------------------------------------------------------------------------------
// Keyed by `${id}:${payloadLength}` — the stable identity of a definition.
const METADATA_AGGREGATORS: Record<string, MetadataAggregator> = {
  'GGA:14': aggregateGGA,
}

const applyFields = (payload: Field[], fields: Record<number, Metadata>): Field[] => (
  payload.map((field, index) => (
    (index in fields) ? { ...field, metadata: { ...field.metadata, ...fields[index] } } : field
  ))
)

// Runs after upgrade. No-ops when no aggregator is registered for the sentence,
// so unknown (and unrecognised-length) sentences pass through untouched.
export const aggregateMetadata = (sentence: DraftCMA): DraftCMA => {
  const key = `${sentence.id}:${sentence.payload.length}`
  if (!(key in METADATA_AGGREGATORS)) return sentence
  const { fields = {}, payload = {} } = METADATA_AGGREGATORS[key](sentence)
  const result: DraftCMA = { ...sentence, payload: applyFields(sentence.payload, fields) }
  if (Object.keys(payload).length > 0) {
    const previous = (sentence.metadata?.payload ?? {}) as Metadata
    result.metadata = { ...sentence.metadata, payload: { ...previous, ...payload } }
  }
  return result
}
