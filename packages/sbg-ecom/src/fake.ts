// installed
import { generator } from '@coremarine/protocol-core'
import type { Result } from '@coremarine/protocol-core'

// coded
import {
  CLASS_INDEX,
  CLASS_MASK,
  CRC_LENGTH,
  DATA_INDEX,
  ETX,
  LARGE_FRAME_FLAG,
  LARGE_HEADER_LENGTH,
  LENGTH_INDEX,
  MSG_INDEX,
  SYNC_1,
  SYNC_2,
  TIME_STAMP_FIELD,
  TYPE_BYTES,
} from './constants'
import { logsFor } from './firmware'
import { frameCRC } from './protocol-ecom'
import type { FakeOptions, FieldDefinition, LargePage, LogDefinition, SBGError, SBGType } from './types'

/* Fabricating a wire frame from the same field table the parser reads — with a real
   CRC and a real LEN, so it parses straight back.

   DETERMINISTIC by default: the same request returns the same bytes forever, which
   is what makes a fake frame usable in a committed spec or example flow. `random:
   true` is the opt-out, for hammering a decoder.

   ⚠️ A ROUND TRIP THROUGH THIS FILE PROVES ALMOST NOTHING ON ITS OWN. It builds the
   frame from the same table the parser decodes it with, so the two agree even when
   the table is wrong — that is how septentrio shipped a block numbered 4216 instead
   of 4217 with a green suite. What catches a wrong table is the datasheet (checked by
   hand) and a REAL CAPTURE (tests/fixtures/). This is for exercising the framing. */

// One writer per type, keyed like the engine's reader so the two stay symmetrical.
const WRITERS: Readonly<Record<SBGType, (view: DataView, offset: number, value: number) => void>> = {
  int8: (view, offset, value) => view.setInt8(offset, value),
  int16: (view, offset, value) => view.setInt16(offset, value, true),
  int32: (view, offset, value) => view.setInt32(offset, value, true),
  uint8: (view, offset, value) => view.setUint8(offset, value),
  uint16: (view, offset, value) => view.setUint16(offset, value, true),
  uint32: (view, offset, value) => view.setUint32(offset, value, true),
  float32: (view, offset, value) => view.setFloat32(offset, value, true),
  float64: (view, offset, value) => view.setFloat64(offset, value, true),
}

// A value that fits the type and is not zero, so a decoder actually runs. Seeded
// from the log and field name, so it is stable across calls but differs per field.
const variedValue = (definition: FieldDefinition, label: string, random: boolean): number => {
  const raw = generator(label, random)()
  if (definition.type === 'float32' || definition.type === 'float64') return Math.round(raw * 100_000) / 1000
  const width = TYPE_BYTES[definition.type] * 8
  const signed = definition.type.startsWith('int')
  const ceiling = 2 ** (signed ? width - 1 : width)
  return Math.floor(raw * ceiling) % ceiling
}

const bodyLength = (definition: LogDefinition): number =>
  definition.fields.reduce((total, field) => total + TYPE_BYTES[field.type], 0)

// The default for a field with no override: the requested time stamp, a varied
// value, or zero.
const defaultValue = (field: FieldDefinition, log: string, options: FakeOptions): number => {
  if (field.name === TIME_STAMP_FIELD && options.timestamp !== undefined) return options.timestamp
  // A reserved field stays 0 whatever `random` says: its content is undefined by the
  // datasheet, so inventing one would be misleading in a fixture.
  if (field.reserved === true) return 0
  if (options.random !== true) return 0
  return variedValue(field, `${log}:${field.name}`, false)
}

const fillBody = (view: DataView, definition: LogDefinition, options: FakeOptions): void => {
  const overrides = options.fields ?? {}
  let offset = 0
  for (const field of definition.fields) {
    const value = overrides[field.name] ?? defaultValue(field, definition.name, options)
    WRITERS[field.type](view, offset, value)
    offset += TYPE_BYTES[field.type]
  }
}

const largeBody = (page: LargePage): { length: number, write: (view: DataView, bytes: Uint8Array) => void } => {
  const data = page.data ?? new Uint8Array(0)
  return {
    length: LARGE_HEADER_LENGTH + data.byteLength,
    write: (view, bytes) => {
      view.setUint8(DATA_INDEX, page.transmissionId ?? 0)
      view.setUint16(DATA_INDEX + 1, page.pageIndex ?? 0, true)
      view.setUint16(DATA_INDEX + 3, page.pages ?? 1, true)
      bytes.set(data, DATA_INDEX + LARGE_HEADER_LENGTH)
    },
  }
}

const build = (messageClass: number, message: number, dataLength: number, large: boolean): { bytes: Uint8Array, view: DataView } => {
  const bytes = new Uint8Array(DATA_INDEX + dataLength + CRC_LENGTH + 1)
  const view = new DataView(bytes.buffer)
  bytes[0] = SYNC_1
  bytes[1] = SYNC_2
  view.setUint8(MSG_INDEX, message)
  view.setUint8(CLASS_INDEX, large ? (messageClass | LARGE_FRAME_FLAG) : (messageClass & CLASS_MASK))
  view.setUint16(LENGTH_INDEX, dataLength, true)
  return { bytes, view }
}

const seal = (bytes: Uint8Array, view: DataView, dataLength: number): Uint8Array => {
  const crcIndex = DATA_INDEX + dataLength
  view.setUint16(crcIndex, frameCRC(bytes, dataLength), true)
  view.setUint8(crcIndex + CRC_LENGTH, ETX)
  return bytes
}

export const createFakeSentence = (firmware: string, id: string, options: FakeOptions = {}): Result<Uint8Array, SBGError[]> => {
  const [left, right] = id.split(':')
  const messageClass = Number(left)
  const message = Number(right)
  const definition = logsFor(firmware, messageClass)?.get(message)
  if (definition === undefined) {
    return { success: false, error: [{ kind: 'unknown-log', message: `No log ${JSON.stringify(id)} is modelled in firmware ${firmware}, so no frame can be fabricated for it` }] }
  }
  if (options.large !== undefined) {
    const { length, write } = largeBody(options.large)
    const { bytes, view } = build(messageClass, message, length, true)
    write(view, bytes)
    return { success: true, value: seal(bytes, view, length) }
  }
  const length = bodyLength(definition)
  const { bytes, view } = build(messageClass, message, length, false)
  const body = new DataView(bytes.buffer, DATA_INDEX, length)
  fillBody(body, definition, options)
  return { success: true, value: seal(bytes, view, length) }
}
