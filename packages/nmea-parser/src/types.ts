// installed
// `DeviceParser` is the shared parser API contract — type parsers by it rather
// than by any concrete class, so a device parser that composes protocol parsers
// is interchangeable with one that extends them.
// `@coremarine/protocol-core` is private and unpublished, so anything a consumer
// (or a device parser built on top of this one) needs from it is re-exported here.
export type { CMA, DeviceParser, DraftCMA, Field, FieldSpec, Metadata, ParserError, Result, SentenceDefinition, Value } from '@coremarine/protocol-core'
import type { SentenceMetadata } from '@coremarine/protocol-core'

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
// NMEA's sentence-level metadata (cma.metadata): the core contract — the
// always-present `timestamp` block plus free-form extras — narrowed with the
// keys NMEA always sets (`checksum`, `standard`) and optionally sets (`talker`).
export type NMEASentenceMetadata = SentenceMetadata & {
  checksum: string
  standard: boolean
  talker?: Talker
}

// FAKE SENTENCES — what `getFakeSentence(id, protocol?, options?)` accepts.
// Deliberately small: with NO options the output is idempotent, which is what
// makes it usable as a committed fixture. Per-field overrides are the obvious
// next addition, but the option object has to be defined per id first (the same
// job tblive's FakeOptions does), so it is deliberately not guessed at here.
export interface FakeSentenceOptions {
  // Fill the fields with genuinely random values instead of the reproducible
  // ones. For hammering a decoder with varied input.
  random?: boolean
}

// ERRORS (Result pattern — see @coremarine/protocol-core `Result`). Returned,
// never thrown, by the knowledge-feed functions.
export interface NMEAError {
  kind: 'invalid-yaml' | 'invalid-schema' | 'invalid-id' | 'unknown-id' | 'unknown-protocol'
  message: string
}
