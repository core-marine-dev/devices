import { EMITTER_ANGLE_AVERAGE_BIT_LENGTH, EMITTER_ANGLE_AVERAGE_FACTOR, EMITTER_ANGLE_DEVIATION_FACTOR } from './constants'

export const getLineAngle = (data: number): { raw: number, average: { raw: number, degrees: number }, deviation: { raw: number, degrees: number } } => {
  const angle = 0b000_0000_0011_1111_1111 & data
  const deviation = (0b0000_1111_1100_0000_0000 & data) >>> EMITTER_ANGLE_AVERAGE_BIT_LENGTH
  return {
    raw: data,
    average: {
      raw: angle,
      degrees: Number.parseFloat((angle / EMITTER_ANGLE_AVERAGE_FACTOR).toFixed(1))
    },
    deviation: {
      raw: deviation,
      degrees: Number.parseFloat((deviation / EMITTER_ANGLE_DEVIATION_FACTOR).toFixed(2))
    }
  }
}

export const getLineSNR = (snr: number): { raw: number, signal: 'strong' | 'regular' | 'weak' } => {
  if (snr > 25) return { signal: 'strong', raw: snr }
  if (snr > 6) return { signal: 'regular', raw: snr }
  return { signal: 'weak', raw: snr }
}

export const getLinesTemperature = (temperature: number): { raw: number, celsius: number } => ({
  raw: temperature,
  celsius: Number.parseFloat(((temperature - 50) / 10).toFixed(1))
})
