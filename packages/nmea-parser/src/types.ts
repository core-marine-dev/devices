import { Input, Output } from 'valibot'
import type {
  FieldTypeSchema, FieldSchema,
  ProtocolSchema, ProtocolsFileSchema, ProtocolSentenceSchema,
  VersionSchema, JSONSchemaInputSchema,
  StoredSentenceSchema, StoredSentencesSchema,
  NMEALikeSchema, NMEAUnparsedSentenceSchema, NMEAPreParsedSentenceSchema,
  DataSchema, FieldParsedSchema, NMEASentenceSchema, NMEAUknownSentenceSchema, NMEAKnownSentenceSchema, ProtocolsInputSchema, FieldUnknownSchema, OutputSentenceSchema, TalkerSchema, StoredSentenceDataSchema
} from './schemas'
// COMMONS
// PROTOCOLS
export type FieldType = Input<typeof FieldTypeSchema>
export type Field = Input<typeof FieldSchema>
export type FieldUnknown = Input<typeof FieldUnknownSchema>
export type ProtocolSentence = Input<typeof ProtocolSentenceSchema>
export type Version = Input<typeof VersionSchema>
export type Protocol = Output<typeof ProtocolSchema>
export type ProtocolsFile = Output<typeof ProtocolsFileSchema>
export type ProtocolsInput = Output<typeof ProtocolsInputSchema>
export type StoredSentence = Input<typeof StoredSentenceSchema>
export type StoredSentences = Input<typeof StoredSentencesSchema>
export type ParserSentences = Record<string, StoredSentence>
// JSON Schema
export type JSONSchemaInput = Input<typeof JSONSchemaInputSchema>
// SENTENCES
export type NMEALike = Input<typeof NMEALikeSchema>
export type Talker = Input<typeof TalkerSchema>
export type NMEAUnparsedSentence = Input<typeof NMEAUnparsedSentenceSchema>
export type NMEAPreParsed = Input<typeof NMEAPreParsedSentenceSchema>
export type Data = Input<typeof DataSchema>
export type FieldParsed = Input<typeof FieldParsedSchema>
export type StoredSentenceData = Input<typeof StoredSentenceDataSchema>
export type NMEAUknownSentence = Input<typeof NMEAUknownSentenceSchema>
export type NMEAKnownSentence = Input<typeof NMEAKnownSentenceSchema>
export type NMEASentence = Input<typeof NMEASentenceSchema>
export type OutputSentence = Input<typeof OutputSentenceSchema>
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
