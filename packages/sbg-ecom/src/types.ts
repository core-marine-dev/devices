// installed
import type { Field, Metadata, ParserOptions, Value } from '@coremarine/protocol-core'

/* sbgECom logs are DESCRIBED, not hand-decoded. Each log declares its body as a
   table of field definitions in datasheet order — plus decoders for the bitfields
   and enums, which are the only real logic — and one shared engine derives every
   byte offset, raw slice and truncation check from it.

   The 0.0.x parser hand-wrote an offset per field (`payload.readFloatLE(36)`),
   which is exactly how GPS_POS came to read UNDULATION as a float64 at offset 36
   when the datasheet says a 4-byte float: the read overlapped the next field and
   nothing disagreed with it, because the offsets were the only list. With one
   ordered table there is no second list left to be wrong. */

// The sbgECom field types. All little-endian (§2.1.1 Note 2), signed integers
// two's complement. No strings and no 64-bit integers appear in the LOG class.
export type SBGType =
  | 'int8' | 'int16' | 'int32'
  | 'uint8' | 'uint16' | 'uint32'
  | 'float32' | 'float64'

// One body field, exactly as the datasheet lists it.
export interface FieldDefinition {
  name: string
  type: SBGType
  units?: string
  description?: string
  // Reserved for future use: kept in the payload so `payload[i]` stays aligned
  // 1:1 with the datasheet's rows, flagged so nobody reads it.
  reserved?: boolean
}

// Bitmasks, enums and scaled values are not CMA types. The field keeps its
// integer `value` and its datasheet `units`; everything richer is returned by a
// decoder into that field's metadata. See docs/CMA.md §"Metadata levels".
export type Decoder = (value: number, values: Readonly<Record<string, Value>>) => Metadata

export interface LogDefinition {
  name: string
  // The message id WITHIN the class. Identity is the PAIR (class, message) —
  // see `logId` in src/utils.ts and docs/STATUS.md D4.
  message: number
  description?: string
  fields: readonly FieldDefinition[]
  decoders?: Readonly<Record<string, Decoder>>
  // Values aggregated from >= 2 fields, published at cma.metadata.payload.
  payloadMetadata?: (values: Readonly<Record<string, Value>>) => Metadata
  /* The datasheet publishes no field layout for this body — GPS1/2_RAW ("raw data
     as returned by the receiver") and RTCM_RAW. The body is published as opaque
     bytes at metadata.body instead of being decoded into invented fields. */
  opaque?: boolean
  /* The bytes AFTER the table are a NUL-terminated ASCII string, not more fields:
     DIAG's `MESSAGE`. They are published as text at metadata.message, in addition
     to the base64 every trailing run gets. Without this the only diagnostic log
     the device has would arrive as base64 a human has to decode by hand. */
  trailingText?: boolean
}

// Keyed by message id, one registry per class.
export type LogRegistry = ReadonlyMap<number, LogDefinition>
// Keyed by class byte. Only class 0 has entries in 1.0.0; a frame from a class
// with no registry is IDENTIFIED, not garbage.
export type ClassRegistry = ReadonlyMap<number, LogRegistry>

// PARSER

export interface SBGParserOptions extends ParserOptions {
  firmware?: string
}

// Structured errors, never thrown — every fallible call returns a Result. Same
// `{ kind, message }` shape as the other parsers in this repo.
export interface SBGError {
  kind: 'unknown-firmware' | 'unknown-log'
  message: string
}

// What `getFakeSentence` accepts: the device time stamp, per-field overrides by
// NAME (the same names the payload reports), and the large-frame pagination.
export interface FakeOptions {
  timestamp?: number
  fields?: Readonly<Record<string, number>>
  // Fabricate a LARGE frame carrying this page header. Present so the
  // large-frame path is testable at all: no ELLIPSE emits one (§2.1.2.1).
  large?: LargePage
  // Fill every field the caller did not override with varied values instead of
  // 0. With no options at all a fake frame is IDEMPOTENT — the same bytes every
  // time — because it is meant to be committed into a spec or an example flow.
  random?: boolean
}

export interface LargePage {
  transmissionId?: number
  pageIndex?: number
  pages?: number
  data?: Uint8Array
}

// SELF-DESCRIPTION — what `getSentenceDefinition` returns. CMA-shaped: the keys
// a parsed sentence has, minus the ones only a real parse can fill.
export interface SBGFieldSpec {
  name: string
  type: SBGType
  units?: string
  description?: string
  reserved?: boolean
}

export interface SBGSentenceDefinition {
  id: string
  name: string
  protocol: { name: string, version: string }
  payload: SBGFieldSpec[]
  description?: string
  opaque?: boolean
}

// What the engine returns for one log body.
export interface DecodedBody {
  payload: Field[]
  values: Record<string, Value>
  // Bytes past the end of the table. Unlike SBF there is no padding rule here:
  // a frame longer than its definition means the device is running a firmware
  // that GREW the log, so the extra bytes are published rather than ignored.
  trailing: Uint8Array
  errors: string[]
}
