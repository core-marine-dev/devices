/* eslint-disable sonarjs/function-return-type -- node-red msg API by design: each handler
   returns the value on success, an error STRING (surfaced on the msg for the user), or
   undefined when that input key is absent. The union is the contract, not an accident. */

// installed
import { firmwares, fromBase64, SBFParser } from '@coremarine/septentrio-sbf'
import type { ParserError, Result, SentenceDefinition, SeptentrioParser, SeptentrioProtocol } from '@coremarine/septentrio-sbf'

// Pure wrapper logic — NO node-red dependency, so it is unit-testable with a real
// SeptentrioParser and node:test. The thin RED adapter (parser.ts) wires msg -> these.
//
// The SBF library never throws and returns `Result` for anything that can fail, so every
// handler here turns a failed Result into the error STRING node-red shows the user,
// rather than letting a null or an exception through. Its `Result` error side is an
// ARRAY (one call can be wrong for more than one reason), so failures are joined.
//
// THIS IS THE FIRST BINARY WRAPPER in the repo. The nmea/norsub/tblive wrappers take an
// ASCII string on `payload`; SBF is bytes, so `payload` accepts node-red's own binary
// type (a Buffer) and the frames handed back by `fake` are Buffers too. See `toBytes`.

export interface MemoryInput {
  command?: unknown
  payload?: unknown
}

export interface FirmwareInput {
  command?: unknown
  payload?: unknown
}

export interface ProtocolInput {
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
  // The only shape difference from the three string wrappers, which report `characters`:
  // for a binary protocol the unit is BYTES, and it is not cosmetic — a whole block has
  // to fit in the buffer or it is flushed before its last byte arrives.
  bytes: number
}

export interface FirmwareReport {
  firmware: string
  firmwares: readonly string[]
  // What the RECEIVER said it runs (ReceiverSetup.RxVersion), which is not necessarily
  // one we model. Absent until such a block arrives.
  reported?: string
  // The GPS-UTC offset learned in-band from ReceiverTime.DeltaLS. Absent until then.
  leapSeconds?: number
}

export interface ProtocolReport {
  protocol: SeptentrioProtocol
  protocols: readonly SeptentrioProtocol[]
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

/* What counts as SBF input.

  A Buffer IS a Uint8Array, so node-red's serial, TCP and file nodes need no conversion —
  they are the normal case and go straight through.

  A BASE64 STRING is also accepted, and that is deliberate rather than generous: every
  `raw` in the CMA output is base64, so it is this package's own vocabulary for bytes.
  It closes the diagnostic loop — copy a `raw` out of a debug node, inject it back, and
  you are re-parsing the exact frame that misbehaved. Validated strictly (and rejected if
  the decode does not round-trip) so an ASCII byte string cannot be silently misread as
  base64 and parsed as garbage.

  An array of byte numbers is accepted because that is what a JSON-only path (an inject
  node, an HTTP body, a stored fixture) can carry.
*/
export const toBytes = (payload: unknown): Uint8Array | string => {
  if (payload instanceof Uint8Array) return payload
  if (Array.isArray(payload)) {
    if (!payload.every(isByte)) return 'payload array must contain byte values (integers 0-255)'
    return Uint8Array.from(payload)
  }
  if (isString(payload)) {
    if (!BASE64.test(payload)) return 'payload string must be base64 — binary SBF should arrive as a Buffer'
    const bytes = fromBase64(payload)
    // A string that matches the base64 alphabet but is not base64 (plain ASCII often
    // does) fails to round-trip. Catching that is the difference between a clear error
    // and a flood of garbage sentences.
    if (bytes.byteLength === 0 && payload.length > 0) return 'payload string is not valid base64'
    return bytes
  }
  return 'payload must be a Buffer of SBF bytes (a base64 string or a byte array also works)'
}

const memoryReport = (parser: SeptentrioParser): MemoryReport => ({
  memory: parser.memory,
  bytes: parser.bufferLimit,
})

const firmwareReport = (parser: SeptentrioParser): FirmwareReport => {
  const report: FirmwareReport = {
    firmware: parser.firmware,
    // A module function, not a parser getter: the supported set is a property of the
    // BUILD (which knowledge bases are compiled in), not of an instance.
    firmwares: firmwares(),
  }
  // `reportedFirmware` and `leapSeconds` are learned from SBF blocks
  // (ReceiverSetup.RxVersion, ReceiverTime.DeltaLS), so they only exist while the
  // SBF protocol is active — the facade fronts NMEA too now.
  const active = parser.parser
  if (active instanceof SBFParser) {
    const reported = active.reportedFirmware
    if (reported !== undefined) report.reported = reported
    const leapSeconds = active.leapSeconds
    if (leapSeconds !== undefined) report.leapSeconds = leapSeconds
  }
  return report
}

const protocolReport = (parser: SeptentrioParser): ProtocolReport => ({
  protocol: parser.protocol,
  protocols: parser.protocols,
})

// memory: { command: 'get' } | { command: 'set', payload: boolean }
export const applyMemory = (parser: SeptentrioParser, memory: MemoryInput | undefined): MemoryReport | string | undefined => {
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

  The firmware selects WHICH KNOWLEDGE BASE decodes the blocks — block 4007 is described
  by whichever firmware's table is in use. You rarely need to set it: `ReceiverSetup`
  (5902) reports the receiver's real version and the parser adopts it when it arrives, so
  the device is normally the authority on itself.

  Setting an unmodelled version is refused by the library rather than substituted, and
  the report carries `reported` — what the box actually said — so a mismatch is visible
  instead of silent. `leapSeconds` rides along for the same reason: it is learned in-band
  from `ReceiverTime.DeltaLS`, and knowing whether it came from the device or from the
  fallback table is the kind of thing you want to be able to ask a remote install.
*/
export const applyFirmware = (parser: SeptentrioParser, firmware: FirmwareInput | undefined): FirmwareReport | string | undefined => {
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

/* protocol: { command: 'get' } | { command: 'set', payload: SeptentrioProtocol }

  The DEVICE protocol. A Septentrio receiver can be configured to emit SBF, NMEA or RTCM
  on the same port, so the device is not the same thing as the protocol — the library is
  a facade that composes a protocol parser. Only `sbf` exists today; the channel is here
  because the facade has it and NMEA is a planned addition, so a flow written against it
  keeps working.

  Switching DISCARDS the buffer and any undrained sentences: the pending bytes were being
  read under different framing rules, so keeping them would be worse than dropping them.
*/
export const applyProtocol = (parser: SeptentrioParser, protocol: ProtocolInput | undefined): ProtocolReport | string | undefined => {
  if (isNil(protocol)) return undefined
  const { command, payload } = protocol
  if (!isString(command)) return GET_OR_SET('protocol')
  if (command === 'get') return protocolReport(parser)
  if (command === 'set') {
    const available: readonly string[] = parser.protocols
    if (!isString(payload) || !available.includes(payload)) {
      return `protocol.payload should be one of: ${available.join(', ')}`
    }
    parser.protocol = payload as SeptentrioProtocol
    return protocolReport(parser)
  }
  return GET_OR_SET('protocol')
}

// ids: any truthy value -> every block number this parser knows, as strings.
// The discovery counterpart to `definition`: 108 of them for firmware 4.10.1.
export const getIds = (parser: SeptentrioParser, ids: unknown): string[] | undefined => {
  if (isNil(ids) || ids === false) return undefined
  return parser.sentenceIds
}

// Asked of the SBF parser DIRECTLY when SBF is active, so the answer keeps SBF's extra
// keys (`name`, `revision`, `timestamp`, `opaque`): the device facade can only promise
// the shared contract now that it fronts NMEA too, but a flow debugging a Septentrio
// box wants the block name.
const describe = (
  parser: SeptentrioParser,
  id: number | string,
  protocol?: string,
): Result<SentenceDefinition[], ParserError[]> => {
  const active = parser.parser
  return (active instanceof SBFParser)
    ? active.getSentenceDefinition(id, protocol)
    : parser.getSentenceDefinition(String(id), protocol)
}

/* definition: 4007 | '4007' | { id: 4007, protocol?: '4.10.1' } -> SentenceDefinition[]

  What the parser believes a block looks like: its field definitions with types, units,
  Do-Not-Use values and descriptions, ONE ENTRY PER REVISION. The per-revision split is
  the point — a receiver generation only sends the fields its revision defines, so seeing
  them side by side is how you tell what a given box will actually give you.

  A NUMBER is accepted as well as a string because an SBF id IS a number on the wire, and
  an inject node typing 4007 should not have to quote it.
*/
export const getDefinition = (parser: SeptentrioParser, definition: unknown): SentenceDefinition[] | string | undefined => {
  if (isNil(definition)) return undefined
  const { id, protocol } = (isString(definition) || typeof definition === 'number')
    ? { id: definition, protocol: undefined }
    : definition as DefinitionInput
  if (!isString(id) && typeof id !== 'number') return 'definition must be a block number, or { id, protocol? }'
  if (!isNil(protocol) && !isString(protocol)) return 'definition.protocol must be a firmware string'
  const result = describe(parser, id, protocol ?? undefined)
  return result.success ? result.value : result.error.map((entry) => entry.message).join('; ')
}

/* fake: 4007 | { id, protocol?, options? } -> a real wire frame, as a Buffer

  Built from the same field table the parser reads, with a real CRC and a real Length, so
  wiring `fake` straight back into `payload` round-trips. **Deterministic** — the same
  request returns the same bytes forever, which is what makes it usable in a committed
  example flow. `options` takes `{ revision?, tow?, wnc?, fields?, random? }`.

  Returned as a Buffer rather than the library's Uint8Array so node-red renders and
  routes it as the binary type its other nodes speak.
*/
// A bare id or the full object, validated once, so the handler below stays readable.
const fakeRequest = (fake: unknown): FakeInput | string => {
  if (isString(fake) || typeof fake === 'number') return { id: fake }
  if (!isRecord(fake)) return 'fake must be a block number, or { id, protocol?, options? }'
  const { id, protocol, options } = fake as FakeInput
  if (!isString(id) && typeof id !== 'number') return 'fake.id must be a block number'
  if (!isNil(protocol) && !isString(protocol)) return 'fake.protocol must be a firmware string'
  if (!isNil(options) && !isRecord(options)) return 'fake.options must be an object'
  return { id, protocol, options }
}

export const getFakeSentence = (parser: SeptentrioParser, fake: unknown): Uint8Array | string | undefined => {
  if (isNil(fake)) return undefined
  const request = fakeRequest(fake)
  if (isString(request)) return request
  const result = parser.getFakeSentence(request.id as number | string, (request.protocol ?? undefined) as string | undefined, request.options as never)
  return result.success ? Buffer.from(result.value) : result.error.map((entry) => entry.message).join('; ')
}

// payload: SBF bytes -> CMA[]
export const parsePayload = (parser: SeptentrioParser, payload: unknown): ReturnType<SeptentrioParser['parseData']> | string | undefined => {
  if (isNil(payload)) return undefined
  const bytes = toBytes(payload)
  if (isString(bytes)) return bytes
  return parser.parseData(bytes)
}

// Drop keys whose value came back undefined (input not present).
export const cleanUndefined = (msg: Record<string, unknown>): void => {
  for (const key of Object.keys(msg)) {
    if (msg[key] === undefined) delete msg[key]
  }
}
