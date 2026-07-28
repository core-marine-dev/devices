// installed
import { TYPE_SCHEMAS } from '@coremarine/protocol-core'
import type { DraftCMA, Field, Type, Value } from '@coremarine/protocol-core'

// coded
import { calculateChecksum, numberChecksumToString, stringChecksumToNumber } from './checksum'
import { CHECKSUM_LENGTH, DELIMITER, END_FLAG, END_FLAG_LENGTH, MINIMAL_LENGTH, NMEA_ID_LENGTH, SEPARATOR, START_FLAG, TALKERS, TALKERS_SPECIAL } from './constants'
import { aggregateMetadata } from './metadata'
import type { MetadataAggregators } from './metadata'
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

const hasSingleDelimiter = (str: string): boolean => {
  const first = str.indexOf(DELIMITER)
  return first !== -1 && first === str.lastIndexOf(DELIMITER)
}

const hasChecksumFormat = (str: string): boolean => {
  const cs = str.split(DELIMITER)[1] ?? ''
  return cs.length === CHECKSUM_LENGTH && /^[0-9A-Fa-f]{2}$/.test(cs)
}

const hasValidPayload = (str: string): boolean => {
  const payload = str.split(DELIMITER)[0]
  return payload.includes(SEPARATOR) && !['\r', '\n'].some((char) => payload.includes(char))
}

// Extract every well-formed candidate sentence from the buffer. Checksum VALUE
// is not verified here (a bad checksum is emitted with an error downstream, per
// the CMA "never drop" rule) — only structural shape qualifies a candidate.
export const getUnparsedNMEASentences = (text: string): NMEALike[] => {
  if ([START_FLAG, SEPARATOR, DELIMITER, END_FLAG].some((flag) => !text.includes(flag))) {
    return []
  }
  return text
    .split(END_FLAG)
    .filter((str) => str.length > MINIMAL_LENGTH)
    .filter((str) => str.includes(START_FLAG))
    .map((str) => str.split(START_FLAG).at(-1) as string)
    .filter(hasSingleDelimiter)
    .filter(hasChecksumFormat)
    .filter(hasValidPayload)
    .map((str) => `${START_FLAG}${str}${END_FLAG}` as NMEALike)
}

export const getIdPayloadAndChecksum = (raw: NMEALike): { id: string, payload: string, checksum: string } => {
  const [info, checksum] = raw.slice(START_FLAG.length, -END_FLAG_LENGTH).split(DELIMITER)
  const id = info.split(SEPARATOR)[0]
  const payload = info.slice(id.length + SEPARATOR.length)
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

const checksumErrors = (info: string, checksum: string): string[] => {
  const computed = calculateChecksum(info)
  if (stringChecksumToNumber(checksum) === computed) return []
  return [`Invalid checksum: computed ${numberChecksumToString(computed)}, received ${checksum}`]
}

const parseGenericSentence = (raw: NMEALike): DraftCMA => {
  const { id, payload, checksum } = getIdPayloadAndChecksum(raw)
  const info = `${id}${SEPARATOR}${payload}`
  const talker = getTalker(id)
  const metadata: Record<string, unknown> = { checksum, standard: false }
  if (talker !== null) metadata.talker = talker
  const generic: DraftCMA = {
    raw,
    timestamp: Date.now(),
    id,
    protocol: { name: 'NMEA', version: 'unknown' },
    payload: payload.split(SEPARATOR).map(genericField),
    metadata,
  }
  const errors = checksumErrors(info, checksum)
  if (errors.length > 0) generic.errors = errors
  return generic
}

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

// `aggregators` defaults to the built-ins; a parser passes its own registry so
// subclass-registered aggregators are applied too.
export const parseSentence = (raw: NMEALike, definitions: MapStoredSentences, aggregators?: MetadataAggregators): DraftCMA => (
  aggregateMetadata(upgradeKnownSentence(parseGenericSentence(raw), definitions), aggregators)
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
