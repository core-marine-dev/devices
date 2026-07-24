/* eslint-disable sonarjs/function-return-type -- node-red msg API by design: each handler
   returns the value on success, an error STRING (surfaced on the msg for the user), or
   undefined when that input key is absent. The union is the contract, not an accident. */

// installed
// TODO: import your wrapped library's parser class type (e.g. NMEAParser, SBGParser…)
import type { NMEAParser as Parser } from '@coremarine/TODO:'

// Pure wrapper logic — NO node-red dependency, so it is unit-testable with a real
// parser instance and node:test. The thin RED adapter (parser.ts) wires msg -> these.
//
// memory + payload are UNIVERSAL (every CoreMarine parser has them). The protocol-specific
// handlers below (protocols/sentence/fake) exist on the NMEA family — TODO: keep only the
// ones your parser supports; a binary parser (SBG/Septentrio) would delete them.

export interface MemoryInput {
  command?: unknown
  payload?: unknown
}

export interface MemoryReport {
  memory: boolean
  characters: number
}

// Reads a protocols YAML file by path. Injected so the logic stays side-effect-free
// and testable; the adapter supplies a node:fs reader. (NMEA family only.)
export type FileReader = (path: string) => string

const isString = (value: unknown): value is string => typeof value === 'string'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNil = (value: unknown): value is null | undefined => value === null || value === undefined

const report = (parser: Parser): MemoryReport => ({
  memory: parser.memory,
  characters: parser.bufferLimit
})

// memory: { command: 'get' } | { command: 'set', payload: boolean }   [UNIVERSAL]
export const applyMemory = (parser: Parser, memory: MemoryInput | undefined): MemoryReport | string | undefined => {
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

// payload: ASCII/binary input -> CMA[]   [UNIVERSAL]
export const parsePayload = (parser: Parser, payload: unknown): ReturnType<Parser['parseData']> | string | undefined => {
  if (isNil(payload)) return undefined
  // TODO: adjust the guard for your input type (string for text protocols, Uint8Array for binary)
  if (!isString(payload)) return 'payload must be an ASCII string'
  return parser.parseData(payload)
}

// TODO (NMEA family only): protocols set/get via addSentences(yaml)+getSentencesByProtocol,
// getSentenceInfo(id) and getFakeSentence(id). See packages/nmea-parser-nodered/src/lib.ts
// for the full reference implementation. Delete this block for parsers that don't support it.

// Drop keys whose value came back undefined (input not present).   [UNIVERSAL]
export const cleanUndefined = (msg: Record<string, unknown>): void => {
  for (const key of Object.keys(msg)) {
    if (msg[key] === undefined) delete msg[key]
  }
}
