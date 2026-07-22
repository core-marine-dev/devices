// installed
import { ValibotValidator } from '@schemasjs/validator'
import * as v from 'valibot'

// coded
import { stringChecksumToNumber } from './checksum'
import { CHECKSUM_LENGTH, DELIMITER, END_FLAG, FIELD_TYPES, NMEA_SENTENCE_LENGTH, SEPARATOR, START_FLAG } from './constants'

// COMMONS ------------------------------------------------------------------------------------------------------------
const ValibotStringSchema = v.string()
export const StringSchema = ValibotValidator<v.InferInput<typeof ValibotStringSchema>>(ValibotStringSchema)

const ValibotBooleanSchema = v.boolean()
export const BooleanSchema = ValibotValidator<v.InferInput<typeof ValibotBooleanSchema>>(ValibotBooleanSchema)

// PROTOCOLS (YAML knowledge input) -----------------------------------------------------------------------------------
// The authored knowledge model: a protocols file lists protocols, each with a
// name/version/standard flag and its sentence definitions. This is INPUT — the
// parser's OUTPUT is the shared CMA shape from @coremarine/protocol-core.
const ValibotProtocolFieldTypeSchema = v.picklist(FIELD_TYPES, 'invalid type')
export const ProtocolFieldTypeSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolFieldTypeSchema>>(ValibotProtocolFieldTypeSchema)

const ValibotProtocolFieldSchema = v.object({
  name: ValibotStringSchema,
  type: ValibotProtocolFieldTypeSchema,
  units: v.optional(ValibotStringSchema),
  description: v.optional(ValibotStringSchema),
})
export const ProtocolFieldSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolFieldSchema>>(ValibotProtocolFieldSchema)

const ValibotProtocolSentencePayloadSchema = v.array(ValibotProtocolFieldSchema, 'invalid payload')
export const ProtocolSentencePayloadSchema = ValibotValidator<v.InferOutput<typeof ValibotProtocolSentencePayloadSchema>>(ValibotProtocolSentencePayloadSchema)

const ValibotProtocolSentenceSchema = v.object({
  id: ValibotStringSchema,
  payload: ValibotProtocolSentencePayloadSchema,
  description: v.optional(ValibotStringSchema),
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
  v.custom<`${number}.${number}.${number}`>((val) => v.is(ValibotStringSchema, val)),
  ValibotMaxThreeFields,
  ValibotValidMajor,
  ValibotValidMinor,
  ValibotValidPatch,
)
export const VersionSchema = ValibotValidator<v.InferInput<typeof ValibotVersionSchema>>(ValibotVersionSchema)

const ValibotProtocolSchema = v.object({
  protocol: ValibotStringSchema,
  version: v.optional(ValibotStringSchema),
  standard: v.optional(ValibotBooleanSchema, false),
  sentences: v.array(ValibotProtocolSentenceSchema),
})
export const ProtocolSchema = ValibotValidator<v.InferOutput<typeof ValibotProtocolSchema>>(ValibotProtocolSchema)

export const ValibotProtocolsFileContentSchema = v.object({ protocols: v.array(ValibotProtocolSchema) })
export const ProtocolsFileContentSchema = ValibotValidator<v.InferOutput<typeof ValibotProtocolsFileContentSchema>>(ValibotProtocolsFileContentSchema)

// KNOWLEDGE BASE (stored, in-memory) ---------------------------------------------------------------------------------
const ValibotStoredSentenceSchema = v.object({
  id: ValibotStringSchema,
  protocol: v.object({
    name: ValibotStringSchema,
    standard: v.optional(ValibotBooleanSchema, false),
    version: v.optional(ValibotStringSchema),
  }),
  payload: v.array(ValibotProtocolFieldSchema),
  description: v.optional(ValibotStringSchema),
})
export const StoredSentenceSchema = ValibotValidator<v.InferOutput<typeof ValibotStoredSentenceSchema>>(ValibotStoredSentenceSchema)

// Multiple definitions per id: the same id can have different field counts
// across NMEA versions, so each id maps to an ARRAY of definitions.
const ValibotMapStoredSentencesSchema = v.map(ValibotStringSchema, v.array(ValibotStoredSentenceSchema))
export const MapStoredSentencesSchema = ValibotValidator<v.InferOutput<typeof ValibotMapStoredSentencesSchema>>(ValibotMapStoredSentencesSchema)

// SENTENCE STRUCTURE -------------------------------------------------------------------------------------------------
const ValibotUint8ChecksumSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255))

const ValibotTalkerSchema = v.object({
  value: ValibotStringSchema,
  description: ValibotStringSchema,
})
export const TalkerSchema = ValibotValidator<v.InferInput<typeof ValibotTalkerSchema>>(ValibotTalkerSchema)

const ValibotNMEALikeSchema = v.custom<`$${string}*${string}\r\n`>((input) => {
  if (typeof input !== 'string') {
    return false
  }
  if (!input.startsWith(START_FLAG)) {
    return false
  }
  if (!input.endsWith(END_FLAG)) {
    return false
  }
  const parts = input.split(DELIMITER)
  if (parts.length !== 2) {
    return false
  }
  const [info, cs] = parts
  if (cs.length !== CHECKSUM_LENGTH + END_FLAG.length) {
    return false
  }
  const checksum = cs.slice(0, CHECKSUM_LENGTH)
  const numChecksum = stringChecksumToNumber(checksum)
  if (!v.safeParse(ValibotUint8ChecksumSchema, numChecksum).success) {
    return false
  }
  const data = info.slice(START_FLAG.length)
  if (data.length < NMEA_SENTENCE_LENGTH) {
    return false
  }
  return info.includes(SEPARATOR)
})
export const NMEALikeSchema = ValibotValidator<v.InferOutput<typeof ValibotNMEALikeSchema>>(ValibotNMEALikeSchema)
