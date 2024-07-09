import * as v from 'valibot'
import { ValibotValidator } from '@schemasjs/validator'
import {
  IntegerSchema as ValibotIntegerSchema,
  Int8Schema as ValibotInt8Schema,
  Int16Schema as ValibotInt16Schema,
  Int32Schema as ValibotInt32Schema,
  UnsignedIntegerSchema as ValibotUnsignedIntegerSchema,
  Uint8Schema as ValibotUint8Schema,
  Uint16Schema as ValibotUint16Schema,
  Uint32Schema as ValibotUint32Schema
} from '@schemasjs/valibot-numbers'
import { DELIMITER, END_FLAG, SEPARATOR, START_FLAG } from './constants'

// COMMONS
const ValibotStringSchema = v.string()
export const StringSchema = ValibotValidator<v.InferInput<typeof ValibotStringSchema>>(ValibotStringSchema)

const ValibotStringArraySchema = v.array(ValibotStringSchema)
export const StringArraySchema = ValibotValidator<v.InferInput<typeof ValibotStringArraySchema>>(ValibotStringArraySchema)

const ValibotBooleanSchema = v.boolean()
export const BooleanSchema = ValibotValidator<v.InferInput<typeof ValibotBooleanSchema>>(ValibotBooleanSchema)

const ValibotNumberSchema = v.number()
export const NumberSchema = ValibotValidator<v.InferInput<typeof ValibotNumberSchema>>(ValibotNumberSchema)

export const IntegerSchema = ValibotValidator<v.InferInput<typeof ValibotIntegerSchema>>(ValibotIntegerSchema)
export const Int8Schema = ValibotValidator<v.InferInput<typeof ValibotInt8Schema>>(ValibotInt8Schema)
export const Int16Schema = ValibotValidator<v.InferInput<typeof ValibotInt16Schema>>(ValibotInt16Schema)
export const Int32Schema = ValibotValidator<v.InferInput<typeof ValibotInt32Schema>>(ValibotInt32Schema)

export const UnsignedIntegerSchema = ValibotValidator<v.InferInput<typeof ValibotUnsignedIntegerSchema>>(ValibotUnsignedIntegerSchema)
export const Uint8Schema = ValibotValidator<v.InferInput<typeof ValibotUint8Schema>>(ValibotUint8Schema)
export const Uint16Schema = ValibotValidator<v.InferInput<typeof ValibotUint16Schema>>(ValibotUint16Schema)
export const Uint32Schema = ValibotValidator<v.InferInput<typeof ValibotUint32Schema>>(ValibotUint32Schema)

// PROTOCOLS
const ValibotFieldTypeSchema = v.union([
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
export const FieldTypeSchema = ValibotValidator<v.InferInput<typeof ValibotFieldTypeSchema>>(ValibotFieldTypeSchema)

const ValibotFieldSchema = v.object({
  name: ValibotStringSchema,
  type: ValibotFieldTypeSchema,
  units: v.optional(ValibotStringSchema),
  note: v.optional(ValibotStringSchema)
})
export const FieldSchema = ValibotValidator<v.InferInput<typeof ValibotFieldSchema>>(ValibotFieldSchema)

const ValibotFieldUnknownSchema = v.object({
  name: v.literal('unknown'),
  type: v.literal('string'),
  data: ValibotStringSchema
})
export const FieldUnknownSchema = ValibotValidator<v.InferInput<typeof ValibotFieldUnknownSchema>>(ValibotFieldUnknownSchema)

const ValibotProtocolSentenceSchema = v.object({
  sentence: ValibotStringSchema,
  fields: v.array(ValibotFieldSchema),
  description: v.optional(ValibotStringSchema)
})
export const ProtocolSentenceSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolSentenceSchema>>(ValibotProtocolSentenceSchema)

const ValibotMaxThreeFields = v.check<`${number}.${number}.${number}`, 'VersionSchema: more than 3 fields'>((input: string) => (
  input.split('.').length < 4
), 'VersionSchema: more than 3 fields')
const ValibotValidMajor = v.check<`${number}.${number}.${number}`, 'VersionSchema: Invalid major'>((val: string) => {
  const major = Number(val.split('.')[0])
  return !Number.isNaN(major) && major > 0
}, 'VersionSchema: Invalid major')
const ValibotValidMinor = v.check<`${number}.${number}.${number}`, 'VersionSchema: Invalid major'>((val: string) => {
  const fields = val.split('.')
  if (fields.length < 2) return true
  const minor = Number(fields[1])
  return !Number.isNaN(minor) && minor > 0
}, 'VersionSchema: Invalid major')
const ValibotValidPatch = v.check<`${number}.${number}.${number}`, 'VersionSchema: Invalid patch'>((val: string) => {
  const fields = val.split('.')
  if (fields.length < 3) return true
  const patch = Number.parseInt(fields[2])
  return !Number.isNaN(patch) && patch > 0
}, 'VersionSchema: Invalid patch')
const ValibotVersionSchema = v.pipe(
  v.custom<`${number}.${number}.${number}`>(val => v.is(ValibotStringSchema, val)),
  ValibotMaxThreeFields,
  ValibotValidMajor,
  ValibotValidMinor,
  ValibotValidPatch
)
export const VersionSchema = ValibotValidator<v.InferInput<typeof ValibotVersionSchema>>(ValibotVersionSchema)

const ValibotProtocolSchema = v.object({
  protocol: ValibotStringSchema,
  version: v.optional(ValibotVersionSchema),
  standard: v.optional(ValibotBooleanSchema, false),
  sentences: v.array(ValibotProtocolSentenceSchema)
})
export const ProtocolSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolSchema>>(ValibotProtocolSchema)

const ValibotProtocolsFileSchema = v.object({ protocols: v.array(ValibotProtocolSchema) })
export const ProtocolsFileSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolsFileSchema>>(ValibotProtocolsFileSchema)

const ValibotProtocolsInputSchema = v.object({
  file: v.optional(ValibotStringSchema),
  content: v.optional(ValibotStringSchema),
  protocols: v.optional(v.array(ValibotProtocolSchema))
})
export const ProtocolsInputSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolsInputSchema>>(ValibotProtocolsInputSchema)

const ValibotStoredSentenceSchema = v.object({
  sentence: ValibotStringSchema,
  protocol: v.object({
    name: ValibotStringSchema,
    standard: v.optional(ValibotBooleanSchema, false),
    version: v.optional(ValibotVersionSchema)
  }),
  fields: v.array(ValibotFieldSchema),
  description: v.optional(ValibotStringSchema)
})
export const StoredSentenceSchema = ValibotValidator<v.InferInput<typeof ValibotStoredSentenceSchema>>(ValibotStoredSentenceSchema)

const ValibotStoredSentencesSchema = v.map(ValibotStringSchema, ValibotStoredSentenceSchema)
export const StoredSentencesSchema = ValibotValidator<v.InferInput<typeof ValibotStoredSentencesSchema>>(ValibotStoredSentencesSchema)

const ValibotJSONSchemaInputSchema = v.object({
  path: v.optional(ValibotStringSchema),
  filename: v.optional(ValibotStringSchema, 'nmea_protocols_schema.json')
})
export const JSONSchemaInputSchema = ValibotValidator<v.InferInput<typeof ValibotJSONSchemaInputSchema>>(ValibotJSONSchemaInputSchema)
// SENTENCES
const ValibotNMEALikeSchema = v.pipe(
  v.string(),
  v.startsWith(START_FLAG),
  v.includes(SEPARATOR),
  v.includes(DELIMITER),
  v.endsWith(END_FLAG)
)
export const NMEALikeSchema = ValibotValidator<v.InferInput<typeof ValibotNMEALikeSchema>>(ValibotNMEALikeSchema)

const ValibotTalkerSchema = v.object({
  id: ValibotStringSchema,
  description: ValibotStringSchema
})
export const TalkerSchema = ValibotValidator<v.InferInput<typeof ValibotTalkerSchema>>(ValibotTalkerSchema)

const ValibotNMEAUnparsedSentenceSchema = v.object({
  raw: ValibotStringSchema,
  sentence: ValibotStringSchema,
  checksum: ValibotUnsignedIntegerSchema,
  data: ValibotStringArraySchema
})
export const NMEAUnparsedSentenceSchema = ValibotValidator<v.InferInput<typeof ValibotNMEAUnparsedSentenceSchema>>(ValibotNMEAUnparsedSentenceSchema)

const ValibotNMEAPreParsedSentenceSchema = v.intersect([
  ValibotNMEAUnparsedSentenceSchema,
  v.object({
    timestamp: ValibotUnsignedIntegerSchema,
    talker: v.optional(v.nullable(ValibotTalkerSchema), null)
  })
])
export const NMEAPreParsedSentenceSchema = ValibotValidator<v.InferInput<typeof ValibotNMEAPreParsedSentenceSchema>>(ValibotNMEAPreParsedSentenceSchema)

const ValibotDataSchema = v.nullable(v.union([ValibotStringSchema, ValibotNumberSchema, ValibotBooleanSchema]))
export const DataSchema = ValibotValidator<v.InferInput<typeof ValibotDataSchema>>(ValibotDataSchema)

const ValibotFieldParsedSchema = v.intersect([
  ValibotFieldSchema,
  v.object({
    data: ValibotDataSchema
  })
])
export const FieldParsedSchema = ValibotValidator<v.InferInput<typeof ValibotFieldParsedSchema>>(ValibotFieldParsedSchema)

const ValibotStoredSentenceDataSchema = v.intersect([
  ValibotStoredSentenceSchema,
  v.object({
    fields: v.array(ValibotFieldParsedSchema),
    data: v.array(ValibotDataSchema)
  })
])
export const StoredSentenceDataSchema = ValibotValidator<v.InferInput<typeof ValibotStoredSentenceDataSchema>>(ValibotStoredSentenceDataSchema)

const ValibotNMEAUknownSentenceSchema = v.intersect([
  ValibotNMEAPreParsedSentenceSchema,
  v.object({
    protocol: v.object({ name: v.literal('UNKNOWN') }),
    fields: v.array(ValibotFieldUnknownSchema)
  })
])
export const NMEAUknownSentenceSchema = ValibotValidator<v.InferInput<typeof ValibotNMEAUknownSentenceSchema>>(ValibotNMEAUknownSentenceSchema)

const ValibotNMEAKnownSentenceSchema = v.intersect([
  ValibotStoredSentenceDataSchema,
  v.object({
    timestamp: ValibotUnsignedIntegerSchema,
    talker: v.optional(v.nullable(ValibotTalkerSchema), null),
    checksum: ValibotUnsignedIntegerSchema,
    fields: v.array(ValibotFieldParsedSchema),
    data: v.array(ValibotDataSchema)
  })
])
export const NMEAKnownSentenceSchema = ValibotValidator<v.InferInput<typeof ValibotNMEAKnownSentenceSchema>>(ValibotNMEAKnownSentenceSchema)

const ValibotNMEASentenceSchema = v.union([ValibotNMEAKnownSentenceSchema, ValibotNMEAUknownSentenceSchema])
export const NMEASentenceSchema = ValibotValidator<v.InferInput<typeof ValibotNMEASentenceSchema>>(ValibotNMEASentenceSchema)

const ValibotOutputSentenceSchema = v.intersect([
  ValibotStoredSentenceSchema,
  v.object({
    talker: v.optional(ValibotTalkerSchema)
  })
])
export const OutputSentenceSchema = ValibotValidator<v.InferInput<typeof ValibotOutputSentenceSchema>>(ValibotOutputSentenceSchema)
