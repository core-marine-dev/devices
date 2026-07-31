// installed
export type { Float32, Float64, Int16, Int32, Int8, Uint16, Uint32, Uint8 } from '@schemasjs/valibot-numbers'

// coded
import type { CMASchema, ErrorsSchema, FieldSchema, MetadataSchema, ProtocolSchema, SentenceMetadataSchema, TimestampMetadataSchema, TimestampSchema, TypeSchema, ValueSchema } from './cma'
import type { UNKNOWN } from './constants'
import type { Result } from './result'

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

// INTROSPECTION — the part of the API that is not about parsing data.
//
// Every CoreMarine parser can be asked what it knows (`getSentenceDefinition`)
// and can fabricate a wire sentence (`getFakeSentence`). Both exist for
// DIAGNOSIS: these libraries run on remote installations with restricted
// internet access for years, so being able to ask the deployed binary what it
// expects — and to feed it a sentence it made itself — settles questions that
// would otherwise need the datasheets.

// Structured error, returned and never thrown (see `Result`). `kind` is a
// per-parser union of literals; the shared contract only needs it to be a
// string, so a consumer can switch on it without knowing every protocol.
export interface ParserError {
  kind: string
  message: string
}

// A field as a DEFINITION: what a `Field` looks like before any data arrives —
// no `raw`, no `value`, no `errors`. Protocols add their own keys (a sub-block's
// nested fields, a Do-Not-Use sentinel), which structural typing allows.
export interface FieldSpec {
  name: string
  type?: Type
  units?: string
  description?: string
}

// What a parser believes a sentence looks like. CMA-shaped on purpose: the same
// keys a parsed sentence has, minus the ones only a real parse can fill.
// `protocol.version` is optional here (unlike in a CMA) because a knowledge base
// may describe a sentence without pinning it to a version.
export interface SentenceDefinition {
  id: string
  protocol: { name: string, version?: string }
  payload: FieldSpec[]
  description?: string
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
  // Every sentence this parser can describe or fabricate.
  readonly sentenceIds: string[]
  // THE SHAPE IS `(id, protocol, options?)` — the one tblive settled on, now the
  // rule. `protocol` is the protocol/firmware VERSION, and it matters: a TB Live
  // `emitter` sentence is genuinely different on 1.0.1 and 1.0.2, and a
  // Septentrio block's fields come from its firmware's knowledge base. A parser
  // whose output depends on it may REQUIRE it (tblive does); one that can pick a
  // sensible default leaves it optional.
  //
  // Declared with METHOD syntax, deliberately: TypeScript checks method
  // parameters bivariantly, so a parser may narrow `id` to its own union of
  // literals (tblive), widen it (septentrio accepts a block number too), or make
  // `protocol` mandatory — and still satisfy this contract.
  //
  // The error side is an ARRAY: one call can fail for several reasons at once
  // (three malformed options), and each reason keeps its own `kind` rather than
  // being flattened into prose. Same plurality as a CMA's `errors`.
  getSentenceDefinition(id: string, protocol?: string): Result<SentenceDefinition[], ParserError[]>
  // Returns something that can be fed straight back into `addData`: a string for
  // the text protocols, bytes for the binary ones.
  getFakeSentence(id: string, protocol?: string, options?: unknown): Result<B, ParserError[]>
}
