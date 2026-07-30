// installed
import type { Result } from '@coremarine/protocol-core'

// coded
import { FIRMWARES, PROTOCOL_NAME, SAMPLE_DESCRIPTIONS, SAMPLE_FIELDS, TOKENS } from './definitions'
import type { FieldSpec, Firmware, Mode, SentenceId } from './definitions'

// SELF-DESCRIPTION --------------------------------------------------------------------------------------------------
// Ask the parser what it knows about a sentence: its fields, their types and units,
// and which of the device's APIs it belongs to.
//
// This exists for DIAGNOSIS. These parsers run on remote installations with
// restricted internet access and stay there for years, so an operator who can ask
// the deployed binary "what do you think a `receiver` sentence looks like on 1.0.2?"
// can settle a question that would otherwise need the datasheets and a shell.

// Deliberately CMA-SHAPED. A definition is what a parsed sentence would look like
// before any data arrives, so it carries the same keys minus the ones only a real
// parse can fill: no `raw`, no `timestamp`, no `errors`, and `payload` holds field
// DEFINITIONS (name/type/units/description) rather than decoded values.
//
// `mode` sits at the top level rather than in `metadata` because a definition has no
// metadata to nest it in. It is also the one key nmea and norsub do not need — they
// have a single API surface, whereas TB Live has a listening one and a command one.
//
// This is the same shape nmea-parser's definition lookup already returns, so the two
// converge: `{ id, protocol, payload }` plus tblive's `mode`.
export interface SentenceDefinition {
  id: SentenceId
  protocol: { name: typeof PROTOCOL_NAME, version: Firmware }
  payload: FieldSpec[]
  mode: Mode
  // Prose, because the shape stays CMA-clean. It carries what a structured `wire`
  // object used to: what the sentence is, how it is recognised in a frameless
  // stream, and whether this firmware differs from the other.
  description?: string
}

const isSample = (id: SentenceId): id is 'emitter' | 'receiver' => id === 'emitter' || id === 'receiver'

// Control characters read badly inside prose, so name them.
const readable = (flag: string): string =>
  flag.replace(/\r/g, '<CR>').replace(/\n/g, '<LF>')

// How the sentence is found on the wire. For a protocol with NO framing this is the
// least guessable fact about it, and the datasheets are the only other source.
const wireProse = (spec: { kind: string, start: string, end?: string, minDigits?: number, maxDigits?: number }): string => {
  const start = `\`${readable(spec.start)}\``
  if (spec.kind === 'literal') return `Recognised as the fixed literal ${start}.`
  if (spec.kind === 'delimited') return `Recognised by ${start} and terminated by \`${readable(spec.end ?? '')}\`.`
  if (spec.kind === 'version') return `Recognised by ${start} followed by a dotted version such as 1.0.2; a leading \`v\` is tolerated.`
  const min = spec.minDigits ?? 0
  const max = spec.maxDigits ?? min
  const digits = (min === max) ? `exactly ${min} digits` : `${min} to ${max} digits`
  return `Recognised by ${start} followed by ${digits}.`
}

// What changes between firmwares — the reason `protocol` is worth passing at all.
// `specific` is false for the 15 sentences that are identical on both, and saying so
// explicitly is the point: it answers "does the firmware matter here?" without
// needing a second call to compare.
const firmwareProse = (id: SentenceId, protocol: Firmware, specific: boolean): string => {
  if (!specific) return 'Identical on both documented firmwares.'
  const other = FIRMWARES.find((version) => version !== protocol) as typeof FIRMWARES[number]
  if (isSample(id)) {
    const mine = SAMPLE_FIELDS[id][protocol as typeof FIRMWARES[number]].length
    return `Identified by its ${mine} fields: firmware ${other} sends ${SAMPLE_FIELDS[id][other].length}.`
  }
  return `Firmware ${protocol} only; firmware ${other} uses a different form for this sentence.`
}

// Always yields text: the wire prose alone is never empty, so a sentence can never
// end up undescribed even if its authored prose is missing.
const describe = (
  id: SentenceId,
  protocol: Firmware,
  authored: string | undefined,
  wire: string,
  specific: boolean,
): string =>
  [authored, wire, firmwareProse(id, protocol, specific)]
    .filter((part) => part !== undefined && part.length > 0)
    .join(' ')

// `$…\r` sentences have no token of their own: the token cannot name them, since the
// field count decides. Their wire form is the shared one.
const SAMPLE_WIRE = { kind: 'delimited', start: '$', end: '\r' }

const definitionFor = (id: SentenceId, protocol: Firmware): SentenceDefinition | undefined => {
  if (isSample(id)) {
    const definition: SentenceDefinition = {
      id,
      protocol: { name: PROTOCOL_NAME, version: protocol },
      // Copied, so a caller cannot corrupt the parser's own tables.
      payload: [...SAMPLE_FIELDS[id][protocol as typeof FIRMWARES[number]]],
      mode: 'listening',
    }
    definition.description = describe(id, protocol, SAMPLE_DESCRIPTIONS[id], wireProse(SAMPLE_WIRE), true)
    return definition
  }
  const spec = TOKENS.find((token) =>
    token.id === id && (token.firmware === undefined || token.firmware === protocol))
  if (spec === undefined) return undefined
  const definition: SentenceDefinition = {
    id,
    protocol: { name: PROTOCOL_NAME, version: protocol },
    payload: [...(spec.fields ?? [])],
    mode: spec.mode,
  }
  definition.description = describe(id, protocol, spec.description, wireProse(spec), spec.firmware !== undefined)
  return definition
}

// Every sentence this parser can describe.
export const definableIds = (): SentenceId[] => {
  const ids = new Set<SentenceId>(['emitter', 'receiver'])
  for (const token of TOKENS) {
    if (token.id !== undefined) {
      ids.add(token.id)
    }
  }
  return [...ids]
}

const isKnownFirmware = (value: unknown): value is typeof FIRMWARES[number] =>
  FIRMWARES.includes(value as typeof FIRMWARES[number])

// Always an ARRAY, even for one match: omitting `protocol` asks for every protocol
// version of the sentence, and a uniform return type is easier to consume than one
// that is sometimes an object. Returns a `Result` so an unknown id says so.
export const describeSentence = (
  id: SentenceId,
  protocol?: Firmware,
): Result<SentenceDefinition[], string[]> => {
  if (protocol !== undefined && !isKnownFirmware(protocol)) {
    return {
      success: false,
      error: [`Unknown protocol: ${JSON.stringify(protocol)} — expected one of ${FIRMWARES.join(', ')}`],
    }
  }
  const wanted = (protocol === undefined) ? FIRMWARES : [protocol]
  const definitions = wanted
    .map((version) => definitionFor(id, version))
    .filter((definition): definition is SentenceDefinition => definition !== undefined)
  if (definitions.length === 0) {
    return { success: false, error: [`Unknown sentence id: ${JSON.stringify(id)}`] }
  }
  return { success: true, value: definitions }
}
