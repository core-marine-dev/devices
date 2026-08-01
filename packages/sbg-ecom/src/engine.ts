// installed
import { toBase64 } from '@coremarine/protocol-core'
import type { Field, Metadata, Value } from '@coremarine/protocol-core'

// coded
import { TYPE_BYTES } from './constants'
import type { DecodedBody, Decoder, FieldDefinition, SBGType } from './types'

/* The one decoder for every sbgECom log body. It walks a log's field table and
   derives what used to be hand-written per log: the byte offset of each field, its
   raw slice, the little-endian read and where the body ran out. Nothing here knows
   about any specific log.

   Simpler than septentrio's equivalent on purpose: every documented sbgECom LOG
   body is a FLAT list of fixed-width scalars. There are no sub-blocks, no
   variable-length fields and no padding rule. The two bodies the datasheet leaves
   undefined (MAG_CALIB, GPS_RAW) are marked `opaque` and never reach this file. */

// Every multi-byte sbgECom type is little-endian (§2.1.1 Note 2), and signed
// integers are two's complement — which is exactly what DataView gives us.
const readNumber = (view: DataView, offset: number, type: SBGType): number => {
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

const buildField = (body: Uint8Array, view: DataView, offset: number, definition: FieldDefinition): Field => {
  const size = TYPE_BYTES[definition.type]
  const wire = readNumber(view, offset, definition.type)
  /* A non-finite float means corrupt or uninitialised data. It must not reach
     `value`: JSON turns NaN and Infinity into null, which would be
     indistinguishable from a legitimately empty field. */
  const broken = !Number.isFinite(wire)
  const field: Field = {
    raw: toBase64(body.subarray(offset, offset + size)),
    name: definition.name,
    type: definition.type,
    value: broken ? null : wire,
  }
  if (definition.units !== undefined) field.units = definition.units
  if (definition.description !== undefined) field.description = definition.description
  if (broken) field.errors = [`${definition.name}: not a finite number`]
  // Reserved fields may be repurposed by a later firmware, so a consumer must not
  // read them. Kept in the payload to stay aligned 1:1 with the datasheet's rows.
  if (definition.reserved === true) field.metadata = { reserved: true }
  return field
}

/* Decoders run AFTER every field of the body has been read, so a decoder can see
   its siblings. A field whose value is null — unreadable — is never handed to one. */
const applyDecoders = (
  fields: Field[],
  values: Readonly<Record<string, Value>>,
  decoders: Readonly<Record<string, Decoder | undefined>>,
): void => {
  for (const [index, field] of fields.entries()) {
    const decoder = decoders[field.name]
    if (decoder === undefined || typeof field.value !== 'number') continue
    const metadata: Metadata = decoder(field.value, values)
    if (Object.keys(metadata).length === 0) continue
    fields[index] = { ...field, metadata: { ...field.metadata, ...metadata } }
  }
}

export const decodeBody = (
  body: Uint8Array,
  definitions: readonly FieldDefinition[],
  decoders: Readonly<Record<string, Decoder | undefined>> = {},
): DecodedBody => {
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
  const fields: Field[] = []
  const values: Record<string, Value> = {}
  const errors: string[] = []
  let offset = 0
  for (const definition of definitions) {
    const size = TYPE_BYTES[definition.type]
    if (offset + size > body.byteLength) {
      // The body ran out mid-field. Stop rather than guess: every later offset
      // would be wrong, and a wrong number is worse than a missing one.
      errors.push(`Body truncated: field ${definition.name} needs bytes ${offset}-${offset + size - 1} of ${body.byteLength}`)
      break
    }
    const field = buildField(body, view, offset, definition)
    fields.push(field)
    values[definition.name] = field.value
    offset += size
  }
  applyDecoders(fields, values, decoders)
  return { payload: fields, values, trailing: body.subarray(offset), errors }
}
