/* eslint-disable sonarjs/function-return-type -- node-red msg API by design: each handler
   returns the value on success, an error STRING (surfaced on the msg for the user), or
   undefined when that input key is absent. The union is the contract, not an accident. */

// installed
import { SBGParser, firmwares, fromBase64 } from '@coremarine/sbg-ecom'
import type { CMA, ParserError, Result, SBGSentenceDefinition, SentenceDefinition } from '@coremarine/sbg-ecom'

/* Pure wrapper logic — NO node-red dependency, so it is unit-testable with a real
   SBGParser and node:test. The thin RED adapter (parser.ts) wires msg -> these.

   The library never throws and returns a `Result` for anything that can fail, so every
   handler here turns a failed Result into the error STRING node-red shows the user
   rather than letting a null or an exception through. The `Result` error side is an
   ARRAY (one call can be wrong for more than one reason), so failures are joined.

   THE 0.0.x WRAPPER IS GONE, not ported. It called `getFrames()` (removed), wrapped
   `parser.firmware = …` in try/catch because the old library THREW, exposed only
   memory/firmware/firmwares/payload, accepted only a Buffer, logged to console.error,
   and pointed `main` at an `index.js` that never existed. */

export interface MemoryInput {
  command?: unknown
  payload?: unknown
}

export interface FirmwareInput {
  command?: unknown
  payload?: unknown
}

export interface DefinitionInput {
  id?: unknown
  protocol?: unknown
}

export interface FakeInput {
  id?: unknown
  protocol?: unknown
  options?: unknown
}

export interface MemoryReport {
  memory: boolean
  // BYTES, not the `characters` the three string wrappers report: this is a binary
  // protocol and a whole frame has to fit in the buffer or it is flushed before its
  // last byte arrives.
  bytes: number
}

export interface FirmwareReport {
  firmware: string
  firmwares: readonly string[]
  /* The uptime -> UTC correspondence learned in-band from SBG_ECOM_LOG_UTC_TIME.
     Absent until such a log arrives with a valid clock — and its absence is the answer
     to "why do my sentences have no absolute time?", which is exactly the question a
     remote install needs to be able to ask. */
  clock?: { uptime: number, utc: number }
}

const GET_OR_SET = (key: string): string => `${key}.command should be "get" or "set"`

const isString = (value: unknown): value is string => typeof value === 'string'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNil = (value: unknown): value is null | undefined => value === null || value === undefined
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Strict base64, so a latin1 byte string cannot be mistaken for one.
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const isByte = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255

/* What counts as input for this device — and it takes one more form than the other
   binary wrapper, because the device speaks two protocols on ONE wire.

   A Buffer IS a Uint8Array, so node-red's serial, TCP and file nodes need no
   conversion — the normal case, and it goes straight through.

   A STRING is ambiguous here in a way it is not for septentrio, and the ambiguity
   resolves cleanly: base64's alphabet contains no `$`, and every NMEA sentence starts
   with one. So a `$`-prefixed string IS THE SENTENCE, passed through as text; anything
   else must be base64. That matters because the device really does emit plain NMEA
   alongside its binary frames, so both belong on the same input.

   Accepting base64 at all is deliberate rather than generous: every `raw` in the CMA
   output is base64, so it is this package's own vocabulary for bytes. Copy a `raw` out
   of a debug node, inject it back, and you are re-parsing the exact frame that
   misbehaved.

   An array of byte numbers is accepted because that is what a JSON-only path (an inject
   node, an HTTP body, a stored fixture) can carry. */
export const toInput = (payload: unknown): Uint8Array | string => {
  if (payload instanceof Uint8Array) return payload
  if (Array.isArray(payload)) {
    if (!payload.every(isByte)) return 'payload array must contain byte values (integers 0-255)'
    return Uint8Array.from(payload)
  }
  if (isString(payload)) {
    // An NMEA sentence, passed through as the text it is.
    if (payload.startsWith('$')) return payload
    if (!BASE64.test(payload)) return 'payload string must be base64 (binary eCom) or an NMEA sentence starting with "$" — bytes should arrive as a Buffer'
    const bytes = fromBase64(payload)
    // A string that matches the base64 alphabet but is not base64 (plain ASCII often
    // does) fails to round-trip. Catching that is the difference between a clear error
    // and a flood of garbage sentences.
    if (bytes.byteLength === 0 && payload.length > 0) return 'payload string is not valid base64'
    return bytes
  }
  return 'payload must be a Buffer of eCom bytes (a base64 string, an NMEA sentence, or a byte array also works)'
}

const memoryReport = (parser: SBGParser): MemoryReport => ({
  memory: parser.memory,
  bytes: parser.bufferLimit,
})

const firmwareReport = (parser: SBGParser): FirmwareReport => {
  const report: FirmwareReport = {
    firmware: parser.firmware,
    // A module function, not a parser getter: the supported set is a property of the
    // BUILD (which knowledge bases are compiled in), not of an instance.
    firmwares: firmwares(),
  }
  const clock = parser.clock
  if (clock !== undefined) report.clock = { uptime: clock.uptime, utc: clock.utc }
  return report
}

// memory: { command: 'get' } | { command: 'set', payload: boolean }
export const applyMemory = (parser: SBGParser, memory: MemoryInput | undefined): MemoryReport | string | undefined => {
  if (isNil(memory)) return undefined
  const { command, payload } = memory
  if (!isString(command)) return GET_OR_SET('memory')
  if (command === 'get') return memoryReport(parser)
  if (command === 'set') {
    if (!isBoolean(payload)) return 'memory.payload should be boolean'
    parser.memory = payload
    return memoryReport(parser)
  }
  return GET_OR_SET('memory')
}

/* firmware: { command: 'get' } | { command: 'set', payload: string }

   The firmware selects WHICH KNOWLEDGE BASE decodes the logs. You rarely need to set
   it: §2.4 of the manual says SBG only ever ADDS fields at the end of a log, so a
   newer device decodes correctly against 2.3 and publishes its extra bytes at
   metadata.trailing rather than failing.

   Setting an unmodelled version is refused by the library rather than substituted. The
   report also carries `clock` — learned in-band from SBG_ECOM_LOG_UTC_TIME — because
   knowing whether the device has told us the time yet is the difference between
   "the parser is broken" and "the receiver has no fix". */
export const applyFirmware = (parser: SBGParser, firmware: FirmwareInput | undefined): FirmwareReport | string | undefined => {
  if (isNil(firmware)) return undefined
  const { command, payload } = firmware
  if (!isString(command)) return GET_OR_SET('firmware')
  if (command === 'get') return firmwareReport(parser)
  if (command === 'set') {
    const available: readonly string[] = firmwares()
    if (!isString(payload) || !available.includes(payload)) {
      return `firmware.payload should be one of: ${available.join(', ')}`
    }
    parser.firmware = payload
    return firmwareReport(parser)
  }
  return GET_OR_SET('firmware')
}

/* ids: any truthy value -> every sentence this parser can describe or fabricate.

   BOTH knowledge bases, in one list: the 34 eCom logs as '<class>:<message>' plus
   every NMEA sentence id. There is no protocol channel on this node, deliberately —
   an eCom id contains a colon and an NMEA id does not, so the two never collide and
   nothing has to be selected. */
export const getIds = (parser: SBGParser, ids: unknown): string[] | undefined => {
  if (isNil(ids) || ids === false) return undefined
  return parser.sentenceIds
}

const joinErrors = (errors: ParserError[]): string => errors.map((entry) => entry.message).join('; ')

/* definition: '0:6' | 'GGA' | { id, protocol? } -> the field table

   What the parser believes a sentence looks like: its fields with types, units and
   descriptions. Answered from whichever knowledge base the id belongs to.

   An eCom id gets the RICHER answer (`getLogDefinition`, which adds the log `name` and
   the `opaque` flag) because a flow debugging an SBG box wants the log name, and the
   facade can only promise what both protocols deliver. */
export const getDefinition = (parser: SBGParser, definition: unknown): SentenceDefinition[] | SBGSentenceDefinition[] | string | undefined => {
  if (isNil(definition)) return undefined
  const { id, protocol } = isString(definition) ? { id: definition, protocol: undefined } : definition as DefinitionInput
  if (!isString(id)) return 'definition must be a sentence id, or { id, protocol? }'
  if (!isNil(protocol) && !isString(protocol)) return 'definition.protocol must be a firmware string'
  const result: Result<SentenceDefinition[] | SBGSentenceDefinition[], ParserError[]> = id.includes(':')
    ? parser.getLogDefinition(id, protocol ?? undefined)
    : parser.getSentenceDefinition(id, protocol ?? undefined)
  return result.success ? result.value : joinErrors(result.error)
}

/* fake: '0:6' | { id, protocol?, options? } -> a real wire frame, as a Buffer

   Built from the same field table the parser reads, with a real CRC and a real LEN, so
   wiring `fake` straight back into `payload` round-trips. **Deterministic** — the same
   request returns the same bytes forever, which is what makes it usable in a committed
   example flow. `options` takes `{ timestamp?, fields?, large?, random? }`.

   Returned as a Buffer rather than the library's Uint8Array so node-red renders and
   routes it as the binary type its other nodes speak. */
const fakeRequest = (fake: unknown): FakeInput | string => {
  if (isString(fake)) return { id: fake }
  if (!isRecord(fake)) return 'fake must be a sentence id, or { id, protocol?, options? }'
  const { id, protocol, options } = fake as FakeInput
  if (!isString(id)) return 'fake.id must be a sentence id'
  if (!isNil(protocol) && !isString(protocol)) return 'fake.protocol must be a firmware string'
  if (!isNil(options) && !isRecord(options)) return 'fake.options must be an object'
  return { id, protocol, options }
}

export const getFakeSentence = (parser: SBGParser, fake: unknown): Uint8Array | string | undefined => {
  if (isNil(fake)) return undefined
  const request = fakeRequest(fake)
  if (isString(request)) return request
  const result = parser.getFakeSentence(request.id as string, (request.protocol ?? undefined) as string | undefined, request.options as never)
  return result.success ? Buffer.from(result.value) : joinErrors(result.error)
}

// payload -> CMA[]. Bytes, base64, a byte array, or an NMEA sentence — see `toInput`.
export const parsePayload = (parser: SBGParser, payload: unknown): CMA[] | string | undefined => {
  if (isNil(payload)) return undefined
  const input = toInput(payload)
  // A string here is either the sentence (passed through) or an error message. They are
  // told apart by the `$`, which is the same test `toInput` used to accept it.
  if (isString(input) && !input.startsWith('$')) return input
  return parser.parseData(input)
}

// Drop keys whose value came back undefined (input not present).
export const cleanUndefined = (msg: Record<string, unknown>): void => {
  for (const key of Object.keys(msg)) {
    if (msg[key] === undefined) delete msg[key]
  }
}
