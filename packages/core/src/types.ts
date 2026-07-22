// installed
export type { Float32, Float64, Int16, Int32, Int8, Uint16, Uint32, Uint8 } from '@schemasjs/valibot-numbers'

// coded
import type { CMASchema, ErrorsSchema, FieldSchema, MetadataSchema, ProtocolSchema, SentenceMetadataSchema, TimestampMetadataSchema, TimestampSchema, TypeSchema, ValueSchema } from './cma'

// Note: `char` values and 64-bit integers (int64/uint64) are all typed as
// plain `string` — see CharSchema / Int64Schema / Uint64Schema in schemas.ts
// for their runtime validation. No dedicated aliases (they'd just be `string`).

// CMA — inferred from the schemas (single source of truth)
export type Metadata = ReturnType<typeof MetadataSchema.parse>
export type Errors = ReturnType<typeof ErrorsSchema.parse>
export type Timestamp = ReturnType<typeof TimestampSchema.parse>
export type TimestampMetadata = ReturnType<typeof TimestampMetadataSchema.parse>
export type SentenceMetadata = ReturnType<typeof SentenceMetadataSchema.parse>
export type Value = ReturnType<typeof ValueSchema.parse>
export type Type = ReturnType<typeof TypeSchema.parse>
export type Protocol = ReturnType<typeof ProtocolSchema.parse>
export type Field = ReturnType<typeof FieldSchema.parse>
export type CMA = ReturnType<typeof CMASchema.parse>

// What a protocol's `extractSentences` yields: a CMA that is fully built EXCEPT
// for the sentence-level timestamp metadata, which only the core base can stamp
// (it owns `received`/`parsed`). The core turns every DraftCMA into a CMA in
// `addData`, so a CMA is never emitted without its timestamp — no placeholders,
// no optional contract. Derived from CMA so CMA stays the single source of truth.
export type DraftCMA = Omit<CMA, 'metadata'> & { metadata?: Metadata }

// PARSER
export type Input = string | Uint8Array

export interface ParserOptions {
  memory?: boolean
  bufferLimit?: number
}

// What a protocol's sentence extractor returns: the sentences decoded from the
// current buffer (still DRAFTs — core stamps their timestamp metadata), plus
// whatever trailing bytes/chars did not form a complete sentence yet.
export interface ExtractedSentences<B extends Input> {
  sentences: DraftCMA[]
  remainder: B
}
