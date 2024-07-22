import {
  Float32Schema as ValibotFloat32Schema,
  Float64Schema as ValibotFloat64Schema,
  Int16Schema as ValibotInt16Schema,
  Int32Schema as ValibotInt32Schema,
  Int8Schema as ValibotInt8Schema,
  IntegerSchema as ValibotIntegerSchema,
  Uint16Schema as ValibotUint16Schema,
  Uint32Schema as ValibotUint32Schema,
  Uint8Schema as ValibotUint8Schema,
  UnsignedIntegerSchema as ValibotUnsignedIntegerSchema
} from '@schemasjs/valibot-numbers'
import { ValibotValidator } from '@schemasjs/validator'
import * as v from 'valibot'
import { CHECKSUM_LENGTH, DELIMITER, END_FLAG, FIELD_TYPES, NMEA_SENTENCE_LENGTH, SEPARATOR, START_FLAG } from './constants'
import { stringChecksumToNumber } from './checksum'

// COMMONS ------------------------------------------------------------------------------------------------------------
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
const ValibotInt64Schema = v.bigint()
export const Int64Schema = ValibotValidator<v.InferOutput<typeof ValibotInt64Schema>>(ValibotInt64Schema)

export const UnsignedIntegerSchema = ValibotValidator<v.InferInput<typeof ValibotUnsignedIntegerSchema>>(ValibotUnsignedIntegerSchema)
export const Uint8Schema = ValibotValidator<v.InferInput<typeof ValibotUint8Schema>>(ValibotUint8Schema)
export const Uint16Schema = ValibotValidator<v.InferInput<typeof ValibotUint16Schema>>(ValibotUint16Schema)
export const Uint32Schema = ValibotValidator<v.InferInput<typeof ValibotUint32Schema>>(ValibotUint32Schema)
const ValibotUint64Schema = v.pipe(v.bigint(), v.minValue(0n))
export const Uint64Schema = ValibotValidator<v.InferOutput<typeof ValibotUint64Schema>>(ValibotUint64Schema)

export const Float32Schema = ValibotValidator<v.InferInput<typeof ValibotFloat32Schema>>(ValibotFloat32Schema)
export const Float64Schema = ValibotValidator<v.InferInput<typeof ValibotFloat64Schema>>(ValibotFloat64Schema)
// PROTOCOLS ----------------------------------------------------------------------------------------------------------
const ValibotProtocolFieldTypeSchema = v.picklist(FIELD_TYPES, 'invalid type')
export const ProtocolFieldTypeSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolFieldTypeSchema>>(ValibotProtocolFieldTypeSchema)

const ValibotProtocolFieldSchema = v.object({
  name: ValibotStringSchema,
  type: ValibotProtocolFieldTypeSchema,
  units: v.optional(ValibotStringSchema),
  description: v.optional(ValibotStringSchema)
})
export const ProtocolFieldSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolFieldSchema>>(ValibotProtocolFieldSchema)

const ValibotProtocolSentencePayloadSchema = v.array(ValibotProtocolFieldSchema, 'invalid payload')
export const ProtocolSentencePayloadSchema = ValibotValidator<v.InferOutput<typeof ValibotProtocolSentencePayloadSchema>>(ValibotProtocolSentencePayloadSchema)

const ValibotProtocolSentenceSchema = v.object({
  id: ValibotStringSchema,
  payload: ValibotProtocolSentencePayloadSchema,
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
  version: v.optional(ValibotStringSchema),
  standard: v.optional(ValibotBooleanSchema, false),
  sentences: v.array(ValibotProtocolSentenceSchema)
})
export const ProtocolSchema = ValibotValidator<v.InferOutput<typeof ValibotProtocolSchema>>(ValibotProtocolSchema)

export const ValibotProtocolsFileContentSchema = v.object({ protocols: v.array(ValibotProtocolSchema) })
export const ProtocolsFileContentSchema = ValibotValidator<v.InferOutput<typeof ValibotProtocolsFileContentSchema>>(ValibotProtocolsFileContentSchema)

const ValibotProtocolsInputSchema = v.object({
  file: v.optional(ValibotStringSchema),
  content: v.optional(ValibotStringSchema),
  protocols: v.optional(v.array(ValibotProtocolSchema))
})
export const ProtocolsInputSchema = ValibotValidator<v.InferOutput<typeof ValibotProtocolsInputSchema>>(ValibotProtocolsInputSchema)

const ValibotStoredSentenceSchema = v.object({
  id: ValibotStringSchema,
  protocol: v.object({
    name: ValibotStringSchema,
    standard: v.optional(ValibotBooleanSchema, false),
    version: v.optional(ValibotStringSchema)
  }),
  payload: v.array(ValibotProtocolFieldSchema),
  description: v.optional(ValibotStringSchema)
})
export const StoredSentenceSchema = ValibotValidator<v.InferOutput<typeof ValibotStoredSentenceSchema>>(ValibotStoredSentenceSchema)

const ValibotMapStoredSentencesSchema = v.map(ValibotStringSchema, ValibotStoredSentenceSchema)
export const MapStoredSentencesSchema = ValibotValidator<v.InferOutput<typeof ValibotMapStoredSentencesSchema>>(ValibotMapStoredSentencesSchema)

const ValibotJSONSchemaInputSchema = v.object({
  path: v.optional(ValibotStringSchema),
  filename: v.optional(ValibotStringSchema, 'nmea_protocols_schema.json')
})
export const JSONSchemaInputSchema = ValibotValidator<v.InferInput<typeof ValibotJSONSchemaInputSchema>>(ValibotJSONSchemaInputSchema)
// SENTENCES ----------------------------------------------------------------------------------------------------------
const ValibotChecksumSchema = v.object({
  sample: ValibotStringSchema,
  value: ValibotUint8Schema
})
export const ChecksumSchema = ValibotValidator<v.InferInput<typeof ValibotChecksumSchema>>(ValibotChecksumSchema)

const ValibotValueSchema = v.union([ValibotStringSchema, ValibotBooleanSchema, ValibotNumberSchema, v.bigint(), v.null()], 'invalid value')
export const ValueSchema = ValibotValidator<v.InferInput<typeof ValibotValueSchema>>(ValibotValueSchema)

const ValibotTalkerSchema = v.object({
  value: ValibotStringSchema,
  description: ValibotStringSchema
})
export const TalkerSchema = ValibotValidator<v.InferInput<typeof ValibotTalkerSchema>>(ValibotTalkerSchema)

const ValibotNMEALikeSchema = v.custom<`$${string}*${string}\r\n`>(input => {
  if (typeof input !== 'string') { return false }
  if (!input.startsWith(START_FLAG)) { return false }
  if (!input.endsWith(END_FLAG)) { return false }
  const parts = input.split(DELIMITER)
  if (parts.length !== 2) { return false }
  const [info, cs] = parts
  if (cs.length !== CHECKSUM_LENGTH + END_FLAG.length) { return false }
  const checksum = cs.slice(0, CHECKSUM_LENGTH)
  const numChecksum = stringChecksumToNumber(checksum)
  if (!v.safeParse(ValibotUint8Schema, numChecksum).success) { return false }
  const data = info.slice(START_FLAG.length)
  if (data.length < NMEA_SENTENCE_LENGTH) { return false }
  return info.includes(SEPARATOR)
})
export const NMEALikeSchema = ValibotValidator<v.InferOutput<typeof ValibotNMEALikeSchema>>(ValibotNMEALikeSchema)

const ValibotNMEAParsedFieldSchema = v.object({
  name: v.optional(v.string('payload name bad'), 'unknown'),
  sample: v.string('payload sample bad'),
  value: ValibotValueSchema,
  type: v.optional(v.union([v.picklist(FIELD_TYPES), v.literal('unknown')], 'payload type bad'), 'unknown'),
  units: v.optional(v.string('payload units bad'), 'unknown'),
  description: v.optional(v.string('payload description bad')),
  metadata: v.optional(v.any())
})
export const NMEAParsedFieldchema = ValibotValidator<v.InferOutput<typeof ValibotNMEAParsedFieldSchema>>(ValibotNMEAParsedFieldSchema)

const ValibotNMEAParsedPayloadSchema = v.array(ValibotNMEAParsedFieldSchema)
export const NMEAParsedPayloadSchema = ValibotValidator<v.InferOutput<typeof ValibotNMEAParsedPayloadSchema>>(ValibotNMEAParsedPayloadSchema)

const ValibotNMEASentenceSchema = v.object({
  received: ValibotUnsignedIntegerSchema,
  sample: ValibotNMEALikeSchema,
  id: ValibotStringSchema,
  description: v.optional(ValibotStringSchema),
  checksum: ValibotChecksumSchema,
  payload: v.array(ValibotNMEAParsedFieldSchema),
  metadata: v.optional(v.any()),
  protocol: v.optional(
    v.object({
      name: ValibotStringSchema,
      standard: ValibotBooleanSchema,
      version: v.optional(ValibotStringSchema)
    }),
    { name: 'unknown', standard: false }
  ),
  talker: v.optional(ValibotTalkerSchema)
})
export const NMEASentenceSchema = ValibotValidator<v.InferOutput<typeof ValibotNMEASentenceSchema>>(ValibotNMEASentenceSchema)
