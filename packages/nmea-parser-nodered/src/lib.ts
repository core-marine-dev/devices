/* eslint-disable sonarjs/function-return-type -- node-red msg API by design: each handler
   returns the value on success, an error STRING (surfaced on the msg for the user), or
   undefined when that input key is absent. The union is the contract, not an accident. */

// installed
import type { NMEAParser } from '@coremarine/nmea-parser'

// Pure wrapper logic — NO node-red dependency, so it is unit-testable with a real
// NMEAParser and node:test. The thin RED adapter (parser.ts) wires msg -> these.

export interface MemoryInput {
  command?: unknown
  payload?: unknown
}

export interface ProtocolsInput {
  command?: unknown
  file?: unknown
  content?: unknown
}

export interface MemoryReport {
  memory: boolean
  characters: number
}

// Reads a protocols YAML file by path. Injected so the logic stays side-effect-free
// and testable; the adapter supplies a node:fs reader.
export type FileReader = (path: string) => string

const isString = (value: unknown): value is string => typeof value === 'string'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNil = (value: unknown): value is null | undefined => value === null || value === undefined

const report = (parser: NMEAParser): MemoryReport => ({
  memory: parser.memory,
  characters: parser.bufferLimit,
})

// memory: { command: 'get' } | { command: 'set', payload: boolean }
export const applyMemory = (parser: NMEAParser, memory: MemoryInput | undefined): MemoryReport | string | undefined => {
  if (isNil(memory)) return undefined
  const { command, payload } = memory
  if (!isString(command)) return 'memory.command should be "get" or "set"'
  if (command === 'get') return report(parser)
  if (command === 'set') {
    if (!isBoolean(payload)) return 'memory.payload should be boolean'
    parser.memory = payload
    return report(parser)
  }
  return 'memory.command should be "get" or "set"'
}

// protocols: { command: 'get' } | { command: 'set', file?: string, content?: string }
// New lib API: feed a YAML string via addSentences (Result, never throws). A file
// path is read via the injected reader (node-only concern kept out of this module).
export const applyProtocols = (
  parser: NMEAParser,
  protocols: ProtocolsInput | undefined,
  readFile: FileReader,
): ReturnType<NMEAParser['getSentencesByProtocol']> | string | undefined => {
  if (isNil(protocols)) return undefined
  const { command, file, content } = protocols
  if (!isString(command)) return 'protocols.command should be "get" or "set"'
  if (command === 'get') return parser.getSentencesByProtocol()
  if (command === 'set') {
    let yaml: string
    if (isString(content)) {
      yaml = content
    } else if (isString(file) && file.length > 0) {
      try {
        yaml = readFile(file)
      } catch {
        return `protocols: cannot read file "${file}"`
      }
    } else {
      return 'protocols.set needs a "content" (YAML string) or a "file" path'
    }
    const result = parser.addSentences(yaml)
    if (!result.success) return `protocols: ${result.error.message}`
    return parser.getSentencesByProtocol()
  }
  return 'protocols.command should be "get" or "set"'
}

// sentence: string id -> stored sentence info | null
export const getSentenceInfo = (parser: NMEAParser, sentence: unknown): ReturnType<NMEAParser['getSentence']> | string | undefined => {
  if (isNil(sentence)) return undefined
  if (!isString(sentence)) return 'sentence must be a string'
  return parser.getSentence(sentence)
}

// fake: string id -> a fake NMEA-like sentence | null
export const getFakeSentence = (parser: NMEAParser, fake: unknown): ReturnType<NMEAParser['getFakeSentenceByID']> | string | undefined => {
  if (isNil(fake)) return undefined
  if (!isString(fake)) return 'fake sentence id must be a string'
  return parser.getFakeSentenceByID(fake)
}

// payload: ASCII NMEA string -> CMA[]
export const parsePayload = (parser: NMEAParser, payload: unknown): ReturnType<NMEAParser['parseData']> | string | undefined => {
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
