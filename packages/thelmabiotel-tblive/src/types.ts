// import type { Int16, Int8, Uint16, Uint8 } from '@schemasjs/valibot-numbers'
import type { FIELD_TYPE, SENTENCES_NAME } from './constants'
import { EmitterSchema, FirmwareSchema, FrequencySchema, ModeSchema, ReceiverSchema, SerialNumberSchema, TimestampSchema } from './schemas'

// TB LIVE
export type SentenceName = typeof SENTENCES_NAME[number]

export type SerialNumber = ReturnType<typeof SerialNumberSchema.parse>
export type Frequency = ReturnType<typeof FrequencySchema.parse>
export type Firmware = ReturnType<typeof FirmwareSchema.parse>
export type Mode = ReturnType<typeof ModeSchema.parse>
export type Emitter = ReturnType<typeof EmitterSchema.parse>
export type Receiver = ReturnType<typeof ReceiverSchema.parse>

export type Type = typeof FIELD_TYPE[number]

export type Timestamp = ReturnType<typeof TimestampSchema.parse>

// NEW _________________________________________________________________________
export type Raw = string
export type Metadata = Record<string, any>
export type Value = number | string | boolean
export interface Field {
  raw: Raw
  name: string
  type: Type
  value: Value
  units?: string
  metadata?: Metadata
  description?: string
  errors?: string[]
}

export interface ParsedSentence {
  timestamp: Timestamp
  raw: Raw
  id: string
  mode: Mode
  firmware: Firmware
  payload: Field[]
  errors?: string[]
  metadata?: Metadata
  description?: string
}
