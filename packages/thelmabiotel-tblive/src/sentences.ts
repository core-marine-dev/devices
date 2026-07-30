// installed
import { TYPE_SCHEMAS, UNKNOWN } from '@coremarine/protocol-core'
import type { DraftCMA, Field, Metadata, Type, Value } from '@coremarine/protocol-core'

// coded
import {
  LOG_IDENTIFIER,
  LOG_IDENTIFIER_INDEX,
  PROTOCOL_NAME,
  SAMPLE_FIELDS,
  SAMPLE_SHAPES,
  errorFieldCount,
  errorInvalidField,
} from './definitions'
import type { FieldSpec, Firmware, Mode, SampleShape, SentenceId } from './definitions'
import { aggregate } from './metadata'
import type { Match } from './tokenizer'

const SAMPLE_START = '$'
const SAMPLE_END = '\r'
const SAMPLE_SPLIT = ','

// An empty field is `null` — present but empty — and is NOT an error: the docs
// say the emitter `data` field is blank for ID-only transmit protocols. A
// non-empty field that fails its declared type IS reported. Note the declared
// type doubles as a range check here, which is why identifiers are `string`:
// narrowing them would silently null out real serials.
// eslint-disable-next-line sonarjs/function-return-type -- intentional union: a field value is string | number | boolean | null per its declared type
const parseValue = (raw: string, type: Type): Value => {
  if (raw === '') return null
  if (type === 'string') return raw
  const value = Number(raw)
  if (Number.isNaN(value)) return null
  return TYPE_SCHEMAS[type].is(value) ? value : null
}

const buildField = (raw: string, spec: FieldSpec): Field => {
  const value = parseValue(raw, spec.type)
  const field: Field = { raw, name: spec.name, type: spec.type, value }
  if (spec.units !== undefined) {
    field.units = spec.units
  }
  if (spec.description !== undefined) {
    field.description = spec.description
  }
  if (value === null && raw !== '') {
    field.errors = [errorInvalidField(spec.name, raw)]
  }
  return field
}

const fieldErrors = (payload: Field[]): string[] => payload.flatMap((field) => field.errors ?? [])

// A `$…\r` chunk is an `emitter` or a `receiver`, decided by field count. At 8
// fields both a 1.0.1 log and a 1.0.2 detection are possible, so the log
// identifier breaks the tie — matched case-insensitively on `sensor`, because the
// datasheets spell it "TBR Sensor" in one firmware and "Live Sensor" in the other.
export const resolveSample = (fields: string[]): SampleShape | undefined => {
  const shapes = SAMPLE_SHAPES[fields.length]
  if (shapes === undefined) {
    return undefined
  }
  if (shapes.length === 1) {
    return shapes[0]
  }
  const identifier = fields[LOG_IDENTIFIER_INDEX] ?? ''
  const isLog = identifier.toLowerCase().includes(LOG_IDENTIFIER)
  return shapes.find((shape) => (shape.id === 'receiver') === isLog)
}

interface Built {
  id: SentenceId | typeof UNKNOWN
  version: Firmware
  payload: Field[]
  errors: string[]
}

// A `$…\r` whose field count matches no known shape: we genuinely cannot tell a
// detection from a log, so the id is `unknown` rather than a guess — but the CSV
// is kept as generic fields so the data stays inspectable.
const unknownSample = (fields: string[]): Built => ({
  id: UNKNOWN,
  version: UNKNOWN,
  payload: fields.map((raw) => ({ raw, name: UNKNOWN, type: 'string' as Type, value: raw === '' ? null : raw })),
  errors: [errorFieldCount(fields.length)],
})

const buildSample = (raw: string, extra: string[]): Built => {
  const body = raw.slice(SAMPLE_START.length, raw.length - SAMPLE_END.length)
  const fields = body.split(SAMPLE_SPLIT)
  const shape = resolveSample(fields)
  if (shape === undefined) {
    const built = unknownSample(fields)
    return { ...built, errors: [...built.errors, ...extra] }
  }
  const specs = SAMPLE_FIELDS[shape.id][shape.firmware]
  const payload = fields.map((field, index) => buildField(field, specs[index]))
  return { id: shape.id, version: shape.firmware, payload, errors: [...fieldErrors(payload), ...extra] }
}

// Every non-sample sentence carries exactly one payload element: the response.
// The value slice is whatever follows the start flag, except for the delimited
// ping, whose `><>\r` tail is a marker rather than data.
const responseValue = (raw: string, match: Match): string => {
  const body = raw.slice(match.spec.start.length)
  const end = match.spec.end
  return (end !== undefined && body.endsWith(end)) ? body.slice(0, body.length - end.length) : body
}

const buildResponse = (raw: string, match: Match, extra: string[]): Built => {
  const spec = match.spec.fields?.[0]
  if (spec === undefined) {
    return { id: UNKNOWN, version: UNKNOWN, payload: [], errors: [...extra] }
  }
  // A literal sentence IS its own value (`EX!`, `ack01\r`); the rest carry one.
  const value = (match.spec.kind === 'literal') ? match.spec.start.trim() : responseValue(raw, match)
  const payload = [buildField(value, spec)]
  return {
    id: match.spec.id ?? UNKNOWN,
    version: match.spec.firmware ?? UNKNOWN,
    payload,
    errors: [...fieldErrors(payload), ...extra],
  }
}

export interface SentenceContext {
  timestamp: number
  // The firmware learned so far, used when a sentence carries no evidence of its
  // own. `unknown` until something proves it.
  firmware: Firmware
}

export const buildSentence = (raw: string, match: Match, context: SentenceContext, extra: string[] = []): DraftCMA => {
  const built = (match.spec.token === 'sample') ? buildSample(raw, extra) : buildResponse(raw, match, extra)
  // A sentence that proves its own firmware wins; otherwise fall back to what the
  // device has already told us, which is honest rather than the old hardcoded
  // '1.0.2' guess.
  const version = (built.version === UNKNOWN) ? context.firmware : built.version
  const metadata: Metadata = { mode: match.spec.mode }
  const payloadMetadata = aggregate(built.id, built.payload)
  if (payloadMetadata !== undefined) {
    metadata.payload = payloadMetadata
  }
  const sentence: DraftCMA = {
    raw,
    timestamp: context.timestamp,
    id: built.id,
    protocol: { name: PROTOCOL_NAME, version },
    payload: built.payload,
    metadata,
  }
  if (built.errors.length > 0) {
    sentence.errors = built.errors
  }
  return sentence
}

// Undecodable input. Still a valid CMA: every mandatory value is `unknown` and
// the payload empty, but `raw` keeps the discarded bytes so they can be
// inspected, and `errors` says why. Nothing is ever dropped silently.
export const buildGarbage = (raw: string, error: string, timestamp: number, mode: Mode = UNKNOWN): DraftCMA => ({
  raw,
  timestamp,
  id: UNKNOWN,
  protocol: { name: UNKNOWN, version: UNKNOWN },
  payload: [],
  metadata: { mode },
  errors: [error],
})
