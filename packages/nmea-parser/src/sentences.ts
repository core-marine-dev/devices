// installed
import { TYPE_SCHEMAS, UNKNOWN } from '@coremarine/protocol-core'
import type { DraftCMA, Field, GarbageSentence, Type, Value } from '@coremarine/protocol-core'

// coded
import { calculateChecksum, numberChecksumToString, stringChecksumToNumber } from './checksum'
import { CHECKSUM_LENGTH, DELIMITER, DELIMITER_LENGTH, END_FLAG, END_FLAG_LENGTH, NMEA_ID_LENGTH, SEPARATOR, SEPARATOR_LENGTH, START_FLAG, START_FLAG_LENGTH, TALKERS, TALKERS_SPECIAL } from './constants'
import { aggregateMetadata } from './metadata'
import type { MetadataAggregators } from './metadata'
import { resolveSentenceId } from './resolvers'
import type { SentenceResolvers } from './resolvers'
import type { MapStoredSentences, NMEALike, ProtocolField, ProtocolFieldType, StoredSentence, Talker } from './types'
import { isLowerCharASCII, isNumberCharASCII, isUpperCharASCII } from './utils'

// EXTRACTION ---------------------------------------------------------------------------------------------------------
export const lastUncompletedSentence = (text: string): string | null => {
  // Start of the last possible sentence
  const lastStartIndex = text.lastIndexOf(START_FLAG)
  if (lastStartIndex === -1) {
    return null
  }
  const remainder = text.slice(lastStartIndex)
  // Complete sentence -> nothing pending
  if (remainder.includes(END_FLAG)) {
    return null
  }
  return remainder
}

// A chunk of the buffer, classified. EVERY character of the buffer ends up in
// exactly one chunk (or in the pending remainder) — nothing is ever discarded
// silently, which is the whole point: malformed input must reach the consumer as
// a CMA carrying `errors`, not vanish. `errors` here are the FRAMING errors
// (terminator/structure); checksum errors are added when the body is parsed.
export interface ScannedChunk {
  raw: string
  garbage: boolean
  errors: string[]
}

export interface ScannedBuffer {
  chunks: ScannedChunk[]
  remainder: string
}

export const MISSING_END_FLAG_ERROR = 'Missing end flag: expected \\r\\n'
export const INVALID_END_FLAG_ERROR = 'Invalid end flag: expected \\r\\n, received \\n'
export const GARBAGE_ERROR = 'Unparseable input: not an NMEA sentence'
export const NO_DELIMITER_ERROR = `Unparseable input: no checksum delimiter (${DELIMITER}), so the sentence length is unknown`
export const INVALID_ID_ERROR = 'Unparseable input: invalid sentence id'
export const bufferLimitError = (limit: number): string => `Buffer limit exceeded (${limit} characters): discarded unterminated input`

// An NMEA id is alphanumeric (talker + mnemonic, e.g. `GPGGA`, `PNORSUB8`).
const VALID_ID = /^[A-Za-z0-9]+$/
const LINE_FEED = '\n'
const CARRIAGE_RETURN = '\r'

// Strip the terminator so the body can be split regardless of how (or whether)
// the sentence was terminated: `\r\n`, a lone `\n`, or not at all.
const stripTerminator = (raw: string): string => {
  if (raw.endsWith(END_FLAG)) return raw.slice(0, -END_FLAG_LENGTH)
  if (raw.endsWith(LINE_FEED)) return raw.slice(0, -LINE_FEED.length)
  return raw
}

// Where the `$`-chunk starting at `start` ends, and what is wrong with the way
// it ends. `null` = not terminated yet: it may still be completed by more data,
// so it must NOT be reported as an error — it goes back on the buffer.
const closeChunk = (text: string, start: number): { end: number, errors: string[] } | null => {
  const feed = text.indexOf(LINE_FEED, start)
  const nextStart = text.indexOf(START_FLAG, start + START_FLAG_LENGTH)
  // A following `$` before any terminator PROVES this chunk will never get one.
  if (nextStart !== -1 && (feed === -1 || nextStart < feed)) {
    return { end: nextStart, errors: [MISSING_END_FLAG_ERROR] }
  }
  if (feed === -1) return null
  // Every `\r\n` contains the `\n` we just found, so the first line feed is the
  // first terminator either way — only its shape differs.
  const errors = (text[feed - 1] === CARRIAGE_RETURN) ? [] : [INVALID_END_FLAG_ERROR]
  return { end: feed + 1, errors }
}

const garbageChunk = (raw: string, error: string = GARBAGE_ERROR): ScannedChunk => ({ raw, garbage: true, errors: [error] })

// Blank space between sentences (an extra empty line, a stray `\r`) is normal on
// a serial line and carries no information — reporting it would be exactly the
// repetitive noise this feature exists to avoid.
const isIgnorable = (raw: string): boolean => raw.trim().length === 0

// Adjacent junk is merged so one noisy burst yields ONE garbage sentence
// instead of a flood of tiny ones.
const pushGarbage = (chunks: ScannedChunk[], raw: string, error?: string): void => {
  if (isIgnorable(raw)) return
  const previous = chunks.at(-1)
  if (previous?.garbage === true) {
    previous.raw += raw
    if (error !== undefined && !previous.errors.includes(error)) previous.errors.push(error)
    return
  }
  chunks.push(garbageChunk(raw, error))
}

// A `$`-chunk is a sentence attempt only if the extent of its data is KNOWN and
// it is identifiable. Without a `*` we cannot tell how much is missing, so
// claiming a field list would be a lie — that is garbage, not a sentence.
const classifyChunk = (raw: string, framing: string[]): ScannedChunk => {
  const body = stripTerminator(raw).slice(START_FLAG_LENGTH)
  const delimiter = body.lastIndexOf(DELIMITER)
  if (delimiter === -1) return garbageChunk(raw, NO_DELIMITER_ERROR)
  const id = body.slice(0, delimiter).split(SEPARATOR)[0]
  if (!VALID_ID.test(id)) return garbageChunk(raw, INVALID_ID_ERROR)
  return { raw, garbage: false, errors: framing }
}

// Walk the buffer and classify all of it: sentence attempts, garbage, and the
// still-incomplete tail. Replaces the old filter chain, which silently dropped
// everything it rejected.
export const scanBuffer = (text: string, bufferLimit: number): ScannedBuffer => {
  const chunks: ScannedChunk[] = []
  let index = 0
  while (index < text.length) {
    const start = text.indexOf(START_FLAG, index)
    // No `$` left — the rest can never become a sentence, so report it now
    // rather than waiting for a start flag that may never arrive.
    if (start === -1) {
      pushGarbage(chunks, text.slice(index))
      return { chunks, remainder: '' }
    }
    if (start > index) pushGarbage(chunks, text.slice(index, start))
    const boundary = closeChunk(text, start)
    if (boundary === null) {
      const pending = text.slice(start)
      // Unterminated but still growing. Binary protocols routinely contain `$`
      // bytes, so without this the buffer would grow forever and the wrong-device
      // case would stay silent — the one outcome we are removing.
      if (pending.length > bufferLimit) {
        pushGarbage(chunks, pending, bufferLimitError(bufferLimit))
        return { chunks, remainder: '' }
      }
      return { chunks, remainder: pending }
    }
    const chunk = classifyChunk(text.slice(start, boundary.end), boundary.errors)
    // Route garbage through pushGarbage too, so a run of unusable `$` fragments
    // merges into one report instead of one per fragment.
    if (chunk.garbage) {
      pushGarbage(chunks, chunk.raw, chunk.errors[0])
    } else {
      chunks.push(chunk)
    }
    index = boundary.end
  }
  return { chunks, remainder: '' }
}

// Tolerates a missing/malformed terminator and takes the LAST `*` as the
// checksum delimiter (per NMEA), so a `*` inside the payload cannot hide it.
export const getIdPayloadAndChecksum = (raw: string): { id: string, payload: string, checksum: string } => {
  const body = stripTerminator(raw).slice(START_FLAG_LENGTH)
  const delimiter = body.lastIndexOf(DELIMITER)
  const info = (delimiter === -1) ? body : body.slice(0, delimiter)
  const checksum = (delimiter === -1) ? '' : body.slice(delimiter + DELIMITER_LENGTH)
  const id = info.split(SEPARATOR)[0]
  const payload = info.slice(id.length + SEPARATOR_LENGTH)
  return { id, payload, checksum }
}

export const getTalker = (sentenceID: string): Talker | null => {
  if (sentenceID.length <= NMEA_ID_LENGTH) return null
  // Known talker
  const talker = TALKERS.filter(([talkerID]) => sentenceID.startsWith(talkerID))
  if (talker.length === 1) {
    return { value: talker[0][0], description: talker[0][1] }
  }
  // Special talker U# (user configured)
  if (sentenceID.startsWith('U') && !isNaN(Number(sentenceID[1]))) {
    return { value: sentenceID.slice(0, 2), description: TALKERS_SPECIAL.U }
  }
  // Special talker Pxxx (proprietary) — the whole id is the talker
  if (sentenceID.startsWith('P')) {
    return { value: sentenceID, description: TALKERS_SPECIAL.P }
  }
  return null
}

// VALUE PARSING ------------------------------------------------------------------------------------------------------
const parseBoolean = (value: string): boolean | undefined => {
  const lower = value.toLowerCase()
  if (lower === 'false' || value === '0') return false
  if (lower === 'true' || value === '1') return true
  return undefined
}

const STRING_INTEGER_TYPES = new Set<ProtocolFieldType>(['int64', 'uint64'])

// eslint-disable-next-line sonarjs/function-return-type -- intentional union: a field value is string | number | boolean | null per its declared type
export const parseValue = (raw: string, type: ProtocolFieldType): Value => {
  // Present-but-empty field
  if (raw === '') return null
  if (type === 'string') return raw
  if (type === 'boolean') return parseBoolean(raw) ?? null
  const schema = TYPE_SCHEMAS[type as Type]
  // 64-bit integers ride as decimal strings (JSON-safe, no bigint)
  if (STRING_INTEGER_TYPES.has(type)) return schema.is(raw) ? raw : null
  const num = Number(raw)
  if (Number.isNaN(num)) return null
  return schema.is(num) ? num : null
}

// GENERIC PARSE ------------------------------------------------------------------------------------------------------
const genericField = (raw: string): Field => ({
  raw,
  name: 'unknown',
  type: 'string',
  value: raw === '' ? null : raw,
})

const CHECKSUM_FORMAT = /^[0-9A-Fa-f]{2}$/

// Two INDEPENDENT problems, so both can be reported at once: the checksum is not
// two hex characters, and/or it does not match the data. A device that drops the
// leading zero (computes 0x04, sends `*4`) gets only the format error, because
// the value still compares equal — no false corruption claim.
const checksumErrors = (info: string, checksum: string): string[] => {
  const errors: string[] = []
  if (!CHECKSUM_FORMAT.test(checksum)) {
    errors.push(`Invalid checksum format: expected ${CHECKSUM_LENGTH} hexadecimal characters, received "${checksum}"`)
  }
  const computed = calculateChecksum(info)
  if (stringChecksumToNumber(checksum) !== computed) {
    errors.push(`Invalid checksum: computed ${numberChecksumToString(computed)}, received ${checksum}`)
  }
  return errors
}

// A sentence with no `,` at all: the extent IS known (the `*` bounds it), so it
// is reported rather than dropped, but it has no fields to decode.
export const MISSING_SEPARATOR_ERROR = `Missing field separator (${SEPARATOR})`

const genericPayload = (info: string, payload: string): Field[] => (
  info.includes(SEPARATOR) ? payload.split(SEPARATOR).map(genericField) : []
)

// `framing` = errors found while chunking the buffer (bad/missing terminator).
const parseGenericSentence = (raw: string, framing: string[] = []): DraftCMA => {
  const { id, payload, checksum } = getIdPayloadAndChecksum(raw)
  const hasSeparator = payload.length > 0 || raw.includes(SEPARATOR)
  const info = hasSeparator ? `${id}${SEPARATOR}${payload}` : id
  const talker = getTalker(id)
  const metadata: Record<string, unknown> = { checksum, standard: false }
  if (talker !== null) metadata.talker = talker
  const generic: DraftCMA = {
    raw,
    timestamp: Date.now(),
    id,
    protocol: { name: 'NMEA', version: UNKNOWN },
    payload: genericPayload(info, payload),
    metadata,
  }
  const errors = [...framing, ...checksumErrors(info, checksum)]
  if (!hasSeparator) errors.push(MISSING_SEPARATOR_ERROR)
  if (errors.length > 0) generic.errors = errors
  return generic
}

// Undecodable input, as a valid CMA: every mandatory string is UNKNOWN and the
// payload is empty. What matters is `raw` (the junk itself), the timestamps, and
// `errors` saying why. See `GarbageSentence` in protocol-core.
export const garbageSentence = (raw: string, errors: string[]): GarbageSentence => ({
  raw,
  timestamp: Date.now(),
  id: UNKNOWN,
  protocol: { name: UNKNOWN, version: UNKNOWN },
  payload: [],
  metadata: { checksum: UNKNOWN, standard: false },
  errors,
})

// UPGRADE (match against the knowledge base) -------------------------------------------------------------------------
export const hasSameNumberOfFields = (payload: string, sentence: StoredSentence): boolean => (
  payload.split(SEPARATOR).length === sentence.payload.length
)

// Try the full id first, then the talker-stripped id (unless the talker IS the
// whole id, e.g. proprietary P-sentences).
const candidateIds = (fullId: string, talker: Talker | null): string[] => {
  if (talker === null || talker.value === fullId) return [fullId]
  return [fullId, fullId.slice(talker.value.length)]
}

const versionParts = (version?: string): number[] => (version ?? '').split('.').map((part) => Number.parseInt(part, 10))

// Higher version wins; missing/unparseable parts sort lowest.
const compareVersions = (a?: string, b?: string): number => {
  const [av, bv] = [versionParts(a), versionParts(b)]
  for (let index = 0; index < 3; index++) {
    const ai = Number.isNaN(av[index]) ? 0 : (av[index] ?? 0)
    const bi = Number.isNaN(bv[index]) ? 0 : (bv[index] ?? 0)
    if (ai !== bi) return ai - bi
  }
  return 0
}

export const newestDefinition = (definitions: StoredSentence[]): StoredSentence => definitions.reduce(
  (newest, current) => (compareVersions(current.protocol.version, newest.protocol.version) > 0 ? current : newest),
  definitions[0],
)

const buildField = (field: ProtocolField, raw: string): Field => {
  const result: Field = { raw, name: field.name, type: field.type, value: parseValue(raw, field.type) }
  if (field.units !== undefined) result.units = field.units
  if (field.description !== undefined) result.description = field.description
  return result
}

const applyDefinition = (generic: DraftCMA, id: string, model: StoredSentence): DraftCMA => {
  const payload = model.payload.map((field, index) => buildField(field, generic.payload[index].raw))
  const upgraded: DraftCMA = {
    ...generic,
    id,
    protocol: { name: model.protocol.name, version: model.protocol.version ?? 'unknown' },
    payload,
    metadata: { ...generic.metadata, standard: model.protocol.standard ?? false },
  }
  if (model.description !== undefined) upgraded.description = model.description
  return upgraded
}

const upgradeKnownSentence = (generic: DraftCMA, definitions: MapStoredSentences): DraftCMA => {
  const talker = getTalker(generic.id)
  const fieldCount = generic.payload.length
  for (const id of candidateIds(generic.id, talker)) {
    const matches = (definitions.get(id) ?? []).filter((def) => def.payload.length === fieldCount)
    if (matches.length === 0) continue
    return applyDefinition(generic, id, newestDefinition(matches))
  }
  return generic
}

// The pipeline: decode generically -> resolve the id (for formats that carry
// their real type in a field, e.g. PSXN) -> match the knowledge base -> derive
// metadata. `aggregators`/`resolvers` default to the built-ins; a parser passes
// its own registries so subclass-registered ones are applied too.
export const parseSentence = (
  raw: string,
  definitions: MapStoredSentences,
  aggregators?: MetadataAggregators,
  framing: string[] = [],
  resolvers?: SentenceResolvers,
): DraftCMA => (
  aggregateMetadata(
    upgradeKnownSentence(resolveSentenceId(parseGenericSentence(raw, framing), resolvers), definitions),
    aggregators,
  )
)

// TESTING — FAKE SENTENCE GENERATION ---------------------------------------------------------------------------------
// eslint-disable-next-line sonarjs/function-return-type, sonarjs/cyclomatic-complexity -- intentional union per field type; test data generation
const createNumberValue = (type: ProtocolFieldType): number | string | null => {
  // eslint-disable-next-line sonarjs/pseudo-random -- test data generation, not security-sensitive
  const sign = (Math.random() < 0.5) ? -1 : 1
  // eslint-disable-next-line sonarjs/pseudo-random -- test data generation, not security-sensitive
  const useed = Math.round(Math.random() * (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER) + Number.MIN_SAFE_INTEGER)
  const seed = useed * sign
  // eslint-disable-next-line sonarjs/pseudo-random -- test data generation, not security-sensitive
  const fseed = Math.random() * sign
  const uint64 = new BigUint64Array([0n])
  globalThis.crypto.getRandomValues(uint64)
  const int64 = new BigInt64Array([0n])
  globalThis.crypto.getRandomValues(int64)
  switch (type) {
    case 'uint8': return (new Uint8Array([useed]))[0]
    case 'uint16': return (new Uint16Array([useed]))[0]
    case 'uint32': return (new Uint32Array([useed]))[0]
    case 'uint64': return uint64[0].toString()
    case 'int8': return (new Int8Array([seed]))[0]
    case 'int16': return (new Int16Array([seed]))[0]
    case 'int32': return (new Int32Array([seed]))[0]
    case 'int64': return int64[0].toString()
    case 'float32': return (new Float32Array([fseed]))[0]
    case 'float64': return (new Float64Array([fseed]))[0]
  }
  return null
}

const createStringValue = (): string => {
  // eslint-disable-next-line sonarjs/pseudo-random -- test data generation, not security-sensitive
  const text = Math.random().toString(36).substring(2)
  return Array.from(text)
    .map((letter) => (isLowerCharASCII(letter) || isUpperCharASCII(letter) || isNumberCharASCII(letter)) ? letter : 'a')
    .join('')
}

// eslint-disable-next-line sonarjs/function-return-type -- intentional union per field type; test data generation
export const createValue = (type: ProtocolFieldType): Value => {
  switch (type) {
    case 'boolean':
      // eslint-disable-next-line sonarjs/pseudo-random -- test data generation, not security-sensitive
      return Math.random() > 0.5
    case 'string':
      return createStringValue()
  }
  return createNumberValue(type)
}

export const createPayload = (model: StoredSentence): string => {
  const values = model.payload.map((field) => {
    const value = createValue(field.type)
    return (value !== null) ? value.toString() : ''
  })
  return values.join(SEPARATOR)
}

export const createFakeSentence = (model: StoredSentence, talker?: string): NMEALike => {
  const id = (talker !== undefined) ? `${talker}${model.id}` : model.id
  const info = `${id}${SEPARATOR}${createPayload(model)}`
  const checksum = numberChecksumToString(calculateChecksum(info))
  return `${START_FLAG}${info}${DELIMITER}${checksum}${END_FLAG}`
}
