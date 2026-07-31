// installed
import type { Field, Metadata, ParserOptions, Value } from '@coremarine/protocol-core'

// SBF blocks are DESCRIBED, not hand-decoded. Each block file declares its body
// as a table of field definitions in datasheet order (plus decoders for the
// bitfields and enums, which are the only real logic), and one shared engine
// derives every byte offset, raw slice, Do-Not-Use check and padding boundary
// from it. Hand-written offset chains are what produced the field-rotation and
// padding bugs in the 1.x parser — with a single ordered table there is no
// second list left to disagree with.

// The SBF field types (reference guide §4.1) and the CMA `Type` they map to.
// c1[X] strings are `string`; there are no 64-bit integers in SBF.
export type SBFType =
  | 'char' | 'string'
  | 'int8' | 'int16' | 'int32'
  | 'uint8' | 'uint16' | 'uint32'
  | 'float32' | 'float64'

// One scalar body field, exactly as the datasheet lists it.
export interface ScalarDefinition {
  name: string
  type: SBFType
  // Number of characters — c1[X] only, where the datasheet gives a fixed width.
  length?: number
  // c1[Field]: the width is carried by ANOTHER field of the same block, named
  // here (RxMessage's `Message c1[StringLn]`, Comment's `Comment c1[CommentLn]`).
  lengthFrom?: string
  // When the `lengthFrom` field's value is not itself a byte count but something
  // the byte count is DERIVED from. GALSARRLM's `RLMBits u4[N]` is the case: N is
  // "3 for a short message (RLMLength 80) and 5 for a long one (160)", i.e. the
  // sibling carries a BIT count and the field is that many bits rounded up to
  // whole 32-bit words. Without this the width would be read as 80 bytes.
  lengthOf?: (value: number) => number
  // The field runs to the end of the body, because the datasheet gives no length
  // for it (Commands' `CmdData u1[N]`, where N is never defined). Trailing
  // padding is therefore part of its `raw` — harmless, since a c1 value stops at
  // the first NUL and §4.1.5 says padding content is undefined anyway.
  rest?: boolean
  // A BYTE ARRAY that is not text: a MAC address (`u1[6]`), an IP address
  // (`u1[16]`). CMA has no byte type — deliberately — so the honest `value` is
  // the address as a formatted string, which this turns the raw bytes into. The
  // bytes themselves stay in `raw`, as they do for every field. Declared with
  // `type: 'string'` and a `length`, so the width still comes from the table.
  format?: (bytes: Uint8Array) => string
  units?: string
  description?: string
  // The raw value (BEFORE any scale factor, per §4.1.7) meaning "not
  // available". Such a field decodes to `value: null`.
  doNotUse?: number
  // §4.1.6: reserved fields may be repurposed by a later revision, so decoding
  // software must ignore their contents. Kept in the payload for 1:1 alignment
  // with the datasheet's row order, flagged for consumers.
  reserved?: boolean
}

// A run of N sub-blocks (§4.1.4), e.g. AuxAntPositions' AuxAntPositionSub.
// `count` names the field carrying N. `length` names the field carrying
// SBLength, when the block has one: it is then honoured rather than assumed, so
// a firmware that grows a sub-block is skipped cleanly instead of walking the
// parser off the end. Blocks whose repetition is a plain array of a fixed-size
// element (QualityInd's `Indicators u2[N]`) have no such field and omit it.
export interface SubBlockDefinition {
  name: string
  // The field carrying N — or a literal count, for the FIXED-size arrays the
  // SBAS blocks are full of (`UDREI u1[51]`, `ai u1[51]`, `IODF u1[4]`): the
  // datasheet states the size outright, so there is no field to point at.
  count: number | string
  length?: string
  fields: readonly FieldDefinition[]
  description?: string
  // Decoders that apply only INSIDE this sub-block, layered over the block's
  // own. Needed because a field name can mean two different things in two
  // sub-blocks of the same block: MeasEpoch's `CarrierLSB` is the ABSOLUTE
  // carrier phase in a Type1 sub-block and a phase RELATIVE to the master
  // measurement in a Type2 one. Decoders are keyed by name, so without a scope
  // the two would share one function and half the occurrences would be wrong.
  decoders?: Readonly<Record<string, Decoder>>
}

export type FieldDefinition = ScalarDefinition | SubBlockDefinition

export const isSubBlock = (definition: FieldDefinition): definition is SubBlockDefinition =>
  'fields' in definition

// Bitfields, masks, enums and scaled values are not CMA types. The field keeps
// its integer `value` and its datasheet `units`; everything richer is returned
// by a decoder into that field's metadata — including the converted value, as
// `{ value, units }` (see docs/CMA.md and docs/STATUS.md §LOCKED decisions).
export type Decoder = (value: number, values: Readonly<Record<string, Value>>) => Metadata

// Which clock the block's TOW/WNc refers to (Appendix B, "Time stamp" column):
//   receiver — synchronous data generated at a receiver epoch (PVT, attitude)
//   sis      — signal-in-space: when the satellite transmitted the bits, which
//              may be far in the past, so it is NOT promoted to cma.timestamp
//   external — an external trigger (ExtEvent)
export type TimestampKind = 'external' | 'receiver' | 'sis'

export interface BlockDefinition {
  name: string
  number: number
  description?: string
  timestamp: TimestampKind
  // Indexed BY revision: revisions[2] is revision 2's field list. §4.1.6
  // guarantees a later revision only ADDS fields, so each entry is built by
  // spreading the previous one. A frame whose revision is higher than anything
  // here decodes at the highest known revision — never silently at revision 0.
  revisions: readonly (readonly FieldDefinition[])[]
  decoders?: Readonly<Record<string, Decoder>>
  // Values aggregated from ≥2 fields, published at cma.metadata.payload.
  payloadMetadata?: (values: Readonly<Record<string, Value>>) => Metadata
  // Septentrio publishes no definition for this block's body (PVTSupport,
  // PVTSupportA: "internal parameters for maintenance and support"). The body
  // is published as opaque bytes at metadata.body instead of being called
  // padding, which it is not.
  opaque?: boolean
}

export type BlockRegistry = ReadonlyMap<number, BlockDefinition>

// PARSER

// The protocols a Septentrio receiver can speak. Only SBF is implemented; the
// facade exists so NMEA can be added by composition, exactly as norsub-emru
// does, without changing the device-level API.
export const SEPTENTRIO_PROTOCOLS = ['sbf'] as const
export type SeptentrioProtocol = typeof SEPTENTRIO_PROTOCOLS[number]

export interface SBFParserOptions extends ParserOptions {
  firmware?: string
}

export interface SeptentrioParserOptions extends SBFParserOptions {
  protocol?: SeptentrioProtocol
}

// Structured errors, never thrown — every fallible call returns a Result. Same
// `{ kind, message }` shape as nmea-parser's NMEAError.
export interface SBFError {
  kind: 'unknown-block' | 'unknown-firmware' | 'unknown-protocol' | 'unknown-revision'
  message: string
}

// What `getFakeSentence` accepts: the revision to fabricate, the time stamp, and
// per-field overrides by NAME (the same names the payload reports).
export interface FakeOptions {
  revision?: number
  tow?: number
  wnc?: number
  fields?: Readonly<Record<string, number | string>>
  // Fill every field the caller did not override with varied values instead of
  // 0. With no options at all the frame is IDEMPOTENT — the same bytes every
  // time — because a fake frame is meant to be committed into a spec or an
  // example flow. This is the opt-out for hammering a decoder.
  random?: boolean
}

// SELF-DESCRIPTION — what `getSentenceDefinition` returns, one entry per
// revision. CMA-shaped: the keys a parsed sentence has, minus the ones only a
// real parse can fill, with `payload` holding field definitions.
export interface ScalarSpec {
  name: string
  type: SBFType
  units?: string
  description?: string
  doNotUse?: number
  reserved?: boolean
}

export interface SubBlockSpec {
  name: string
  description?: string
  // A field name, or a literal size for a fixed-length array.
  count: number | string
  length?: string
  fields: FieldSpec[]
}

export type FieldSpec = ScalarSpec | SubBlockSpec

export interface SBFSentenceDefinition {
  id: string
  name: string
  protocol: { name: string, version: string }
  revision: number
  timestamp: TimestampKind
  payload: FieldSpec[]
  description?: string
  opaque?: boolean
}

// What the engine returns for one block body.
export interface DecodedBody {
  payload: Field[]
  values: Record<string, Value>
  // Sub-block fields grouped by occurrence, mirrored at metadata.subBlocks so
  // a consumer can read occurrence i without index arithmetic. Empty when the
  // block has no sub-blocks.
  subBlocks: Field[][]
  // Trailing bytes not covered by the table. Per §4.1.5 their value is
  // undefined and must not be looked at, so they are never read as a number.
  padding: Uint8Array
  errors: string[]
}
