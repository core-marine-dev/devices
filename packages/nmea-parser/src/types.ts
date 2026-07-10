// installed
export type { CMA } from '@coremarine/protocol-core'

// coded
import type {
  MapStoredSentencesSchema,
  NMEALikeSchema,
  ProtocolFieldSchema,
  ProtocolFieldTypeSchema,
  ProtocolSchema,
  ProtocolSentencePayloadSchema,
  ProtocolSentenceSchema,
  ProtocolsFileContentSchema,
  StoredSentenceSchema,
  TalkerSchema,
  VersionSchema,
} from './schemas'

// PROTOCOLS (YAML knowledge input)
export type ProtocolFieldType = ReturnType<typeof ProtocolFieldTypeSchema.parse>
export type ProtocolField = ReturnType<typeof ProtocolFieldSchema.parse>
export type ProtocolSentence = ReturnType<typeof ProtocolSentenceSchema.parse>
export type StoredPayload = ReturnType<typeof ProtocolSentencePayloadSchema.parse>
export type Version = ReturnType<typeof VersionSchema.parse>
export type Protocol = ReturnType<typeof ProtocolSchema.parse>
export type ProtocolsFileContent = ReturnType<typeof ProtocolsFileContentSchema.parse>
// KNOWLEDGE BASE
export type StoredSentence = ReturnType<typeof StoredSentenceSchema.parse>
export type MapStoredSentences = ReturnType<typeof MapStoredSentencesSchema.parse>
// SENTENCE STRUCTURE
export type Talker = ReturnType<typeof TalkerSchema.parse>
export type NMEALike = ReturnType<typeof NMEALikeSchema.parse>
// A knowledge-base sentence, optionally annotated with the talker it was
// matched under (used by the nice-to-have lookup helpers).
export type Sentence = StoredSentence & { talker?: Talker }
export type ProtocolOutput = Record<string, StoredSentence[]>
