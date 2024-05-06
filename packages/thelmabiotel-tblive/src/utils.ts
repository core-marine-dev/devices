import * as v from 'valibot'
import { StringSchema } from './schemas'
import { EMITTER_ANGLE_BIT_LENGTH, EMITTER_ANGLE_FACTOR, EMITTER_DEVIATION_FACTOR } from './constants'
import type { LineData, LineSNR, LineTemperature } from './types'

export const utf8ToAscii = (text: string): string => {
  const utf8 = v.parse(StringSchema, text)
  const bytes = (new TextEncoder()).encode(utf8)
  return (new TextDecoder('ascii')).decode(bytes)
}

export const getLineData = (data: number): LineData => {
  const angle = 0b000_0000_0011_1111_1111 & data
  const deviation = (0b0000_1111_1100_0000_0000 & data) >>> EMITTER_ANGLE_BIT_LENGTH
  return {
    raw: data,
    angle: {
      raw: angle,
      degrees: angle / EMITTER_ANGLE_FACTOR
    },
    deviation: {
      raw: deviation,
      degrees: deviation / EMITTER_DEVIATION_FACTOR
    }
  }
}

export const getLineSNR = (snr: number): LineSNR => {
  if (snr > 25) return { signal: 'strong', raw: snr }
  if (snr > 6) return { signal: 'regular', raw: snr }
  return { signal: 'weak', raw: snr }
}

export const getLinesTemperature = (temperature: number): LineTemperature => ({ degrees: (temperature - 50) / 10, raw: temperature })
