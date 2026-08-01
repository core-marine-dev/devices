// installed
import { toBase64 } from '@coremarine/protocol-core'
import type { DraftCMA, Field, Metadata } from '@coremarine/protocol-core'
import crc16kermit from 'crc/calculators/crc16kermit'

// coded
import {
  CLASS_INDEX,
  CLASS_MASK,
  CLASS_NAMES,
  DATA_INDEX,
  ETX,
  LARGE_DATA_INDEX,
  LARGE_FRAME_FLAG,
  LARGE_HEADER_LENGTH,
  LENGTH_INDEX,
  MSG_INDEX,
  PAGES_INDEX,
  PAGE_INDEX_INDEX,
  PROTOCOL_NAME,
  TRANSMISSION_ID_INDEX,
  UNKNOWN_LOG,
} from './constants'
import { decodeBody } from './engine'
import type { LogDefinition, LogRegistry } from './types'
import { logId, toText } from './utils'

/* Decoding ONE complete eCom frame. Pure and stateless on purpose: the parser owns
   the buffer and hands whole frames here, so there is no second buffer to keep in
   step (see decision D3 in docs/STATUS.md).

   Nothing is dropped silently — the same contract as every parser in this repo,
   with four tiers:

     decoded    — CRC and ETX good, log modelled: full payload
     identified — CRC and ETX good, the (class, message) pair is NOT in this
                  firmware's knowledge base: real id, real `raw`, `payload: []`,
                  metadata.name 'unknown'. NOT an error — it is what a frame from
                  a newer firmware or an unmodelled class lands in, and what makes
                  the parser forward-safe rather than lossy.
     failed     — CRC mismatch or a wrong ETX: decoded as far as possible, with
                  `errors`. The body is usually still readable, and a silent drop
                  is exactly what this refactor removes.
     garbage    — bytes that cannot start a frame at all. Handled by the parser,
                  not here.
*/

// A metadata entry shaped like a CMA Field: the header values are not payload —
// they are not part of the DATA section — but a consumer still wants the raw bytes
// next to the parsed value.
const headerField = (raw: Uint8Array, name: string, type: Field['type'], value: Field['value'], units?: string, description?: string): Field => {
  const field: Field = { raw: toBase64(raw), name, type, value }
  if (units !== undefined) field.units = units
  if (description !== undefined) field.description = description
  return field
}

const bodyMetadata = (bytes: Uint8Array): Metadata => ({ raw: toBase64(bytes), bytes: bytes.byteLength })

const nulTerminated = (text: string): string => {
  const end = text.indexOf('\0')
  return (end === -1) ? text : text.slice(0, end)
}

/* §2.1.1 Note 3: "CRC field is computed on [MSG, CLASS, LEN, DATA] fields" — so it
   covers everything between the sync word and the CRC itself, and neither the sync
   nor the ETX is included. CRC-16 Kermit, poly 0x8408 (§2.1.3), from the same `crc`
   dependency and the same pure `crc/calculators/*` subpath septentrio uses. */
export const frameCRC = (frame: Uint8Array, dataLength: number): number =>
  crc16kermit(frame.subarray(MSG_INDEX, DATA_INDEX + dataLength)) >>> 0

interface FrameHeader {
  message: number
  classByte: number
  messageClass: number
  large: boolean
  dataLength: number
}

export const readHeader = (view: DataView): FrameHeader => {
  const classByte = view.getUint8(CLASS_INDEX)
  return {
    message: view.getUint8(MSG_INDEX),
    classByte,
    // Bit 7 is the large-frame flag, NOT part of the class (§2.1.2.1), so it is
    // masked off before the class is used for anything.
    messageClass: classByte & CLASS_MASK,
    large: (classByte & LARGE_FRAME_FLAG) !== 0,
    dataLength: view.getUint16(LENGTH_INDEX, true),
  }
}

/* The LARGE-frame page fields (§2.1.2.2). LEN includes these five bytes, so the
   fragment is what remains after them.

   The fragment is NOT decoded into the log's fields, and cannot be: a page cuts at
   a fixed byte boundary, so it can split a field in half and page 1 starts
   mid-field. Pages are NOT reassembled here either — a lost page would leave a
   transmission that never completes, holding memory forever with no symptom, so
   reassembly belongs to a layer that can time it out (decision D7). */
const largePayload = (frame: Uint8Array, view: DataView, dataLength: number, metadata: Metadata): Field[] => {
  const fragmentLength = Math.max(0, dataLength - LARGE_HEADER_LENGTH)
  const fragment = frame.subarray(LARGE_DATA_INDEX, LARGE_DATA_INDEX + fragmentLength)
  metadata.large = {
    transmissionId: view.getUint8(TRANSMISSION_ID_INDEX),
    pageIndex: view.getUint16(PAGE_INDEX_INDEX, true),
    pages: view.getUint16(PAGES_INDEX, true),
  }
  const raw = toBase64(fragment)
  // `raw` and `value` deliberately hold the same base64: `raw` is the byte slice
  // the CMA contract asks for, and the honest decoded value of a fragment we
  // cannot decode is that same text. Do not "fix" this.
  return [{
    raw,
    name: 'DATA',
    type: 'string',
    value: raw,
    description: 'One page of a paginated payload, as base64. Pages are NOT reassembled by this parser — see metadata.large for the transmission id, page index and page count.',
  }]
}

const knownBody = (sentence: DraftCMA, metadata: Metadata, definition: LogDefinition, body: Uint8Array, errors: string[]): void => {
  if (definition.opaque === true) {
    metadata.body = bodyMetadata(body)
    return
  }
  const decoded = decodeBody(body, definition.fields, definition.decoders)
  sentence.payload = decoded.payload
  errors.push(...decoded.errors)
  if (decoded.trailing.byteLength > 0) {
    // §2.4: a later firmware may ADD fields at the end of a log, so extra bytes are
    // not an error — they are a newer device than this knowledge base. Published
    // rather than ignored, so the growth is visible instead of silently dropped.
    metadata.trailing = bodyMetadata(decoded.trailing)
    // A NUL-terminated C string: the value ends at the first NUL, and anything after
    // it is padding. Cut with indexOf rather than a regex — a `\0.*$` pattern over
    // attacker-shaped input backtracks superlinearly.
    if (definition.trailingText === true) metadata.message = nulTerminated(toText(decoded.trailing))
  }
  const aggregated = definition.payloadMetadata?.(decoded.values)
  if (aggregated !== undefined && Object.keys(aggregated).length > 0) metadata.payload = aggregated
}

export const decodeFrame = (frame: Uint8Array, logs: LogRegistry | undefined, firmware: string): DraftCMA => {
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
  const { message, classByte, messageClass, large, dataLength } = readHeader(view)
  const crcIndex = DATA_INDEX + dataLength
  const receivedCRC = view.getUint16(crcIndex, true)
  const etx = view.getUint8(crcIndex + 2)
  const errors: string[] = []
  const computedCRC = frameCRC(frame, dataLength)
  if (computedCRC !== receivedCRC) {
    errors.push(`Invalid CRC: computed ${computedCRC}, received ${receivedCRC}`)
  }
  if (etx !== ETX) {
    errors.push(`Invalid ETX: expected ${ETX}, received ${etx}`)
  }
  const definition = logs?.get(message)
  const metadata: Metadata = {
    name: definition?.name ?? UNKNOWN_LOG,
    class: headerField(frame.subarray(CLASS_INDEX, LENGTH_INDEX), 'CLASS', 'uint8', messageClass, undefined, CLASS_NAMES[messageClass] ?? 'Message class not defined by SBGFWM.2.3 §2.1.4'),
    message: headerField(frame.subarray(MSG_INDEX, CLASS_INDEX), 'MSG', 'uint8', message, undefined, 'Message identifier within the class'),
    length: headerField(frame.subarray(LENGTH_INDEX, DATA_INDEX), 'LEN', 'uint16', dataLength, 'bytes', 'Size of the DATA section. On a large frame it INCLUDES the 5-byte page header.'),
    crc: headerField(frame.subarray(crcIndex, crcIndex + 2), 'CRC', 'uint16', receivedCRC, undefined, 'CRC-16 Kermit over MSG, CLASS, LEN and DATA'),
  }
  const sentence: DraftCMA = {
    raw: toBase64(frame),
    timestamp: Date.now(),
    id: logId(classByte, message),
    protocol: { name: PROTOCOL_NAME, version: firmware },
    payload: [],
    metadata,
  }
  if (large) {
    sentence.payload = largePayload(frame, view, dataLength, metadata)
  } else if (definition !== undefined) {
    knownBody(sentence, metadata, definition, frame.subarray(DATA_INDEX, crcIndex), errors)
  } else if (dataLength > 0) {
    // Identified but not modelled: publish the bytes, claim nothing about them.
    metadata.body = bodyMetadata(frame.subarray(DATA_INDEX, crcIndex))
  }
  if (definition?.description !== undefined) sentence.description = definition.description
  if (errors.length > 0) sentence.errors = errors
  return sentence
}
