import type {
  DataSchema,
  FieldParsedSchema,
  FieldSchema,
  FieldTypeSchema,
  FieldUnknownSchema,
  JSONSchemaInputSchema,
  NMEAKnownSentenceSchema,
  NMEALikeSchema,
  NMEAPreParsedSentenceSchema,
  NMEASentenceSchema,
  NMEAUknownSentenceSchema,
  NMEAUnparsedSentenceSchema,
  OutputSentenceSchema,
  ProtocolSchema,
  ProtocolSentenceSchema,
  ProtocolsFileSchema,
  ProtocolsInputSchema,
  StoredSentenceDataSchema,
  StoredSentenceSchema,
  StoredSentencesSchema,
  TalkerSchema,
  VersionSchema
} from './schemas'
// COMMONS
// PROTOCOLS
export type FieldType = ReturnType<typeof FieldTypeSchema.parse>
export type Field = ReturnType<typeof FieldSchema.parse>
export type FieldUnknown = ReturnType<typeof FieldUnknownSchema.parse>
export type ProtocolSentence = ReturnType<typeof ProtocolSentenceSchema.parse>
export type Version = ReturnType<typeof VersionSchema.parse>
export type Protocol = ReturnType<typeof ProtocolSchema.parse>
export type ProtocolsFile = ReturnType<typeof ProtocolsFileSchema.parse>
export type ProtocolsInput = ReturnType<typeof ProtocolsInputSchema.parse>
export type StoredSentence = ReturnType<typeof StoredSentenceSchema.parse>
export type StoredSentences = ReturnType<typeof StoredSentencesSchema.parse>
export type ParserSentences = Record<string, StoredSentence>
// JSON Schema
export type JSONSchemaInput = ReturnType<typeof JSONSchemaInputSchema.parse>
// SENTENCES
export type NMEALike = ReturnType<typeof NMEALikeSchema.parse>
export type Talker = ReturnType<typeof TalkerSchema.parse>
export type NMEAUnparsedSentence = ReturnType<typeof NMEAUnparsedSentenceSchema.parse>
export type NMEAPreParsed = ReturnType<typeof NMEAPreParsedSentenceSchema.parse>
export type Data = ReturnType<typeof DataSchema.parse>
export type FieldParsed = ReturnType<typeof FieldParsedSchema.parse>
export type StoredSentenceData = ReturnType<typeof StoredSentenceDataSchema.parse>
export type NMEAUknownSentence = ReturnType<typeof NMEAUknownSentenceSchema.parse>
export type NMEAKnownSentence = ReturnType<typeof NMEAKnownSentenceSchema.parse>
export type NMEASentence = ReturnType<typeof NMEASentenceSchema.parse>
export type OutputSentence = ReturnType<typeof OutputSentenceSchema.parse>
export type Sentence = null | OutputSentence
// PARSER
export interface ProtocolOutput {
  protocol: string
  version?: string
  sentences: string[]
}
export interface NMEAParser {
  parseData: (data: string) => NMEASentence[]
  addProtocols: (protocols: ProtocolsInput) => void
  getProtocols: () => ProtocolOutput[]
  getSentence: (id: string) => Sentence
  getFakeSentenceByID: (id: string) => NMEALike | null
}
