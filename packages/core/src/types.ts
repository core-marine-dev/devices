// installed
export type { Float32, Float64, Int16, Int32, Int8, Uint16, Uint32, Uint8 } from '@schemasjs/valibot-numbers'

// coded
import type { CMASchema, ErrorsSchema, FieldSchema, MetadataSchema, ProtocolSchema, SentenceMetadataSchema, TimestampMetadataSchema, TimestampSchema, TypeSchema, ValueSchema } from './cma'
import type { UNKNOWN } from './constants'

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

// A chunk of input the parser could not decode as a sentence at all (noise on
// the line, a wrong device, a truncated telegram of unknown length). It is still
// a full CMA — the contract is never bent — with every mandatory string set to
// `UNKNOWN` and an empty payload. What it carries that matters: `raw` (the
// discarded input, so it can be inspected), the timestamps, and `errors`
// explaining WHY it could not be parsed. Emitting these is what keeps bad input
// visible instead of silently dropped; a consumer detects any problem, garbage
// or not, by the presence of `errors`. The MODEL lives here so every parser
// builds the same shape; the decision of what counts as garbage is protocol-specific.
export type GarbageSentence = DraftCMA & {
  id: typeof UNKNOWN
  protocol: { name: typeof UNKNOWN, version: typeof UNKNOWN }
  payload: []
  errors: Errors
}

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

// The shared API contract — "every parser has the same API", written down. The
// abstract `Parser` implements it, but a DEVICE parser that only *composes*
// protocol parsers (e.g. a device speaking one of several protocols, selected at
// runtime) cannot extend `Parser`; and because `Parser` has protected members,
// TypeScript would then refuse to accept that facade as a `Parser<B>` even with
// an identical public surface. Type by this interface, not by the base class,
// and both shapes are interchangeable.
export interface DeviceParser<B extends Input> {
  memory: boolean
  bufferLimit: number
  readonly buffer: B
  addData: (data: B) => void
  parseData: (data?: B) => CMA[]
}
