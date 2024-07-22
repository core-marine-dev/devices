import type {
  ChecksumSchema,
  Float32Schema,
  Float64Schema,
  Int16Schema,
  Int32Schema,
  Int64Schema,
  Int8Schema,
  IntegerSchema,
  JSONSchemaInputSchema,
  MapStoredSentencesSchema,
  NMEALikeSchema,
  NMEAParsedFieldchema,
  NMEAParsedPayloadSchema,
  NMEASentenceSchema,
  ProtocolFieldSchema,
  ProtocolFieldTypeSchema,
  ProtocolSchema,
  ProtocolSentencePayloadSchema,
  ProtocolSentenceSchema,
  ProtocolsFileContentSchema,
  ProtocolsInputSchema,
  StoredSentenceSchema,
  TalkerSchema,
  Uint16Schema,
  Uint32Schema,
  Uint64Schema,
  Uint8Schema,
  UnsignedIntegerSchema,
  ValueSchema,
  VersionSchema
} from './schemas'
// COMMONS
export type Integer = ReturnType<typeof IntegerSchema.parse>
export type Int8 = ReturnType<typeof Int8Schema.parse>
export type Int16 = ReturnType<typeof Int16Schema.parse>
export type Int32 = ReturnType<typeof Int32Schema.parse>
export type Int64 = ReturnType<typeof Int64Schema.parse>

export type UnsignedInteger = ReturnType<typeof UnsignedIntegerSchema.parse>
export type Uint8 = ReturnType<typeof Uint8Schema.parse>
export type Uint16 = ReturnType<typeof Uint16Schema.parse>
export type Uint32 = ReturnType<typeof Uint32Schema.parse>
export type Uint64 = ReturnType<typeof Uint64Schema.parse>

export type Float32 = ReturnType<typeof Float64Schema.parse>
export type Float64 = ReturnType<typeof Float32Schema.parse>
// PROTOCOLS
export type ProtocolFieldType = ReturnType<typeof ProtocolFieldTypeSchema.parse>
export type ProtocolField = ReturnType<typeof ProtocolFieldSchema.parse>
export type ProtocolSentence = ReturnType<typeof ProtocolSentenceSchema.parse>
export type Version = ReturnType<typeof VersionSchema.parse>
export type Protocol = ReturnType<typeof ProtocolSchema.parse>
export type ProtocolsFileContent = ReturnType<typeof ProtocolsFileContentSchema.parse>
export type ProtocolsInput = ReturnType<typeof ProtocolsInputSchema.parse>
export type StoredSentence = ReturnType<typeof StoredSentenceSchema.parse>
export type StoredPayload = ReturnType<typeof ProtocolSentencePayloadSchema.parse>
export type MapStoredSentences = ReturnType<typeof MapStoredSentencesSchema.parse>
// JSON Schema
export type JSONSchemaInput = ReturnType<typeof JSONSchemaInputSchema.parse>
// SENTENCES
export type Checksum = ReturnType<typeof ChecksumSchema.parse>
export type Value = ReturnType<typeof ValueSchema.parse>
export type Talker = ReturnType<typeof TalkerSchema.parse>
export type Field = ReturnType<typeof NMEAParsedFieldchema.parse>
export type Payload = ReturnType<typeof NMEAParsedPayloadSchema.parse>
export type NMEASentence = ReturnType<typeof NMEASentenceSchema.parse>
export type Sentence = StoredSentence & { talker?: Talker }
// PARSER
export type ProtocolOutput = Record<string, StoredSentence[]>
export type NMEALike = ReturnType<typeof NMEALikeSchema.parse>
export interface NMEAParser {
  // Mandatory
  parseData: (data: string) => NMEASentence[]
  addProtocols: (protocols: ProtocolsInput) => void
  // Nice to have
  getSentences: () => StoredSentence[]
  getSentencesByProtocol: () => ProtocolOutput
  getSentence: (id: string) => Sentence | null
  getFakeSentenceByID: (id: string) => NMEALike | null
}
