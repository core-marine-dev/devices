// installed
import { toBase64 } from '@coremarine/protocol-core'
import type { Field, Metadata, Value } from '@coremarine/protocol-core'

// coded
import { TYPE_BYTES } from './constants'
import { isSubBlock } from './types'
import type { DecodedBody, Decoder, FieldDefinition, SBFType, ScalarDefinition, SubBlockDefinition } from './types'

// The one decoder for every SBF block body. It walks a block's field-definition
// table and derives what used to be hand-written per block: the byte offset of
// each field, its raw slice, the little-endian read, the Do-Not-Use check and
// where the padding starts. Nothing here knows about any specific block.

type NumericType = Exclude<SBFType, 'char' | 'string'>

// A field's width. Fixed for every numeric type; for a c1[..] string it can be a
// constant, a value read from a sibling field, or "whatever is left".
const byteLength = (definition: ScalarDefinition): number =>
  (definition.type === 'string') ? (definition.length ?? 1) : TYPE_BYTES[definition.type]

const variableLength = (definition: ScalarDefinition, values: Record<string, Value>, body: Uint8Array, offset: number): number => {
  if (definition.rest === true) return Math.max(0, body.byteLength - offset)
  if (definition.lengthFrom !== undefined) {
    const carried = Number(values[definition.lengthFrom] ?? 0)
    // The sibling may carry the width itself, or something it is derived from.
    return Math.max(0, (definition.lengthOf === undefined) ? carried : definition.lengthOf(carried))
  }
  return byteLength(definition)
}

// c1[X]: ASCII, right-padded with 0 bytes (§4.1). The padding is not part of
// the value.
const readString = (bytes: Uint8Array): string => {
  let text = ''
  for (const byte of bytes) {
    if (byte === 0) break
    text += String.fromCharCode(byte)
  }
  return text
}

// Every multi-byte SBF type is little-endian (§4.1), and signed integers are
// two's complement — which is exactly what DataView gives us.
const readNumber = (view: DataView, offset: number, type: NumericType): number => {
  switch (type) {
    case 'int8': return view.getInt8(offset)
    case 'int16': return view.getInt16(offset, true)
    case 'int32': return view.getInt32(offset, true)
    case 'uint8': return view.getUint8(offset)
    case 'uint16': return view.getUint16(offset, true)
    case 'uint32': return view.getUint32(offset, true)
    case 'float32': return view.getFloat32(offset, true)
    case 'float64': return view.getFloat64(offset, true)
  }
}

interface ScalarFlags {
  doNotUse: boolean
  broken: boolean
}

const decorate = (field: Field, definition: ScalarDefinition, { doNotUse, broken }: ScalarFlags): Field => {
  if (definition.units !== undefined) field.units = definition.units
  if (definition.description !== undefined) field.description = definition.description
  if (broken) field.errors = [`${definition.name}: not a finite number`]
  // Says WHY the value is null: the receiver marked the field unavailable, and
  // with which sentinel — which for some fields is 0, so the flag cannot be the
  // sentinel itself.
  if (doNotUse) field.metadata = { doNotUse: true, value: definition.doNotUse }
  // §4.1.6: a reserved field may be repurposed by a later revision, so a
  // consumer must not read it. Kept in the payload to stay aligned 1:1 with the
  // datasheet's rows, flagged so nobody uses it.
  if (definition.reserved === true) field.metadata = { ...field.metadata, reserved: true }
  return field
}

const buildScalar = (body: Uint8Array, view: DataView, offset: number, definition: ScalarDefinition, size: number): Field => {
  const bytes = body.subarray(offset, offset + size)
  let wire: number | string
  if (definition.format !== undefined) {
    // A byte array with a documented human form (MAC, IPv4/IPv6).
    wire = definition.format(bytes)
  } else if (definition.type === 'char') {
    wire = String.fromCharCode(bytes[0])
  } else if (definition.type === 'string') {
    wire = readString(bytes)
  } else {
    wire = readNumber(view, offset, definition.type)
  }
  const doNotUse = definition.doNotUse !== undefined && wire === definition.doNotUse
  // A non-finite float means corrupt or uninitialised data. It must not reach
  // `value`: JSON turns NaN/Infinity into null, which would be indistinguishable
  // from a legitimately empty field.
  const broken = typeof wire === 'number' && !Number.isFinite(wire)
  const field: Field = {
    raw: toBase64(bytes),
    name: definition.name,
    type: definition.type,
    value: (doNotUse || broken) ? null : wire,
  }
  return decorate(field, definition, { doNotUse, broken })
}

interface WalkState {
  fields: Field[]
  values: Record<string, Value>
  subBlocks: Field[][]
  errors: string[]
  offset: number
  decoders: Readonly<Record<string, Decoder | undefined>>
  // Indices of fields whose decoder has already run, because they belong to a
  // sub-block occurrence and were decoded while that occurrence's own values
  // were still the ones in `values`. See `walkOccurrence`.
  decoded: Set<number>
}

type Walk = (body: Uint8Array, view: DataView, definitions: readonly FieldDefinition[], state: WalkState) => void

// Returns false when the body ran out mid-field, which stops the walk: every
// later offset would be a guess.
const pushScalar = (body: Uint8Array, view: DataView, definition: ScalarDefinition, state: WalkState): boolean => {
  const size = variableLength(definition, state.values, body, state.offset)
  if (state.offset + size > body.byteLength) {
    state.errors.push(`Body truncated: field ${definition.name} needs bytes ${state.offset}-${state.offset + size - 1} of ${body.byteLength}`)
    return false
  }
  const field = buildScalar(body, view, state.offset, definition, size)
  state.fields.push(field)
  state.values[definition.name] = field.value
  state.offset += size
  return true
}

// Decoders run after the fields of their scope have been read, so a decoder can
// see its siblings (MeasEpoch's pseudorange needs CodeMSB from `Misc` plus
// `CodeLSB`). A field whose value is null — Do-Not-Use, or unreadable — is never
// handed to a decoder. `skip` holds indices already decoded in a narrower scope.
const applyDecoders = (
  fields: Field[],
  values: Record<string, Value>,
  decoders: Readonly<Record<string, Decoder | undefined>>,
  skip?: ReadonlySet<number>,
): void => {
  for (const [index, field] of fields.entries()) {
    const decoder = decoders[field.name]
    if (decoder === undefined || typeof field.value !== 'number' || skip?.has(index) === true) continue
    const metadata: Metadata = decoder(field.value, values)
    if (Object.keys(metadata).length === 0) continue
    fields[index] = { ...field, metadata: { ...field.metadata, ...metadata } }
  }
}

// A sub-block run (§4.1.4): `count` occurrences of a nested field list, each
// occupying the `length` (SBLength) the block itself reports. Honouring that
// length rather than the table's own size is what lets a firmware GROW a
// sub-block without the parser drifting. Repeated field names collapse in
// `values` (last occurrence wins), so each occurrence decodes ITSELF before the
// next one overwrites them; grouped access is via `subBlocks`.
//
// `recurse` is passed in rather than referenced directly: sub-blocks nest
// (MeasEpoch has sub-sub-blocks), and this keeps the two functions independent
// instead of mutually recursive.
//
// One occurrence: its own scalars, decoded in their own scope, then the declared
// stride, then any nested run.
const walkOccurrence = (body: Uint8Array, view: DataView, parts: SubBlockParts, declared: number, state: WalkState, recurse: Walk): boolean => {
  const start = state.offset
  const from = state.fields.length
  const errors = state.errors.length
  recurse(body, view, parts.own, state)
  if (state.errors.length > errors) return false
  decodeScope(state, from, parts.decoders)
  if (declared > 0) state.offset = start + declared
  if (parts.nested.length > 0) {
    recurse(body, view, parts.nested, state)
    if (state.errors.length > errors) return false
  }
  state.subBlocks.push(state.fields.slice(from))
  return true
}

// Runs the decoders for the fields from `from` onwards, while `values` still
// holds THIS occurrence's values, and marks them done so the final pass skips
// them. Without this, a cross-field decoder in a repeated sub-block would read
// the LAST occurrence's siblings — right for occurrence N, wrong for 1..N-1.
// `scoped` are the sub-block's own decoders, which win over the block's.
const decodeScope = (state: WalkState, from: number, scoped: Readonly<Record<string, Decoder>>): void => {
  const scope = state.fields.slice(from)
  applyDecoders(scope, state.values, { ...state.decoders, ...scoped })
  for (const [index, field] of scope.entries()) {
    state.fields[from + index] = field
    state.decoded.add(from + index)
  }
}

interface SubBlockParts {
  own: readonly FieldDefinition[]
  nested: readonly FieldDefinition[]
  decoders: Readonly<Record<string, Decoder>>
}

const walkSubBlock = (body: Uint8Array, view: DataView, definition: SubBlockDefinition, state: WalkState, recurse: Walk): boolean => {
  // A literal count is a fixed-size array the datasheet sizes outright; a string
  // names the field carrying N.
  const count = (typeof definition.count === 'number') ? definition.count : Number(state.values[definition.count] ?? 0)
  // No SBLength field — a plain fixed-size array like QualityInd's `Indicators
  // u2[N]` — means the table's own size IS the stride.
  const declared = (definition.length === undefined) ? 0 : Number(state.values[definition.length] ?? 0)
  // A sub-block may itself contain a run of sub-blocks (ChannelStatus:
  // ChannelSatInfo -> N2 x ChannelStateInfo; OutputLink: OutputStatsSub -> N2 x
  // OutputTypeSub). The datasheet is explicit that the declared length EXCLUDES
  // those nested blocks, so the declared length applies to the OWN fields only,
  // and the nested runs advance by their own stride after it.
  const nestedFrom = definition.fields.findIndex(isSubBlock)
  const decoders = definition.decoders ?? {}
  const parts: SubBlockParts = (nestedFrom === -1)
    ? { own: definition.fields, nested: [], decoders }
    : { own: definition.fields.slice(0, nestedFrom), nested: definition.fields.slice(nestedFrom), decoders }
  for (let index = 0; index < count; index++) {
    if (!walkOccurrence(body, view, parts, declared, state, recurse)) return false
  }
  return true
}

const walk: Walk = (body, view, definitions, state) => {
  for (const definition of definitions) {
    if (isSubBlock(definition)) {
      if (!walkSubBlock(body, view, definition, state, walk)) return
      continue
    }
    if (!pushScalar(body, view, definition, state)) return
  }
}

export const decodeBody = (
  body: Uint8Array,
  definitions: readonly FieldDefinition[],
  decoders: Readonly<Record<string, Decoder | undefined>> = {},
): DecodedBody => {
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
  const state: WalkState = { fields: [], values: {}, subBlocks: [], errors: [], offset: 0, decoders, decoded: new Set() }
  walk(body, view, definitions, state)
  // Everything not already decoded inside a sub-block occurrence: the block's
  // own top-level fields, whose siblings are unambiguous.
  applyDecoders(state.fields, state.values, decoders, state.decoded)
  return {
    payload: state.fields,
    values: state.values,
    subBlocks: state.subBlocks,
    padding: body.subarray(state.offset),
    errors: state.errors,
  }
}
