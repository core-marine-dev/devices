/* eslint-disable sonarjs/function-return-type -- node-red msg API by design: each handler
   returns the value on success, an error STRING (surfaced on the msg for the user), or
   undefined when that input key is absent. The union is the contract, not an accident. */

// installed
import type { Firmware, SentenceDefinition, SentenceId, TBLiveParser } from '@coremarine/thelmabiotel-tblive'

// Pure wrapper logic — NO node-red dependency, so it is unit-testable with a real
// TBLiveParser and node:test. The thin RED adapter (parser.ts) wires msg -> these.
//
// The TB Live library never throws and returns `Result` for anything that can fail, so
// every handler here turns a failed Result into the error STRING node-red shows the
// user, rather than letting a null or an exception through.

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
  characters: number
}

export interface FirmwareReport {
  firmware: Firmware
  firmwares: readonly string[]
}

const GET_OR_SET = (key: string): string => `${key}.command should be "get" or "set"`

const isString = (value: unknown): value is string => typeof value === 'string'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNil = (value: unknown): value is null | undefined => value === null || value === undefined
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// `Result.error` is an ARRAY of `{ kind, message }` — one call can be wrong for more than
// one reason. It used to be `string[]`, so a plain `join` worked; on the object array it
// produces "[object Object]", which is what a user saw instead of the actual problem.
const messages = (errors: readonly { message: string }[]): string =>
  errors.map((entry) => entry.message).join('; ')

const memoryReport = (parser: TBLiveParser): MemoryReport => ({
  memory: parser.memory,
  characters: parser.bufferLimit,
})

const firmwareReport = (parser: TBLiveParser): FirmwareReport => ({
  firmware: parser.firmware,
  firmwares: parser.firmwares,
})

// memory: { command: 'get' } | { command: 'set', payload: boolean }
export const applyMemory = (parser: TBLiveParser, memory: MemoryInput | undefined): MemoryReport | string | undefined => {
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

// firmware: { command: 'get' } | { command: 'set', payload: Firmware }
//
// The receiver's firmware, which for TB Live IS the protocol version: 1.0.1 detections
// carry 9 fields and 1.0.2 carries 8. The parser normally LEARNS it (from an `FV=`
// response, or from whether the device entered command mode with `LIVECM` or `TBRC`) and
// reports `unknown` until something proves it. Setting it here pins it, which is what
// you want when the deployment knows better than the wire does — cru's team cannot
// guarantee which firmware a production unit runs.
//
// Unlike norsub's protocol selector this does NOT discard the buffer: the firmware
// changes how a sentence is interpreted, not how the stream is framed, so a
// half-received sentence stays valid.
export const applyFirmware = (parser: TBLiveParser, firmware: FirmwareInput | undefined): FirmwareReport | string | undefined => {
  if (isNil(firmware)) return undefined
  const { command, payload } = firmware
  if (!isString(command)) return GET_OR_SET('firmware')
  if (command === 'get') return firmwareReport(parser)
  if (command === 'set') {
    const available: readonly string[] = parser.firmwares
    if (!isString(payload) || !available.includes(payload)) {
      return `firmware.payload should be one of: ${available.join(', ')}`
    }
    parser.firmware = payload as Firmware
    return firmwareReport(parser)
  }
  return GET_OR_SET('firmware')
}

// ids: any truthy value -> every sentence id this parser knows.
// The discovery counterpart to `definition`, so a flow can enumerate what to ask about.
export const getIds = (parser: TBLiveParser, ids: unknown): SentenceId[] | undefined => {
  if (isNil(ids) || ids === false) return undefined
  return parser.sentenceIds
}

// definition: 'emitter' | { id: 'emitter', protocol?: '1.0.2' } -> SentenceDefinition[]
//
// What the parser believes a sentence looks like: its payload field definitions, the
// API it belongs to, and prose saying how it is recognised on the wire. Omit the
// protocol to get every firmware version. There is no `set` — TB Live's definitions are
// compiled in, since it is a closed protocol with one vendor and 17 sentences.
export const getDefinition = (parser: TBLiveParser, definition: unknown): SentenceDefinition[] | string | undefined => {
  if (isNil(definition)) return undefined
  const { id, protocol } = isString(definition) ? { id: definition, protocol: undefined } : definition as DefinitionInput
  if (!isString(id)) return 'definition must be a sentence id string, or { id, protocol? }'
  if (!isNil(protocol) && !isString(protocol)) return 'definition.protocol must be a string'
  const result = parser.getSentenceDefinition(id as SentenceId, protocol as Firmware | undefined)
  return result.success ? result.value : messages(result.error)
}

// fake: { id, protocol, options? } -> a wire sentence
//
// `protocol` is mandatory here because the generated sentence genuinely differs by
// firmware (field counts, and `LIVECM` vs `TBRC`). Deterministic: the same request
// always returns the same string, and the defaults reproduce the datasheets' own
// example sentences.
export const getFakeSentence = (parser: TBLiveParser, fake: unknown): string | undefined => {
  if (isNil(fake)) return undefined
  if (!isRecord(fake)) return 'fake must be an object: { id, protocol, options? }'
  const { id, protocol, options } = fake as FakeInput
  if (!isString(id)) return 'fake.id must be a sentence id string'
  if (!isString(protocol)) return `fake.protocol is required and should be one of: ${parser.firmwares.join(', ')}`
  if (!isNil(options) && !isRecord(options)) return 'fake.options must be an object'
  const result = parser.getFakeSentence(id as SentenceId, protocol as Firmware, options as never)
  return result.success ? result.value : messages(result.error)
}

// payload: ASCII TB Live string -> CMA[]
export const parsePayload = (parser: TBLiveParser, payload: unknown): ReturnType<TBLiveParser['parseData']> | string | undefined => {
  if (isNil(payload)) return undefined
  if (!isString(payload)) return 'payload must be an ASCII string'
  return parser.parseData(payload)
}

// Drop keys whose value came back undefined (input not present).
export const cleanUndefined = (msg: Record<string, unknown>): void => {
  for (const key of Object.keys(msg)) {
    if (msg[key] === undefined) delete msg[key]
  }
}
