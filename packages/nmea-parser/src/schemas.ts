import * as v from 'valibot'
import { DELIMITER, DIRNAME, END_FLAG, SEPARATOR, START_FLAG } from './constants'

// COMMONS
export const StringSchema = v.string()
export const StringArraySchema = v.array(StringSchema)
export const BooleanSchema = v.boolean()
export const NumberSchema = v.number()
export const UnsignedIntegerSchema = v.number([v.integer(), v.minValue(0)])

// PROTOCOLS
export const FieldTypeSchema = v.union([
  // Numbers
  v.literal('char'), v.literal('uint8'),
  v.literal('signed char'), v.literal('int8'),

  v.literal('unsigned short'), v.literal('uint16'),
  v.literal('short'), v.literal('int16'),

  v.literal('unsigned int'), v.literal('uint32'),
  v.literal('int'), v.literal('int32'),

  // v.literal('unsigned long'), v.literal('uint64'),
  // v.literal('long'), v.literal('int64'),

  v.literal('float'), v.literal('float32'),
  v.literal('double'), v.literal('float64'), v.literal('number'),

  // Strings
  v.literal('string'),
  // Boolean
  v.literal('bool'),
  v.literal('boolean')
])

export const FieldSchema = v.object({
  name: StringSchema,
  type: FieldTypeSchema,
  units: v.optional(StringSchema),
  note: v.optional(StringSchema)
})

export const FieldUnknownSchema = v.object({
  name: v.literal('unknown'),
  type: v.literal('string'),
  data: StringSchema
})

export const ProtocolSentenceSchema = v.object({
  sentence: StringSchema,
  fields: v.array(FieldSchema),
  description: v.optional(StringSchema)
})

const maxThreeFields = v.custom((val: string) => val.split('.').length < 4, 'VersionSchema: more than 3 fields')
const validMajor = v.custom((val: string) => {
  const major = Number(val.split('.')[0])
  return !Number.isNaN(major) && major > 0
}, 'VersionSchema: Invalid major')
const validMinor = v.custom((val: string) => {
  const fields = val.split('.')
  if (fields.length < 2) return true
  const minor = Number(fields[1])
  return !Number.isNaN(minor) && minor > 0
}, 'VersionSchema: Invalid major')
const validPatch = v.custom((val: string) => {
  const fields = val.split('.')
  if (fields.length < 3) return true
  const patch = Number.parseInt(fields[2])
  return !Number.isNaN(patch) && patch > 0
}, 'VersionSchema: Invalid patch')

export const VersionSchema = v.special<`${number}.${number}.${number}`>(
  val => v.safeParse(StringSchema, val).success,
  [maxThreeFields, validMajor, validMinor, validPatch] as v.Pipe<`${number}.${number}.${number}`>
)

export const ProtocolSchema = v.object({
  protocol: StringSchema,
  version: v.optional(VersionSchema),
  standard: v.optional(BooleanSchema, false),
  sentences: v.array(ProtocolSentenceSchema)
})

export const ProtocolsFileSchema = v.object({ protocols: v.array(ProtocolSchema) })

export const ProtocolsInputSchema = v.object({
  file: v.optional(StringSchema),
  content: v.optional(StringSchema),
  protocols: v.optional(v.array(ProtocolSchema))
})

export const StoredSentenceSchema = v.object({
  sentence: StringSchema,
  protocol: v.object({
    name: StringSchema,
    standard: v.optional(BooleanSchema, false),
    version: v.optional(VersionSchema)
  }),
  fields: v.array(FieldSchema),
  description: v.optional(StringSchema)
})

export const StoredSentencesSchema = v.map(StringSchema, StoredSentenceSchema)

export const JSONSchemaInputSchema = v.object({
  path: v.optional(StringSchema, DIRNAME),
  filename: v.optional(StringSchema, 'nmea_protocols_schema.json')
})
// SENTENCES
export const NMEALikeSchema = v.string([
  v.startsWith(START_FLAG),
  v.includes(SEPARATOR),
  v.includes(DELIMITER),
  v.endsWith(END_FLAG)
])

export const TalkerSchema = v.object({
  id: StringSchema,
  description: StringSchema
})

export const NMEAUnparsedSentenceSchema = v.object({
  raw: StringSchema,
  sentence: StringSchema,
  checksum: UnsignedIntegerSchema,
  data: StringArraySchema
})

export const NMEAPreParsedSentenceSchema = v.merge([
  NMEAUnparsedSentenceSchema,
  v.object({
    timestamp: UnsignedIntegerSchema,
    talker: v.optional(v.nullable(TalkerSchema), null)
  })
])

export const DataSchema = v.nullable(v.union([StringSchema, NumberSchema, BooleanSchema]))

export const FieldParsedSchema = v.merge([
  FieldSchema,
  v.object({
    data: DataSchema
  })
])

export const StoredSentenceDataSchema = v.merge([
  StoredSentenceSchema,
  v.object({
    fields: v.array(FieldParsedSchema),
    data: v.array(DataSchema)
  })
])

export const NMEAUknownSentenceSchema = v.merge([
  NMEAPreParsedSentenceSchema,
  v.object({
    protocol: v.object({ name: v.literal('UNKNOWN') }),
    fields: v.array(FieldUnknownSchema)
  })
])

export const NMEAKnownSentenceSchema = v.merge([
  StoredSentenceDataSchema,
  v.object({
    timestamp: UnsignedIntegerSchema,
    talker: v.optional(v.nullable(TalkerSchema), null),
    checksum: UnsignedIntegerSchema,
    fields: v.array(FieldParsedSchema),
    data: v.array(DataSchema)
  })
])

export const NMEASentenceSchema = v.union([NMEAKnownSentenceSchema, NMEAUknownSentenceSchema])

export const OutputSentenceSchema = v.merge([
  StoredSentenceSchema,
  v.object({
    talker: v.optional(TalkerSchema)
  })
])
