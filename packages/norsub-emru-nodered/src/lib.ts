/* eslint-disable sonarjs/function-return-type -- node-red msg API by design: each handler
   returns the value on success, an error STRING (surfaced on the msg for the user), or
   undefined when that input key is absent. The union is the contract, not an accident. */

// installed
import type { NorsubParser, NorsubProtocol } from '@coremarine/norsub-emru'

// Pure wrapper logic — NO node-red dependency, so it is unit-testable with a real
// NorsubParser and node:test. The thin RED adapter (parser.ts) wires msg -> these.
//
// Two vocabularies, deliberately kept apart (they are one letter apart in the library
// and were a footgun in the old node):
//   - SENTENCES = the sentence definitions the parser knows      -> msg.sentences
//   - PROTOCOL  = which protocol the device is emitting right now -> msg.protocol

export interface MemoryInput {
  command?: unknown
  payload?: unknown
}

export interface SentencesInput {
  command?: unknown
  file?: unknown
  content?: unknown
}

export interface ProtocolInput {
  command?: unknown
  payload?: unknown
}

export interface MemoryReport {
  memory: boolean
  characters: number
}

export interface ProtocolReport {
  protocol: NorsubProtocol
  protocols: NorsubProtocol[]
}

// Reads a sentences YAML file by path. Injected so the logic stays side-effect-free
// and testable; the adapter supplies a node:fs reader.
export type FileReader = (path: string) => string

const GET_OR_SET = (key: string): string => `${key}.command should be "get" or "set"`

const isString = (value: unknown): value is string => typeof value === 'string'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNil = (value: unknown): value is null | undefined => value === null || value === undefined

const memoryReport = (parser: NorsubParser): MemoryReport => ({
  memory: parser.memory,
  characters: parser.bufferLimit,
})

const protocolReport = (parser: NorsubParser): ProtocolReport => ({
  protocol: parser.protocol,
  protocols: parser.protocols,
})

// memory: { command: 'get' } | { command: 'set', payload: boolean }
export const applyMemory = (parser: NorsubParser, memory: MemoryInput | undefined): MemoryReport | string | undefined => {
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

// protocol: { command: 'get' } | { command: 'set', payload: NorsubProtocol }
// The DEVICE protocol — an eMRU is configured to emit exactly one. Switching discards
// the buffer and any undrained sentences (half a sentence in one protocol can never be
// completed by another), so an unknown value is refused rather than silently ignored.
export const applyProtocol = (parser: NorsubParser, protocol: ProtocolInput | undefined): ProtocolReport | string | undefined => {
  if (isNil(protocol)) return undefined
  const { command, payload } = protocol
  if (!isString(command)) return GET_OR_SET('protocol')
  if (command === 'get') return protocolReport(parser)
  if (command === 'set') {
    const available: string[] = parser.protocols
    if (!isString(payload) || !available.includes(payload)) {
      return `protocol.payload should be one of: ${available.join(', ')}`
    }
    parser.protocol = payload as NorsubProtocol
    return protocolReport(parser)
  }
  return GET_OR_SET('protocol')
}

// sentences: { command: 'get' } | { command: 'set', file?: string, content?: string }
// The parser's own NorSub + NMEA definitions are built in; this ADDS to them. Feeds a
// YAML string through addSentences (a Result — never throws). A file path is read via
// the injected reader, keeping that node-only concern out of this module.
export const applySentences = (
  parser: NorsubParser,
  sentences: SentencesInput | undefined,
  readFile: FileReader,
): ReturnType<NorsubParser['parser']['getSentencesByProtocol']> | string | undefined => {
  if (isNil(sentences)) return undefined
  const { command, file, content } = sentences
  if (!isString(command)) return GET_OR_SET('sentences')
  if (command === 'get') return parser.parser.getSentencesByProtocol()
  if (command === 'set') {
    const yaml = readYaml(content, file, readFile)
    if (!isString(yaml)) return yaml.error
    const result = parser.parser.addSentences(yaml)
    if (!result.success) return `sentences: ${result.error.message}`
    return parser.parser.getSentencesByProtocol()
  }
  return GET_OR_SET('sentences')
}

// `content` takes precedence over `file`. Returns the YAML or an error to surface.
const readYaml = (content: unknown, file: unknown, readFile: FileReader): string | { error: string } => {
  if (isString(content)) return content
  if (!isString(file) || file.length === 0) {
    return { error: 'sentences.set needs a "content" (YAML string) or a "file" path' }
  }
  try {
    return readFile(file)
  } catch {
    return { error: `sentences: cannot read file "${file}"` }
  }
}

// definition: string id -> every stored definition of it
// Renamed from `sentence` in v5: an id in and a DEFINITION out, so the key now says
// which. The library returns a Result, and an array — one entry per version of the id.
export const getDefinition = (parser: NorsubParser, definition: unknown): unknown[] | string | undefined => {
  if (isNil(definition)) return undefined
  if (!isString(definition)) return 'definition must be a sentence id string'
  const result = parser.parser.getSentenceDefinition(definition)
  return result.success ? result.value : result.error.message
}

// fake: string id -> a fake NMEA-like sentence
// The library returns a Result, so an unknown id now arrives as an error STRING the
// user can read rather than a bare `null` they have to interpret.
export const getFakeSentence = (parser: NorsubParser, fake: unknown): string | undefined => {
  if (isNil(fake)) return undefined
  if (!isString(fake)) return 'fake sentence id must be a string'
  const result = parser.parser.getFakeSentence(fake)
  return result.success ? result.value : result.error.message
}

// payload: ASCII NorSub/NMEA string -> CMA[]
export const parsePayload = (parser: NorsubParser, payload: unknown): ReturnType<NorsubParser['parseData']> | string | undefined => {
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
