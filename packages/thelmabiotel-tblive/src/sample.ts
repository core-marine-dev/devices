import { SAMPLE_END, SAMPLE_SPLIT, SAMPLE_START } from './constants'
import { Field, Metadata, ParsedSentence, Timestamp } from './types'
import { getLineAngle, getLineSNR, getLinesTemperature } from './utils'

export const parseSample = (input: string, timestamp: Timestamp): ParsedSentence => {
  const mode = 'listening'
  const end = input.indexOf(SAMPLE_END)
  const raw = input.slice(0, end + SAMPLE_END.length)
  const working = input.slice(SAMPLE_START.length, end)
  const fields = working.split(SAMPLE_SPLIT)
  if (fields.length === 9) { return { ...emitter101(fields, timestamp, raw), mode } }
  if (fields.length === 8) { return { ...((fields[2].toLowerCase().includes('tbr sensor')) ? receiver101(fields, timestamp, raw) : emitter102(fields, timestamp, raw)), mode } }
  if (fields.length === 7) { return { ...receiver102(fields, timestamp, raw), mode } }
  return {
    timestamp,
    raw,
    id: 'sample',
    firmware: 'unknown',
    mode,
    payload: [],
    errors: [`unknown sample sentence with ${fields.length} fields\n${raw}`]
  }
}

const emitter101 = (fields: string[], timestamp: Timestamp, raw: string): Omit<ParsedSentence, 'mode'> => {
  /** Emitter: Acoustic detection
   * Field |  Type  | Description
   *     0 | string | Receiver serial number
   *     1 | uint32 | Timestamp in seconds since Epoch (or power up if a clock has not been set)
   *     2 | uint16 | Milliseconds of timestamp
   *     3 | string | Transmitter Protocol
   *     4 | string | Transmitter serial number
   *     5 | uint16 | Transmitter Data Value
   *                | Bits  | Type   | Description
   *                | 00-09 | uint10 | Average inclination -> (0 - 1023) / 10 => 0.0° - 102.3° with ±0.10° resolution
   *                | 10-15 | uint6  | Standard deviation  -> (0 - 63) / 4    => 0.0° - 15.75° with ±0.25° resolution
   *     6 |  uint8 | Detection SNR (0-255)
   *                | signal  | SNR
   *                |    weak | 0 <= SNR <= 6
   *                | regular | 6 < SNR < 25
   *                |  strong | 25 <= SNR
   *                | typical | 6 < SNR < 60 typical values
   *     7 |  uint8 | Transmitter Detection Frequency in kHz, range 63-77 kHz
   *     8 | uint32 | Number of strings sent since power up
  */
  const errors: string[] = []
  const receiver: Field = {
    raw: fields[0],
    name: 'TB Live serial number',
    type: 'string',
    value: Number(fields[0])
  }
  if (Number.isNaN(receiver.value) || (receiver.value as number) < 1) {
    const error = `receiver field is not a positive integer: ${receiver.raw}`
    receiver.errors = [error]
    errors.push(error)
  }

  const seconds: Field = {
    raw: fields[1],
    name: 'seconds',
    type: 'uint32',
    value: Number(fields[1]),
    units: 'seconds'
  }
  if (!Number.isInteger(seconds.value) || (seconds.value as number) < 0) {
    const error = `seconds field is not a positive integer: ${seconds.raw}`
    seconds.errors = [error]
    errors.push(error)
  }

  const milliseconds: Field = {
    raw: fields[2],
    name: 'milliseconds',
    type: 'uint16',
    value: Number(fields[2]),
    units: 'milliseconds'
  }
  if (!Number.isInteger(milliseconds.value) || (milliseconds.value as number) < 0) {
    const error = `milliseconds field is not a positive integer: ${milliseconds.raw}`
    milliseconds.errors = [error]
    errors.push(error)
  }

  const protocol: Field = {
    raw: fields[3],
    name: 'protocol',
    type: 'string',
    value: fields[3]
  }

  const emitter: Field = {
    raw: fields[4],
    name: 'emitter',
    type: 'string',
    value: Number(fields[4])
  }
  if (Number.isNaN(emitter.value) || (emitter.value as number) < 1) {
    const error = `emitter field is not a positive integer: ${emitter.raw}`
    emitter.errors = [error]
    errors.push(error)
  }

  const angle: Field = {
    raw: fields[5],
    name: 'angle',
    type: 'uint16',
    value: Number(fields[5])
  }
  if (!Number.isInteger(angle.value) || (angle.value as number) < 0) {
    const error = `angle field is not a positive integer: ${angle.raw}`
    angle.errors = [error]
    errors.push(error)
  } else {
    const parsed = getLineAngle(angle.value as number)
    angle.metadata = { ...parsed }
  }

  const snr: Field = {
    raw: fields[6],
    name: 'snr',
    type: 'uint8',
    value: Number(fields[6])
  }
  if (!Number.isInteger(snr.value) || (snr.value as number) < 0) {
    const error = `snr field is not a positive integer: ${snr.raw}`
    snr.errors = [error]
    errors.push(error)
  } else {
    const parsed = getLineSNR(snr.value as number)
    snr.metadata = { ...parsed }
  }

  const frequency: Field = {
    raw: fields[7],
    name: 'frequency',
    type: 'uint8',
    value: Number(fields[7]),
    units: 'kHz',
    description: 'Frequency has to be bound between 63 - 77 kHz'
  }
  if (!Number.isInteger(frequency.value) || (frequency.value as number) < 0) {
    const error = `frequency field is not a positive integer: ${frequency.raw}`
    frequency.errors = [error]
    errors.push(error)
  }

  const sent: Field = {
    raw: fields[8],
    name: 'sent',
    type: 'uint32',
    value: Number(fields[8])
  }
  if (!Number.isInteger(sent.value) || (sent.value as number) < 0) {
    const error = `sent field is not a positive integer: ${sent.raw}`
    sent.errors = [error]
    errors.push(error)
  }

  const parsed: Omit<ParsedSentence, 'mode'> = {
    timestamp,
    raw,
    id: 'emitter',
    firmware: '1.0.1',
    payload: [receiver, seconds, milliseconds, protocol, emitter, angle, snr, frequency, sent]
  }

  if (errors.length > 0) {
    parsed.errors = errors
    return parsed
  }
  // Metadata
  parsed.metadata = {}
  const sentenceTimestamp = (seconds.errors !== undefined || milliseconds.errors !== undefined) ? null : Number(`${seconds.raw}${milliseconds.raw}`)
  if (sentenceTimestamp !== null) {
    parsed.metadata.timestamp = {
      value: sentenceTimestamp,
      date: new Date(sentenceTimestamp).toISOString()
    }
  }
  parsed.metadata.receiver = receiver.value
  parsed.metadata.emitter = emitter.value
  parsed.payload.forEach(field => {
    if (field.metadata !== undefined) {
      // @ts-expect-error
      parsed.metadata[field.name] = { ...field.metadata }
    }
  })

  return parsed
}

const emitter102 = (fields: string[], timestamp: Timestamp, raw: string): Omit<ParsedSentence, 'mode'> => {
  /** Emitter: Acoustic detection
   * Field |  Type  | Description
   *     0 | string | Receiver serial number
   *     1 | uint32 | Timestamp in seconds since Epoch (or power up if a clock has not been set)
   *     2 | uint16 | Milliseconds of timestamp
   *     3 | string | Transmitter Protocol
   *     4 | string | Transmitter serial number
   *     5 | uint16 | Transmitter Data Value
   *                | Bits  | Type   | Description
   *                | 00-09 | uint10 | Average inclination -> (0 - 1023) / 10 => 0.0° - 102.3° with ±0.10° resolution
   *                | 10-15 | uint6  | Standard deviation  -> (0 - 63) / 4    => 0.0° - 15.75° with ±0.25° resolution
   *     6 |  uint8 | Detection SNR (0-255)
   *                | signal  | SNR
   *                |    weak | 0 <= SNR <= 6
   *                | regular | 6 < SNR < 25
   *                |  strong | 25 <= SNR
   *                | typical | 6 < SNR < 60 typical values
   *     7 |  uint8 | Transmitter Detection Frequency in kHz, range 63-77 kHz
  */
  const errors: string[] = []
  const receiver: Field = {
    raw: fields[0],
    name: 'TB Live serial number',
    type: 'string',
    value: Number(fields[0])
  }
  if (Number.isNaN(receiver.value) || (receiver.value as number) < 1) {
    const error = `receiver field is not a positive integer: ${receiver.raw}`
    receiver.errors = [error]
    errors.push(error)
  }

  const seconds: Field = {
    raw: fields[1],
    name: 'seconds',
    type: 'uint32',
    value: Number(fields[1]),
    units: 'seconds'
  }
  if (!Number.isInteger(seconds.value) || (seconds.value as number) < 0) {
    const error = `seconds field is not a positive integer: ${seconds.raw}`
    seconds.errors = [error]
    errors.push(error)
  }

  const milliseconds: Field = {
    raw: fields[2],
    name: 'milliseconds',
    type: 'uint16',
    value: Number(fields[2]),
    units: 'milliseconds'
  }
  if (!Number.isInteger(milliseconds.value) || (milliseconds.value as number) < 0) {
    const error = `milliseconds field is not a positive integer: ${milliseconds.raw}`
    milliseconds.errors = [error]
    errors.push(error)
  }

  const protocol: Field = {
    raw: fields[3],
    name: 'protocol',
    type: 'string',
    value: fields[3]
  }

  const emitter: Field = {
    raw: fields[4],
    name: 'emitter',
    type: 'string',
    value: Number(fields[4])
  }
  if (Number.isNaN(emitter.value) || (emitter.value as number) < 1) {
    const error = `emitter field is not a positive integer: ${emitter.raw}`
    emitter.errors = [error]
    errors.push(error)
  }

  const angle: Field = {
    raw: fields[5],
    name: 'angle',
    type: 'uint16',
    value: Number(fields[5])
  }
  if (!Number.isInteger(angle.value) || (angle.value as number) < 0) {
    const error = `angle field is not a positive integer: ${angle.raw}`
    angle.errors = [error]
    errors.push(error)
  } else {
    const parsed = getLineAngle(angle.value as number)
    angle.metadata = { ...parsed }
  }

  const snr: Field = {
    raw: fields[6],
    name: 'snr',
    type: 'uint8',
    value: Number(fields[6])
  }
  if (!Number.isInteger(snr.value) || (snr.value as number) < 0) {
    const error = `snr field is not a positive integer: ${snr.raw}`
    snr.errors = [error]
    errors.push(error)
  } else {
    const parsed = getLineSNR(snr.value as number)
    snr.metadata = { ...parsed }
  }

  const frequency: Field = {
    raw: fields[7],
    name: 'frequency',
    type: 'uint8',
    value: Number(fields[7]),
    units: 'kHz',
    description: 'Frequency has to be bound between 63 - 77 kHz'
  }
  if (!Number.isInteger(frequency.value) || (frequency.value as number) < 0) {
    const error = `frequency field is not a positive integer: ${frequency.raw}`
    frequency.errors = [error]
    errors.push(error)
  }

  const parsed: Omit<ParsedSentence, 'mode'> = {
    timestamp,
    raw,
    id: 'emitter',
    firmware: '1.0.2',
    payload: [receiver, seconds, milliseconds, protocol, emitter, angle, snr, frequency]
  }

  if (errors.length > 0) {
    parsed.errors = errors
    return parsed
  }
  // Metadata
  parsed.metadata = {}
  const sentenceTimestamp = (seconds.errors !== undefined || milliseconds.errors !== undefined) ? null : Number(`${seconds.raw}${milliseconds.raw}`)
  if (sentenceTimestamp !== null) {
    parsed.metadata.timestamp = {
      value: sentenceTimestamp,
      date: new Date(sentenceTimestamp).toISOString()
    }
  }
  parsed.metadata.receiver = receiver.value
  parsed.metadata.emitter = emitter.value
  parsed.payload.forEach(field => {
    if (field.metadata !== undefined) {
      (parsed.metadata as Metadata)[field.name] = { ...field.metadata }
    }
  })

  return parsed
}

const receiver101 = (fields: string[], timestamp: Timestamp, raw: string): Omit<ParsedSentence, 'mode'> => {
  /** Receiver: Receiver Log
   * Field |  Type  | Description
   *     0 | string | Receiver serial number
   *     1 | uint32 | Timestamp in seconds since Epoch (or power up if a clock has not been set)
   *     2 | string | Identifier for Log Messages
   *     3 |  int16 | Temperature ((data-50)/10 -> °C)
   *     4 |  uint8 | Average background noise
   *     5 |  uint8 | Peak background noise
   *     6 |  uint8 | Center listening band (kHz, listening in +-1kHz bands too) ==> TYPO IN DOCS 101 Detection SNR
   *     7 | uint32 | Number of strings sent since power up
  */
  const errors: string[] = []
  const receiver: Field = {
    raw: fields[0],
    name: 'TB Live serial number',
    type: 'string',
    value: Number(fields[0])
  }
  if (Number.isNaN(receiver.value) || (receiver.value as number) < 1) {
    const error = `receiver field is not a positive integer: ${receiver.raw}`
    receiver.errors = [error]
    errors.push(error)
  }

  const seconds: Field = {
    raw: fields[1],
    name: 'seconds',
    type: 'uint32',
    value: Number(fields[1]),
    units: 'seconds'
  }
  if (!Number.isInteger(seconds.value) || (seconds.value as number) < 0) {
    const error = `seconds field is not a positive integer: ${seconds.raw}`
    seconds.errors = [error]
    errors.push(error)
  }

  const log: Field = {
    raw: fields[2],
    name: 'log',
    type: 'string',
    value: fields[2]
  }

  const temperature: Field = {
    raw: fields[3],
    name: 'temperature',
    type: 'int16',
    value: Number(fields[3])
    // units: 'celsius'
  }
  if (!Number.isInteger(temperature.value)) {
    const error = `temperature field is not an integer: ${temperature.raw}`
    temperature.errors = [error]
    errors.push(error)
  } else {
    const parsed = getLinesTemperature(temperature.value as number)
    temperature.metadata = { ...parsed }
  }

  const noiseAverage: Field = {
    raw: fields[4],
    name: 'noise_average',
    type: 'uint8',
    value: Number(fields[4])
  }
  if (!Number.isInteger(noiseAverage.value) || (noiseAverage.value as number) < 0) {
    const error = `noise_average field is not a positive integer: ${noiseAverage.raw}`
    noiseAverage.errors = [error]
    errors.push(error)
  }

  const noisePeak: Field = {
    raw: fields[5],
    name: 'noise_peak',
    type: 'uint8',
    value: Number(fields[5])
  }
  if (!Number.isInteger(noisePeak.value) || (noisePeak.value as number) < 0) {
    const error = `noise_peak field is not a positive integer: ${noisePeak.raw}`
    noisePeak.errors = [error]
    errors.push(error)
  }

  const frequency: Field = {
    raw: fields[6],
    name: 'frequency',
    type: 'uint8',
    value: Number(fields[6]),
    units: 'kHz',
    description: 'frequency has to be bound between 63 - 77 kHz'
  }
  if (!Number.isInteger(frequency.value) || (frequency.value as number) < 0) {
    const error = `frequency field is not a positive integer: ${frequency.raw}`
    frequency.errors = [error]
    errors.push(error)
  }

  const sent: Field = {
    raw: fields[7],
    name: 'sent',
    type: 'uint32',
    value: Number(fields[7])
  }
  if (!Number.isInteger(sent.value) || (sent.value as number) < 0) {
    const error = `sent field is not a positive integer: ${sent.raw}`
    sent.errors = [error]
    errors.push(error)
  }

  const parsed: Omit<ParsedSentence, 'mode'> = {
    timestamp,
    raw,
    id: 'receiver',
    firmware: '1.0.1',
    payload: [receiver, seconds, log, temperature, noiseAverage, noisePeak, frequency, sent]
  }

  if (errors.length > 0) {
    parsed.errors = errors
    return parsed
  }
  // Metadata
  parsed.metadata = {}
  const sentenceTimestamp = (seconds.errors !== undefined) ? null : Number(`${seconds.raw}000`)
  if (sentenceTimestamp !== null) {
    parsed.metadata.timestamp = {
      value: sentenceTimestamp,
      date: new Date(sentenceTimestamp).toISOString()
    }
  }
  parsed.metadata.receiver = receiver.value
  parsed.metadata.noise = { average: noiseAverage.value, peak: noisePeak.value }
  parsed.payload.forEach(field => {
    if (field.metadata !== undefined) {
      // @ts-expect-error
      parsed.metadata[field.name] = { ...field.metadata }
    }
  })

  return parsed
}

const receiver102 = (fields: string[], timestamp: Timestamp, raw: string): Omit<ParsedSentence, 'mode'> => {
  /** Receiver: Receiver Log
   * Field |  Type  | Description
   *     0 | string | Receiver serial number
   *     1 | uint32 | Timestamp in seconds since Epoch (or power up if a clock has not been set)
   *     2 | string | Identifier for Log Messages
   *     3 |  int16 | Temperature ((data-50)/10 -> °C)
   *     4 |  uint8 | Average background noise
   *     5 |  uint8 | Peak background noise
   *     6 |  uint8 | Center listening band (kHz, listening in +-1kHz bands too) ==> TYPO IN DOCS 101 Detection SNR
  */
  const errors: string[] = []
  const receiver: Field = {
    raw: fields[0],
    name: 'TB Live serial number',
    type: 'string',
    value: Number(fields[0])
  }
  if (Number.isNaN(receiver.value) || (receiver.value as number) < 1) {
    const error = `receiver field is not a positive integer: ${receiver.raw}`
    receiver.errors = [error]
    errors.push(error)
  }

  const seconds: Field = {
    raw: fields[1],
    name: 'seconds',
    type: 'uint32',
    value: Number(fields[1]),
    units: 'seconds'
  }
  if (!Number.isInteger(seconds.value) || (seconds.value as number) < 0) {
    const error = `seconds field is not a positive integer: ${seconds.raw}`
    seconds.errors = [error]
    errors.push(error)
  }

  const log: Field = {
    raw: fields[2],
    name: 'log',
    type: 'string',
    value: fields[2]
  }

  const temperature: Field = {
    raw: fields[3],
    name: 'temperature',
    type: 'int16',
    value: Number(fields[3])
    // units: 'celsius'
  }
  if (!Number.isInteger(temperature.value)) {
    const error = `temperature field is not an integer: ${temperature.raw}`
    temperature.errors = [error]
    errors.push(error)
  } else {
    const parsed = getLinesTemperature(temperature.value as number)
    temperature.metadata = { ...parsed }
  }

  const noiseAverage: Field = {
    raw: fields[4],
    name: 'noise_average',
    type: 'uint8',
    value: Number(fields[4])
  }
  if (!Number.isInteger(noiseAverage.value) || (noiseAverage.value as number) < 0) {
    const error = `noise_average field is not a positive integer: ${noiseAverage.raw}`
    noiseAverage.errors = [error]
    errors.push(error)
  }

  const noisePeak: Field = {
    raw: fields[5],
    name: 'noise_peak',
    type: 'uint8',
    value: Number(fields[5])
  }
  if (!Number.isInteger(noisePeak.value) || (noisePeak.value as number) < 0) {
    const error = `noise_peak field is not a positive integer: ${noisePeak.raw}`
    noisePeak.errors = [error]
    errors.push(error)
  }

  const frequency: Field = {
    raw: fields[6],
    name: 'frequency',
    type: 'uint8',
    value: Number(fields[6]),
    units: 'kHz',
    description: 'frequency has to be bound between 63 - 77 kHz'
  }
  if (!Number.isInteger(frequency.value) || (frequency.value as number) < 0) {
    const error = `frequency field is not a positive integer: ${frequency.raw}`
    frequency.errors = [error]
    errors.push(error)
  }

  const parsed: Omit<ParsedSentence, 'mode'> = {
    timestamp,
    raw,
    id: 'receiver',
    firmware: '1.0.2',
    payload: [receiver, seconds, log, temperature, noiseAverage, noisePeak, frequency]
  }

  if (errors.length > 0) {
    parsed.errors = errors
    return parsed
  }
  // Metadata
  parsed.metadata = {}
  const sentenceTimestamp = (seconds.errors !== undefined) ? null : Number(`${seconds.raw}000`)
  if (sentenceTimestamp !== null) {
    parsed.metadata.timestamp = {
      value: sentenceTimestamp,
      date: new Date(sentenceTimestamp).toISOString()
    }
  }
  parsed.metadata.receiver = receiver.value
  parsed.metadata.noise = { average: noiseAverage.value, peak: noisePeak.value }
  parsed.payload.forEach(field => {
    if (field.metadata !== undefined) {
      (parsed.metadata as Metadata)[field.name] = { ...field.metadata }
    }
  })

  return parsed
}
