// installed
import { generator } from '@coremarine/protocol-core'
import type { Result } from '@coremarine/protocol-core'
import crc16xmodem from 'crc/calculators/crc16xmodem'

// coded
import {
  BLOCK_REVISION_SHIFT,
  BODY_INDEX,
  CRC_INDEX,
  ID_INDEX,
  LENGTH_INDEX,
  LENGTH_MULTIPLE,
  SYNC_1,
  SYNC_2,
  TOW_INDEX,
  TYPE_BYTES,
  WNC_INDEX,
} from './constants'
import { isSubBlock } from './types'
import type { BlockDefinition, BlockRegistry, FakeOptions, FieldDefinition, SBFError, SBFType, ScalarDefinition, SubBlockDefinition } from './types'

// FAKE FRAMES ---------------------------------------------------------------
// Fabricate a wire frame for tests, demos and Node-RED example flows, from the
// same field tables the parser decodes with.
//
// **IDEMPOTENT** with no options (cru's rule for every parser): a fake frame is
// meant to be committed — into a spec, an example flow, a bug report — so the
// same call must return the same bytes forever. Unlike the text protocols there
// are no example frames in the datasheets to copy, so the defaults are zeros and
// a fixed TOW/WNc. `{ random: true }` fills the unspecified fields with varied
// values instead, still seeded, for hammering the decoders.
//
// What makes it useful either way is the round trip — a fake frame carries a real
// CRC and a real Length, so `parseData(getFakeSentence(id))` must come back as a
// clean CMA for that block. That is a smoke test for every block ever modelled.

// A deterministic instant: GPS week 2264, 380224000 ms into the week
// (2023-05-18T09:37:04Z once the leap seconds come off).
const DEFAULT_TOW = 380_224_000
const DEFAULT_WNC = 2264
// Enough repetitions to exercise a sub-block run without inventing bulk.
const DEFAULT_SUB_BLOCK_COUNT = 1

const scalarSize = (definition: ScalarDefinition, value?: number | string): number => {
  // A variable-width string is as long as what we are about to write; a
  // rest-of-body field likewise. Anything else has a fixed width.
  if (definition.rest === true || definition.lengthFrom !== undefined) return String(value ?? '').length
  return (definition.type === 'string') ? (definition.length ?? 1) : TYPE_BYTES[definition.type]
}

// One writer per numeric type, mirroring the engine's readers. A table rather
// than a chain of ifs: the engine reads with a switch it can check for
// exhaustiveness, and this is the same trick for the write direction.
type NumericType = Exclude<SBFType, 'char' | 'string'>

const WRITERS: Readonly<Record<NumericType, (view: DataView, offset: number, value: number) => void>> = {
  int8: (view, offset, value) => view.setInt8(offset, value),
  int16: (view, offset, value) => view.setInt16(offset, value, true),
  int32: (view, offset, value) => view.setInt32(offset, value, true),
  uint8: (view, offset, value) => view.setUint8(offset, value),
  uint16: (view, offset, value) => view.setUint16(offset, value, true),
  uint32: (view, offset, value) => view.setUint32(offset, value, true),
  float32: (view, offset, value) => view.setFloat32(offset, value, true),
  float64: (view, offset, value) => view.setFloat64(offset, value, true),
}

const writeScalar = (view: DataView, offset: number, definition: ScalarDefinition, value: number | string, size: number): void => {
  if (definition.type === 'char' || definition.type === 'string') {
    const text = String(value)
    for (let index = 0; index < size; index++) {
      view.setUint8(offset + index, text.charCodeAt(index) || 0)
    }
    return
  }
  WRITERS[definition.type](view, offset, Number(value))
}

interface Plan {
  definition: ScalarDefinition
  value: number | string
  // An explicit byte width, for a field whose size is DERIVED from a SIBLING's
  // value rather than from its own (GALSARRLM's `RLMBits`). It cannot be computed
  // from the plan's own value — that is the content, not the size — so it is
  // resolved once, after every sibling's value is known.
  width?: number
}

// The width the engine will read a field back at.
const planSize = (plan: Plan): number => plan.width ?? scalarSize(plan.definition, plan.value)

// Flatten the table the way the engine will read it back, resolving sub-block
// counts first so the fake and the parse agree on the layout.
const planFields = (definitions: readonly FieldDefinition[], options: FakeOptions, plans: Plan[]): void => {
  const fields = options.fields ?? {}
  for (const definition of definitions) {
    if (isSubBlock(definition)) {
      const count = subBlockCount(definition, fields)
      for (let index = 0; index < count; index++) {
        planFields(definition.fields, options, plans)
      }
      continue
    }
    const provided = fields[definition.name]
    const filler = isText(definition) ? '' : numericFiller(definition, plans.length, options)
    plans.push({ definition, value: provided ?? filler })
  }
}

const isText = (definition: ScalarDefinition): boolean =>
  definition.type === 'char' || definition.type === 'string'

// How many occurrences to fabricate. A literal count is the datasheet's own fixed
// array size and must be honoured exactly — writing one element of a `u1[51]`
// would produce a frame the engine then reads 51 elements out of.
const subBlockCount = (definition: SubBlockDefinition, fields: Readonly<Record<string, number | string>>): number =>
  (typeof definition.count === 'number')
    ? definition.count
    : Number(fields[definition.count] ?? DEFAULT_SUB_BLOCK_COUNT)

// What an unspecified numeric field is filled with. Zero by default — the frame
// is then idempotent, and every Do-Not-Use-on-zero field reads as "not
// available", which is honest for a fabricated frame.
const numericFiller = (definition: ScalarDefinition, position: number, options: FakeOptions): number => {
  if (options.random !== true) return 0
  // Seeded from the field's name AND position, so the frame stays reproducible
  // even with `random: true` — varied, not chaotic.
  const draw = generator(`${definition.name}:${position}`, false)()
  return (definition.type === 'float32' || definition.type === 'float64') ? draw * 100 : Math.floor(draw * 100)
}

// The count/length fields have to describe what we actually wrote, or the frame
// would not parse back — a fake that cannot be read is worse than no fake.
//
// RECURSES into nested sub-blocks, because a two-level block carries its inner
// count and stride in the OUTER sub-block's fields (MeasEpoch's `N2` and the
// header's `SB2Length`, ChannelStatus' `N2`/`SB2Length`). Left unsized those
// stayed 0, so the frame still parsed — the inner occurrences we had written
// were simply read back as padding, and the nested path was never exercised at
// all. A round trip that quietly skips half the structure is not a round trip.
const sizeSubBlocks = (definitions: readonly FieldDefinition[], options: FakeOptions, plans: Plan[]): void => {
  for (const definition of definitions) {
    if (!isSubBlock(definition)) continue
    const count = subBlockCount(definition, options.fields ?? {})
    // §4.1.4: a sub-block's declared length EXCLUDES its nested sub-blocks.
    const size = definition.fields.reduce((sum, field) => sum + (isSubBlock(field) ? 0 : scalarSize(field)), 0)
    for (const plan of plans) {
      if (plan.definition.name === definition.count) plan.value = count
      if (definition.length !== undefined && plan.definition.name === definition.length) plan.value = size
    }
    sizeSubBlocks(definition.fields, options, plans)
  }
}

// Same for a `c1[Field]` string: the field carrying its length has to agree with
// the string we wrote, or the parse walks off the end.
const sizeStrings = (definitions: readonly FieldDefinition[], plans: Plan[]): void => {
  for (const definition of definitions) {
    if (isSubBlock(definition)) {
      sizeStrings(definition.fields, plans)
      continue
    }
    if (definition.lengthFrom === undefined) continue
    // A derived width (lengthOf) reads its sibling rather than describing it, so
    // the sibling keeps whatever the caller asked for and the field follows it.
    if (definition.lengthOf !== undefined) continue
    const written = plans.find((plan) => plan.definition.name === definition.name)
    if (written === undefined) continue
    for (const plan of plans) {
      if (plan.definition.name === definition.lengthFrom) plan.value = String(written.value).length
    }
  }
}

// A `lengthOf` field's width comes from the SIBLING named by `lengthFrom`, so it
// can only be resolved once that sibling's own plan value is settled. Sizing it
// from its own value — which for a formatted byte array is an empty string —
// silently produced a zero-width field and a frame 12 bytes short.
const sizeDerived = (definitions: readonly FieldDefinition[], plans: Plan[]): void => {
  for (const definition of definitions) {
    if (isSubBlock(definition)) {
      sizeDerived(definition.fields, plans)
      continue
    }
    if (definition.lengthOf === undefined || definition.lengthFrom === undefined) continue
    const carrier = plans.find((plan) => plan.definition.name === definition.lengthFrom)
    if (carrier === undefined) continue
    for (const plan of plans) {
      if (plan.definition.name === definition.name) plan.width = definition.lengthOf(Number(carrier.value))
    }
  }
}

const bodyLength = (plans: Plan[]): number =>
  plans.reduce((sum, plan) => sum + planSize(plan), 0)

export const createFakeFrame = (definition: BlockDefinition, options: FakeOptions = {}): Uint8Array => {
  const revision = Math.min(options.revision ?? definition.revisions.length - 1, definition.revisions.length - 1)
  const plans: Plan[] = []
  planFields(definition.revisions[revision], options, plans)
  sizeSubBlocks(definition.revisions[revision], options, plans)
  sizeStrings(definition.revisions[revision], plans)
  sizeDerived(definition.revisions[revision], plans)
  // §4.1.1: the total length is always a multiple of 4, padded if needed.
  const unpadded = BODY_INDEX + bodyLength(plans)
  const length = Math.ceil(unpadded / LENGTH_MULTIPLE) * LENGTH_MULTIPLE
  const frame = new Uint8Array(length)
  const view = new DataView(frame.buffer)
  view.setUint8(0, SYNC_1)
  view.setUint8(1, SYNC_2)
  view.setUint16(ID_INDEX, definition.number | (revision << BLOCK_REVISION_SHIFT), true)
  view.setUint16(LENGTH_INDEX, length, true)
  view.setUint32(TOW_INDEX, options.tow ?? DEFAULT_TOW, true)
  view.setUint16(WNC_INDEX, options.wnc ?? DEFAULT_WNC, true)
  let offset = BODY_INDEX
  for (const plan of plans) {
    writeScalar(view, offset, plan.definition, plan.value, planSize(plan))
    offset += planSize(plan)
  }
  // Computed last, over ID..end, exactly as a receiver would (§4.1.1).
  view.setUint16(CRC_INDEX, crc16xmodem(frame.subarray(ID_INDEX)) >>> 0, true)
  return frame
}

export const createFakeSentence = (blocks: BlockRegistry, id: number | string, options: FakeOptions = {}): Result<Uint8Array, SBFError[]> => {
  const definition = blocks.get(Number(id))
  if (definition === undefined) {
    return { success: false, error: [{ kind: 'unknown-block', message: `Block ${String(id)} is not modelled, so it cannot be fabricated` }] }
  }
  if (options.revision !== undefined && options.revision >= definition.revisions.length) {
    return { success: false, error: [{ kind: 'unknown-revision', message: `Block ${definition.name} has revisions 0-${definition.revisions.length - 1}, not ${options.revision}` }] }
  }
  return { success: true, value: createFakeFrame(definition, options) }
}
