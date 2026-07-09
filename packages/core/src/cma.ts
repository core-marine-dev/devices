// installed
import { ValibotValidator } from '@schemasjs/validator'
import * as v from 'valibot'

// CMA — the unified output format every parser converges on.
// See docs/CMA.md. Locked decisions: timestamp is epoch ms only;
// protocol.version is required and the object is closed; extra per-protocol
// keys live in `metadata`, never at the top level.

// COMMONS
const ValibotMetadataSchema = v.record(v.string(), v.unknown())
export const MetadataSchema = ValibotValidator<v.InferInput<typeof ValibotMetadataSchema>>(ValibotMetadataSchema)

const ValibotErrorsSchema = v.array(v.string())
export const ErrorsSchema = ValibotValidator<v.InferInput<typeof ValibotErrorsSchema>>(ValibotErrorsSchema)

const ValibotTimestampSchema = v.pipe(
  v.number('Timestamp: It should be a number'),
  v.integer('Timestamp: It should be an integer'),
  v.minValue(0, 'Timestamp: It should be a positive integer (Unix epoch in milliseconds)'),
)
export const TimestampSchema = ValibotValidator<v.InferInput<typeof ValibotTimestampSchema>>(ValibotTimestampSchema)

// A field value: string | number | boolean | null. `null` = a field that is
// present but empty (common in NMEA). No `bigint`: 64-bit integers (int64/
// uint64) are carried as decimal strings so the whole shape stays JSON-safe.
const ValibotValueSchema = v.union([v.string(), v.number(), v.boolean(), v.null()])
export const ValueSchema = ValibotValidator<v.InferInput<typeof ValibotValueSchema>>(ValibotValueSchema)

const ValibotTypeSchema = v.picklist([
  'char', 'string', 'boolean',
  'int8', 'int16', 'int32', 'int64',
  'uint8', 'uint16', 'uint32', 'uint64',
  'float32', 'float64',
])
export const TypeSchema = ValibotValidator<v.InferInput<typeof ValibotTypeSchema>>(ValibotTypeSchema)

// PROTOCOL
const ValibotProtocolSchema = v.object({
  name: v.string(),
  version: v.string(),
})
export const ProtocolSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolSchema>>(ValibotProtocolSchema)

// FIELD
const ValibotFieldSchema = v.object({
  raw: v.string(),
  name: v.string(),
  type: ValibotTypeSchema,
  value: ValibotValueSchema,
  units: v.optional(v.string()),
  description: v.optional(v.string()),
  errors: v.optional(ValibotErrorsSchema),
  metadata: v.optional(ValibotMetadataSchema),
})
export const FieldSchema = ValibotValidator<v.InferInput<typeof ValibotFieldSchema>>(ValibotFieldSchema)

// CMA
const ValibotCMASchema = v.object({
  raw: v.string(),
  timestamp: ValibotTimestampSchema,
  id: v.string(),
  protocol: ValibotProtocolSchema,
  payload: v.array(ValibotFieldSchema),
  metadata: v.optional(ValibotMetadataSchema),
  errors: v.optional(ValibotErrorsSchema),
  description: v.optional(v.string()),
})
export const CMASchema = ValibotValidator<v.InferInput<typeof ValibotCMASchema>>(ValibotCMASchema)
