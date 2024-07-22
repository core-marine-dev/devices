import crypto from 'node:crypto'
import { calculateChecksum, numberChecksumToString, stringChecksumToNumber } from './checksum'
import { CHECKSUM_LENGTH, DELIMITER, END_FLAG, END_FLAG_LENGTH, MINIMAL_LENGTH, NMEA_ID_LENGTH, SEPARATOR, START_FLAG, TALKERS, TALKERS_SPECIAL } from './constants'
import { Float32Schema, Float64Schema, Int16Schema, Int32Schema, Int64Schema, Int8Schema, NMEASentenceSchema, Uint16Schema, Uint32Schema, Uint64Schema, Uint8Schema } from './schemas'
import type { Checksum, NMEALike, NMEASentence, Payload, ProtocolFieldType, StoredSentence, Talker, Value } from './types'
import { isLowerCharASCII, isNumberCharASCII, isUpperCharASCII } from './utils'

export const lastUncompletedFrame = (text: string): string | null => {
  // Start of last possible frame
  const lastStartIndex = text.lastIndexOf(START_FLAG)
  if (lastStartIndex === -1) { return null }
  // Last possible frame
  const remainder = text.slice(lastStartIndex)
  // Complete frame -> discard
  if (remainder.includes(END_FLAG)) { return null }
  // Incomplete frame
  return remainder
}

export const getUnparsedNMEAFrames = (text: string): NMEALike[] => {
  // Includes all flags
  if ([START_FLAG, SEPARATOR, DELIMITER, END_FLAG].some(flag => !text.includes(flag))) { return [] }
  return text
    // Split by END Flag
    .split(END_FLAG)
    // Remove empty or not enough string
    .filter(str => str.length > MINIMAL_LENGTH)
    // Contains START FLAG
    .filter(str => str.includes(START_FLAG))
    // String from last START FLAG
    .map(str => str.split(START_FLAG).at(-1) as string)
    // Contains just one DELIMITER FLAG
    .filter(str => {
      const first = str.indexOf(DELIMITER)
      const last = str.lastIndexOf(DELIMITER)
      return (first !== -1) && (first === last)
    })
    // Valid CHECKSUM
    .filter(str => {
      const [payload, checksum] = str.split(DELIMITER) as [string, string]
      // Checksum has two length
      if (checksum.length !== CHECKSUM_LENGTH) {
        console.debug(`Invalid sentence: checksum has not two characters -> $${str}`)
        return false
      }
      // Checksum hexadecimal
      if (!/[0-9A-Fa-f]{2}/.test(checksum)) {
        console.debug(`Invalid sentence: checksum is not a hexadecimal digit -> $${str}`)
        return false
      }
      // Invalid checksum
      const numChecksum = stringChecksumToNumber(checksum)
      const computedChecksum = calculateChecksum(payload)
      if (numChecksum !== computedChecksum) {
        console.debug(`Invalid sentence: calculated checksum ${numberChecksumToString(computedChecksum)} is not equal to given checksum ${checksum} -> $${str}`)
        return false
      }
      // ok
      return true
    })
    // PAYLOAD contains valid characters
    .filter(str => {
      const payload = str.split(DELIMITER).at(0) as string
      if (!payload.includes(SEPARATOR)) {
        console.debug(`Invalid sentence: payload has not separator character "${SEPARATOR}" -> $${str}`)
        return false
      }
      // Payload valid characters -> TODO: with regex
      if (['\r', '\n'].some(char => payload.includes(char))) {
        console.debug(`Invalid sentence: payload has invalid characters -> $${str}`)
        return false
      }
      // ok
      return true
    })
    // Return NMEA frames
    .map(str => `${START_FLAG}${str}${END_FLAG}` as NMEALike)
}

export const getIdPayloadAndChecksum = (frame: NMEALike): { id: string, payload: string, checksum: string } => {
  const [info, checksum] = frame.slice(START_FLAG.length, -END_FLAG_LENGTH).split(DELIMITER)
  const id = info.split(SEPARATOR)[0]
  const payload = info.slice(id.length + 1)
  return { id, payload, checksum }
}

export const hasSameNumberOfFields = (payload: string, sentence: StoredSentence): boolean => payload.split(SEPARATOR).length === sentence.payload.length

const parseNumber = (value: string, type: ProtocolFieldType): Value | undefined => {
  // Integers
  if (type === 'int8') return Int8Schema.safeParse(Number(value)).data
  if (type === 'int16') return Int16Schema.safeParse(Number(value)).data
  if (type === 'int32') return Int32Schema.safeParse(Number(value)).data
  if (type === 'int64') return Int64Schema.safeParse(BigInt(value)).data
  // Unsigned Integers
  if (type === 'uint8') return Uint8Schema.safeParse(Number(value)).data
  if (type === 'uint16') return Uint16Schema.safeParse(Number(value)).data
  if (type === 'uint32') return Uint32Schema.safeParse(Number(value)).data
  if (type === 'uint64') return Uint64Schema.safeParse(BigInt(value)).data
  // Floats
  if (type === 'float32') return Float32Schema.safeParse(Number(value)).data
  if (type === 'float64') return Float64Schema.safeParse(Number(value)).data
}
const parseBoolean = (value: string): Value | undefined => {
  if (value.toLowerCase() === 'false' || value === '0') return false
  if (value.toLowerCase() === 'true' || value === '1') return true
}
export const parseValue = (value: string, type: ProtocolFieldType): Value => {
  try {
    // String
    if (type === 'string') { return value }
    // Boolean
    if (type === 'boolean') {
      const b = parseBoolean(value)
      if (b !== undefined) { return b }
    }
    // Number
    const num = parseNumber(value, type)
    if (num !== undefined) { return num }
  } catch (error) {
    console.debug(`Error parsing value: ${value} is not ${type}`)
  }
  return null
}

export const getKnownNMEASentence = (
  { received, sample, sentenceID, sentencePayload, checksum, model }: { received: number, sample: NMEALike, sentenceID: string, sentencePayload: string, checksum: Checksum, model: StoredSentence }
): NMEASentence | null => {
  // Invalid sentence
  if (!hasSameNumberOfFields(sentencePayload, model)) return null
  // Valid sentence
  const fields = sentencePayload.split(SEPARATOR)
  const payload: Payload = model.payload.map(({ name, type, units, description }, index) => {
    const sample = fields[index]
    const value = parseValue(sample, type)
    return { name, sample, value, type, units: units ?? 'unknown', description }
  })
  const { protocol } = model
  // TODO: Metada -> GGA Latitude-Longitude degrees
  const sent: NMEASentence = {
    received,
    sample,
    id: sentenceID,
    checksum,
    payload,
    protocol
  }
  return NMEASentenceSchema.parse(sent)
}

export const getTalker = (sentenceID: string): Talker | null => {
  if (sentenceID.length <= NMEA_ID_LENGTH) return null
  // Known Talker
  const talker = TALKERS.filter(([talkerID, _talkerDescription]) => sentenceID.startsWith(talkerID))
  if (talker.length === 1) {
    const value = talker[0][0]
    return { value, description: talker[0][1] }
  }
  // Special Talker U#
  if (sentenceID.startsWith('U') && !isNaN(Number(sentenceID[1]))) {
    const value = sentenceID.slice(0, 2)
    return { value, description: TALKERS_SPECIAL.U }
  }
  // Special Talker Pxxx -> Propietary
  if (sentenceID.startsWith('P')) {
    return { value: sentenceID, description: TALKERS_SPECIAL.P }
  }
  // Unknown talker
  return null
}

export const getUnknowNMEASentence = (
  { received, sample, sentenceID, sentencePayload, checksum }: { received: number, sample: NMEALike, sentenceID: string, sentencePayload: string, checksum: Checksum }
): NMEASentence => {
  const fields = sentencePayload.split(SEPARATOR)
  const response: Payload = fields.map(field => ({
    name: 'unknown', sample: field, value: field, type: 'string', units: 'unknown'
  }))
  const sent = NMEASentenceSchema.parse({
    received,
    sample,
    id: sentenceID,
    checksum,
    payload: response,
    description: 'unknown nmea sentence'
  })
  return sent
}

// TESTING - GENERATE
const createNumberValue = (type: ProtocolFieldType): number | bigint | null => {
  const sign = ((Math.random() < 0.5) ? -1 : 1)
  // Unsigned integer
  const useed = Math.round(Math.random() * (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER) + Number.MIN_SAFE_INTEGER)
  // Signed integer
  const seed = useed * sign
  // Float
  const fseed = Math.random() * sign
  // Big Int
  const uint64 = new BigUint64Array([0n])
  crypto.getRandomValues(uint64)
  const biguintseed = uint64[0]
  const int64 = new BigInt64Array([0n])
  crypto.getRandomValues(int64)
  const bigintseed = int64[0]
  switch (type) {
    // Unsigned Integers
    case 'uint8':
      return (new Uint8Array([useed]))[0]
    case 'uint16':
      return (new Uint16Array([useed]))[0]
    case 'uint32':
      return (new Uint32Array([useed]))[0]
    case 'uint64':
      return biguintseed
    // Signed Integers
    case 'int8':
      return (new Int8Array([seed]))[0]
    case 'int16':
      return (new Int16Array([seed]))[0]
    case 'int32':
      return (new Int32Array([seed]))[0]
    case 'int64':
      return bigintseed
    // Floats
    case 'float32':
      return (new Float32Array([fseed]))[0]
    case 'float64':
      return (new Float64Array([fseed]))[0]
  }
  return null
}

const createStringValue = (): string => {
  const text = Buffer.from(Math.random().toString(36).substring(2)).toString('ascii')
  const array = Array.from(text).map(letter => {
    if (isLowerCharASCII(letter) || isUpperCharASCII(letter) || isNumberCharASCII(letter)) { return letter }
    return 'a'
  })
  return array.join('')
}

export const createValue = (type: ProtocolFieldType): string | number | bigint | boolean | null => {
  switch (type) {
    case 'boolean':
      return Math.random() > 0.5
    case 'string':
      return createStringValue()
  }
  return createNumberValue(type)
}

export const createPayload = (model: StoredSentence): string => {
  let payload = ''
  model.payload.forEach(field => {
    const value = createValue(field.type)
    payload += (value !== null) ? `${value.toString()},` : ','
  })
  return payload.slice(0, -1)
}

export const createFakeSentence = (model: StoredSentence, talker?: string): NMEALike => {
  const id = (talker !== undefined) ? `${talker}${model.id}` : model.id
  const payload = createPayload(model)
  const info = `${id},${payload}`
  const checksum = numberChecksumToString(calculateChecksum(info))
  return `${START_FLAG}${info}${DELIMITER}${checksum}${END_FLAG}`
}
