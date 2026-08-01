/* eslint-disable sonarjs/function-return-type -- node-red msg API by design: each handler
   returns the value on success, an error STRING (surfaced on the msg for the user), or
   undefined when that input key is absent. The union is the contract, not an accident. */

// installed
import type { NMEALike, NMEAParser, Sentence } from '@coremarine/nmea-parser'

// Pure wrapper logic — NO node-red dependency, so it is unit-testable with a real
// NMEAParser and node:test. The thin RED adapter (parser.ts) wires msg -> these.

export interface MemoryInput {
  command?: unknown
  payload?: unknown
}

export interface SentencesInput {
  command?: unknown
  file?: unknown
  content?: unknown
}

export interface MemoryReport {
  memory: boolean
  characters: number
}

// Reads a sentences YAML file by path. Injected so the logic stays side-effect-free
// and testable; the adapter supplies a node:fs reader.
export type FileReader = (path: string) => string

const isString = (value: unknown): value is string => typeof value === 'string'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNil = (value: unknown): value is null | undefined => value === null || value === undefined

// `Result.error` is an ARRAY of `{ kind, message }` — one call can be wrong for more than
// one reason. Reading `.message` off the array yields `undefined`, which is what a user
// saw instead of the actual problem.
export const messages = (errors: readonly { message: string }[]): string =>
  errors.map((entry) => entry.message).join('; ')

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

// sentences: { command: 'get' } | { command: 'set', file?: string, content?: string }
// Named for the library's own vocabulary (addSentences / getSentencesByProtocol):
// this channel carries sentence DEFINITIONS. Feeds a YAML string via addSentences
// (Result, never throws); a file path is read via the injected reader, keeping the
// node-only concern out of this module.
export const applySentences = (
  parser: NMEAParser,
  sentences: SentencesInput | undefined,
  readFile: FileReader,
): ReturnType<NMEAParser['getSentencesByProtocol']> | string | undefined => {
  if (isNil(sentences)) return undefined
  const { command, file, content } = sentences
  if (!isString(command)) return 'sentences.command should be "get" or "set"'
  if (command === 'get') return parser.getSentencesByProtocol()
  if (command === 'set') {
    let yaml: string
    if (isString(content)) {
      yaml = content
    } else if (isString(file) && file.length > 0) {
      try {
        yaml = readFile(file)
      } catch {
        return `sentences: cannot read file "${file}"`
      }
    } else {
      return 'sentences.set needs a "content" (YAML string) or a "file" path'
    }
    const result = parser.addSentences(yaml)
    if (!result.success) return `sentences: ${messages(result.error)}`
    return parser.getSentencesByProtocol()
  }
  return 'sentences.command should be "get" or "set"'
}

// definition: string id -> every stored definition of it
// Renamed from `sentence` in v5: an id in and a DEFINITION out, so the key now says
// which. The library returns a Result, and an array — one entry per NMEA version of
// the id — so an older revision is inspectable instead of hidden behind the newest.
export const getDefinition = (parser: NMEAParser, definition: unknown): Sentence[] | string | undefined => {
  if (isNil(definition)) return undefined
  if (!isString(definition)) return 'definition must be a sentence id string'
  const result = parser.getSentenceDefinition(definition)
  return result.success ? result.value : messages(result.error)
}

// fake: string id -> a fake NMEA-like sentence
// The library returns a Result, so an unknown id now arrives as an error STRING the
// user can read rather than a bare `null` they have to interpret.
export const getFakeSentence = (parser: NMEAParser, fake: unknown): NMEALike | string | undefined => {
  if (isNil(fake)) return undefined
  if (!isString(fake)) return 'fake sentence id must be a string'
  const result = parser.getFakeSentence(fake)
  return result.success ? result.value : messages(result.error)
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
