import type * as v from 'valibot'
import type { ReceiverSchema, EmitterSchema, FirmwareSchema, FrequencySchema, ModeSchema, SerialNumberSchema } from './schemas'
import type { FIELD_TYPE, FLAGS_COMMAND, FLAGS_LISTENING, LISTENING_FRAMES, LOG_INTERVALS, PROTOCOLS } from './constants'
import type { Int16, Int8, Uint16, Uint8 } from '@schemasjs/valibot-numbers'

// TB LIVE
export type SerialNumber = v.Input<typeof SerialNumberSchema>
export type Frequency = v.Input<typeof FrequencySchema>
export type Firmware = v.Input<typeof FirmwareSchema>
export type Mode = v.Input<typeof ModeSchema>
export type Emitter = v.Input<typeof EmitterSchema>
export type Receiver = v.Input<typeof ReceiverSchema>

export type ListeningFrame = typeof LISTENING_FRAMES[number]

export type FLAG = typeof FLAGS_LISTENING[number] | typeof FLAGS_COMMAND[number]
export type FLAGS = typeof FLAGS_LISTENING | typeof FLAGS_COMMAND

export type Data = boolean | string | number
export type Type = typeof FIELD_TYPE[number]
export interface Field {
  name: string,
  type: Type,
  units?: string,
  data: Data,
  metadata?: any
}

export interface Frame {
  name: string,
  raw: string,
  error?: string | object,
  data?: Data[],
  fields?: Field[],
  metadata?: any
}

export interface ParsedFrame {
  frame: Frame | null,
  remainder: string
}

export interface FirmwareFrame extends Frame {
  firmware: Firmware,
  mode: Mode,
  errorFirmware?: string
}

export interface ParsingFrame {
  mode: Mode
  index: number,
  flag: FLAG,
  last: boolean,
}

export interface ListeningParsingFrame extends ParsingFrame {
  mode: 'listening'
  flag: typeof FLAGS_LISTENING[number],
}

export interface CommandParsingFrame {
  mode: 'command'
  index: number,
  flag: typeof FLAGS_COMMAND[number],
  last: boolean,
}

export interface OutputFrame extends FirmwareFrame {
  timestamp: number,
  errorReceiver?: string
}

export interface ParserOutput {
  frames: FirmwareFrame[],
  nonparsed: string,
  firmwareChange: boolean
}

export type Parser = (input: string) => ParserOutput
export type MapModeParser = Map<Mode, Parser>
export type MapFirmwareParser = Map<Firmware, Parser>

export interface LineData {
  raw: number,
  angle: {
    raw: number,
    degrees: number
  },
  deviation: {
    raw: number,
    degrees: number
  }
}

export type SignalQuality = 'weak' | 'regular' | 'strong'

export interface LineSNR {
  raw: number,
  signal: SignalQuality
}

export interface LineTemperature {
  raw: number,
  degrees: number
}

export interface ListeningEmitterFrame extends Frame {
  metadata: {
    receiver: SerialNumber,
    sample: {
      timestamp: Uint16,
      emitter: SerialNumber,
      frequency: Frequency,
      protocol: string,
      angle: {
        avg: Int8,
        std: Int8
      },
      snr: {
        value: Uint8,
        signal: 'weak' | 'regular' | 'strong'
      },
      message?: number
    }
  }
}

export interface ListeningReceiverFrame extends Frame {
  metadata: {
    receiver: SerialNumber,
    sample: {
      timestamp: Uint16,
      frequency?: Frequency,
      log: string,
      temperature: Int16,
      noise: {
        average: Int8,
        peak: Int8,
        snr?: {
          value: Uint8,
          signal: 'weak' | 'regular' | 'strong'
        }
      },
      message?: number
    }
  }
}

export interface ListeningPingFrame extends Frame {
  metadata: {
    receiver: SerialNumber
  }
}

export interface CommandSerialNumberFrame extends ListeningPingFrame { }

export interface CommandFirmwareFrame extends Frame {
  metadata: {
    firmware: Firmware
  }
}

export interface CommandFrequencyFrame extends Frame {
  metadata: {
    frequency: Frequency
  }
}

export interface CommandTimestampFrame extends Frame {
  metadata: {
    timestamp: number,
    date: string
  }
}

export interface CommandLogIntervalFrame extends Frame {
  metadata: {
    logInterval: keyof typeof LOG_INTERVALS,
    time: typeof LOG_INTERVALS[keyof typeof LOG_INTERVALS]
  }
}

export interface CommandProtocolsFrame extends Frame {
  metadata: {
    lm: keyof typeof PROTOCOLS,
    channel: typeof PROTOCOLS[keyof typeof PROTOCOLS]['channel'],
    protocols: {
      id: typeof PROTOCOLS[keyof typeof PROTOCOLS]['id'],
      data: typeof PROTOCOLS[keyof typeof PROTOCOLS]['data']
    }
  }
}

export interface CommandAPIFrame extends Frame {
  metadata: {
    api: string
  }
}
