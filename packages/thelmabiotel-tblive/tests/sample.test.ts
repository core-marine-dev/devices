import { describe, expect, test } from 'vitest'
import { EMITTER_ANGLE_AVERAGE_BIT_LENGTH, EMITTER_ANGLE_AVERAGE_FACTOR, EMITTER_ANGLE_DEVIATION_FACTOR, SAMPLE_END, SAMPLE_START } from '../src/constants'
import { parseSample } from '../src/sample'
import { getLineAngle, getLineSNR, getLinesTemperature } from '../src/utils'

const now = new Date()
const seconds = now.getSeconds()
const milliseconds = now.getMilliseconds()
// const timestamp = now.getTime()
const mode = 'listening'

describe('sample()', () => {
  const average = {
    degrees: 15.3,
    value: Number.parseInt((15.3 * EMITTER_ANGLE_AVERAGE_FACTOR).toFixed(0)),
  }
  
  const deviation = {
    degrees: 1.25,
    value: Number.parseInt((1.25 * EMITTER_ANGLE_DEVIATION_FACTOR).toFixed(0)),
  }

  const angle = average.value + (deviation.value << EMITTER_ANGLE_AVERAGE_BIT_LENGTH)
  
  const emitter = {
    receiver: '1000042',
    protocol: 'S64K',
    emitter: '1285',
    angle: {
      raw: angle.toString(),
      value: angle,
      average,
      deviation
    },
    snr: getLineSNR(24),
    frequency: 69,
    sent: 11
  }

  const receiver = {
    receiver: '1000042',
    log: 'TBR Sensor',
    temperature: {
      raw: "297",
      value: 297,
      celsius: getLinesTemperature(297).celsius,
    },
    noiseAverage: 15,
    noisePeak: 29,
    frequency: 69,
    sent: 6,
  }

  describe('emitter101', () => {
    const id = 'emitter'
    const firmware = '1.0.1'
    // Emitter 101: $1000042,0000002202,615,S64K,1285,0,24,69,11\r
    const input = `${SAMPLE_START}${emitter.receiver},${seconds},${milliseconds},${emitter.protocol},${emitter.emitter},${emitter.angle.raw},${emitter.snr.raw},${emitter.frequency},${emitter.sent}${SAMPLE_END}`

    test('happy path', () => {
      const result = parseSample(input, Date.now())
      const { timestamp: _timestamp, ...resultWithoutTimestamp } = result
      const expected = {
        raw: input,
        id,
        firmware,
        mode,
        payload: [
          // Receiver
          { raw: emitter.receiver, name: 'TB Live serial number', type: 'string', value: Number(emitter.receiver) },
          // Seconds
          { raw: seconds.toString(), name: 'seconds', type: 'uint32', value: seconds, units: 'seconds' },
          // Milliseconds
          { raw: milliseconds.toString(), name: 'milliseconds', type: 'uint16', value: milliseconds, units: 'milliseconds' },
          // Protocol
          { raw: emitter.protocol, name: 'protocol', type: 'string', value: emitter.protocol },
          // Emitter
          { raw: emitter.emitter, name: 'emitter', type: 'string', value: Number(emitter.emitter) },
          // Angle
          { raw: emitter.angle.raw, name: 'angle', type: 'uint16', value: emitter.angle.value, metadata: {
            raw: emitter.angle.value,
            average: { raw: emitter.angle.average.value, degrees: emitter.angle.average.degrees },
            deviation: { raw: emitter.angle.deviation.value, degrees: emitter.angle.deviation.degrees }
          } },
          // SNR
          { raw: emitter.snr.raw.toString(), name: 'snr', type: 'uint8', value: emitter.snr.raw, metadata: { ...emitter.snr } },
          // Frequency
          { raw: emitter.frequency.toString(), name: 'frequency', type: 'uint8', value: emitter.frequency, units: 'kHz', description: 'Frequency has to be bound between 63 - 77 kHz' },
          // Sent
          { raw: emitter.sent.toString(), name: 'sent', type: 'uint32', value: emitter.sent }
        ],
        metadata : {
          timestamp : {
            value : Number(`${seconds}${milliseconds}`),
            date : new Date(Number(`${seconds}${milliseconds}`)).toISOString()
          },
          receiver : Number(emitter.receiver),
          emitter : Number(emitter.emitter),
          angle : { ...getLineAngle(emitter.angle.value) },
          snr : { ...emitter.snr },
        }
      }
      expect(resultWithoutTimestamp).toEqual(expected)
    })

    test('errors', () => {
      const input = `${SAMPLE_START}R01,abc,500,A69,T01,456,22,69,123${SAMPLE_END}`
      
      const result = parseSample(input, Date.now())
      
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
      expect(result.errors).toContain('seconds field is not a positive integer: abc')
    })
  })

  describe('emitter102', () => {
    const id = 'emitter'
    const firmware = '1.0.2'
    // Emitter 102: $1000042,0000002202,615,S64K,1285,0,24,69\r
    const input = `${SAMPLE_START}${emitter.receiver},${seconds},${milliseconds},${emitter.protocol},${emitter.emitter},${emitter.angle.raw},${emitter.snr.raw},${emitter.frequency}${SAMPLE_END}`

    test('happy path', () => {
      const result = parseSample(input, Date.now())
      const { timestamp: _timestamp, ...resultWithoutTimestamp } = result
      const expected = {
        raw: input,
        id,
        firmware,
        mode,
        payload: [
          // Receiver
          { raw: emitter.receiver, name: 'TB Live serial number', type: 'string', value: Number(emitter.receiver) },
          // Seconds
          { raw: seconds.toString(), name: 'seconds', type: 'uint32', value: seconds, units: 'seconds' },
          // Milliseconds
          { raw: milliseconds.toString(), name: 'milliseconds', type: 'uint16', value: milliseconds, units: 'milliseconds' },
          // Protocol
          { raw: emitter.protocol, name: 'protocol', type: 'string', value: emitter.protocol },
          // Emitter
          { raw: emitter.emitter, name: 'emitter', type: 'string', value: Number(emitter.emitter) },
          // Angle
          { raw: emitter.angle.raw, name: 'angle', type: 'uint16', value: emitter.angle.value, metadata: {
            raw: emitter.angle.value,
            average: { raw: emitter.angle.average.value, degrees: emitter.angle.average.degrees },
            deviation: { raw: emitter.angle.deviation.value, degrees: emitter.angle.deviation.degrees }
          } },
          // SNR
          { raw: emitter.snr.raw.toString(), name: 'snr', type: 'uint8', value: emitter.snr.raw, metadata: { ...emitter.snr } },
          // Frequency
          { raw: emitter.frequency.toString(), name: 'frequency', type: 'uint8', value: emitter.frequency, units: 'kHz', description: 'Frequency has to be bound between 63 - 77 kHz' }
        ],
        metadata : {
          timestamp : {
            value : Number(`${seconds}${milliseconds}`),
            date : new Date(Number(`${seconds}${milliseconds}`)).toISOString()
          },
          receiver : Number(emitter.receiver),
          emitter : Number(emitter.emitter),
          angle : { ...getLineAngle(emitter.angle.value) },
          snr : { ...emitter.snr },
        }
      }
      expect(resultWithoutTimestamp).toEqual(expected)
    })

    test('errors', () => {
      const input = `${SAMPLE_START}R02,1686124048,-501,A69,T02,457,23,70${SAMPLE_END}`
      
      const result = parseSample(input, Date.now())
      
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
      expect(result.errors).toContain('milliseconds field is not a positive integer: -501')
    })

  })

  describe('receiver101', () => {
    const id = 'receiver'
    const firmware = '1.0.1'
    // Receiver 101: $1000042,0000000600,TBR Sensor,297,15,29,69,6\r
    const input = `${SAMPLE_START}${receiver.receiver},${seconds},${receiver.log},${receiver.temperature.raw},${receiver.noiseAverage},${receiver.noisePeak},${receiver.frequency},${receiver.sent}${SAMPLE_END}`

    test('happy path', () => {
      const result = parseSample(input, Date.now())
      const { timestamp: _timestamp, ...resultWithoutTimestamp } = result
      const expected = {
        raw: input,
        id,
        firmware,
        mode,
        payload: [
          // Receiver
          { raw: receiver.receiver, name: 'TB Live serial number', type: 'string', value: Number(receiver.receiver) },
          // Seconds
          { raw: seconds.toString(), name: 'seconds', type: 'uint32', value: seconds, units: 'seconds' },
          // Log
          { raw: receiver.log, name: 'log', type: 'string', value: receiver.log },
          // Temperature
          { raw: receiver.temperature.raw, name: 'temperature', type: 'int16', value: receiver.temperature.value, metadata: { ...getLinesTemperature(receiver.temperature.value) } },
          // Noise average
          { raw: receiver.noiseAverage.toString(), name: 'noise_average', type: 'uint8', value: receiver.noiseAverage },
          // Noise peak
          { raw: receiver.noisePeak.toString(), name: 'noise_peak', type: 'uint8', value: receiver.noisePeak },
          // Frequency
          { raw: receiver.frequency.toString(), name: 'frequency', type: 'uint8', value: receiver.frequency, units: 'kHz', description: 'frequency has to be bound between 63 - 77 kHz' },
          // Sent
          { raw: receiver.sent.toString(), name: 'sent', type: 'uint32', value: receiver.sent }
        ],
        metadata : {
          timestamp : {
            value : Number(`${seconds}000`),
            date : new Date(Number(`${seconds}000`)).toISOString()
          },
          receiver : Number(receiver.receiver),
          noise : {
            average : receiver.noiseAverage,
            peak : receiver.noisePeak
          },
          temperature: { ...getLinesTemperature(receiver.temperature.value) }
        }
      }
      expect(resultWithoutTimestamp).toEqual(expected)
    })

    test('errors', () => {
      const input = `${SAMPLE_START}R03,1686124049,TBR Sensor,temp,10,15,70,124${SAMPLE_END}`
      
      const result = parseSample(input, Date.now())
      
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
      expect(result.errors).toContain('temperature field is not an integer: temp')
    })

  })

  describe('receiver102', () => {
    const id = 'receiver'
    const firmware = '1.0.2'
    // Receiver 102: $1000042,0000000600,TBR Sensor,297,15,29,69\r
    const input = `${SAMPLE_START}${receiver.receiver},${seconds},${receiver.log},${receiver.temperature.raw},${receiver.noiseAverage},${receiver.noisePeak},${receiver.frequency}${SAMPLE_END}`

    test('happy path', () => {
      const result = parseSample(input, Date.now())
      const { timestamp: _timestamp, ...resultWithoutTimestamp } = result
      const expected = {
        raw: input,
        id,
        firmware,
        mode,
        payload: [
          // Receiver
          { raw: receiver.receiver, name: 'TB Live serial number', type: 'string', value: Number(receiver.receiver) },
          // Seconds
          { raw: seconds.toString(), name: 'seconds', type: 'uint32', value: seconds, units: 'seconds' },
          // Log
          { raw: receiver.log, name: 'log', type: 'string', value: receiver.log },
          // Temperature
          { raw: receiver.temperature.raw, name: 'temperature', type: 'int16', value: receiver.temperature.value, metadata: { ...getLinesTemperature(receiver.temperature.value) } },
          // Noise average
          { raw: receiver.noiseAverage.toString(), name: 'noise_average', type: 'uint8', value: receiver.noiseAverage },
          // Noise peak
          { raw: receiver.noisePeak.toString(), name: 'noise_peak', type: 'uint8', value: receiver.noisePeak },
          // Frequency
          { raw: receiver.frequency.toString(), name: 'frequency', type: 'uint8', value: receiver.frequency, units: 'kHz', description: 'frequency has to be bound between 63 - 77 kHz' },
        ],
        metadata : {
          timestamp : {
            value : Number(`${seconds}000`),
            date : new Date(Number(`${seconds}000`)).toISOString()
          },
          receiver : Number(receiver.receiver),
          noise : {
            average : receiver.noiseAverage,
            peak : receiver.noisePeak
          },
          temperature: { ...getLinesTemperature(receiver.temperature.value) }
        }
      }
      expect(resultWithoutTimestamp).toEqual(expected)
    })

    test('errors', () => {
      const input = `${SAMPLE_START}R04,1686124050,TBR Status,66,11,NaN,71${SAMPLE_END}`
      
      const result = parseSample(input, Date.now())
      
      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
      expect(result.errors).toContain('noise_peak field is not a positive integer: NaN')
    })

  })

  describe('unknown format', () => {
    const id = 'sample'
    const firmware = 'unknown'
    test('should handle unknown sample format', () => {
      const input = `${SAMPLE_START}R05,1686124051,600,A69,T05${SAMPLE_END}`
      
      const result = parseSample(input, Date.now())
      const { timestamp: _timestamp, ...resultWithoutTimestamp } = result
      
      const expected = {
        raw: input,
        id,
        firmware,
        mode,
        payload: [],
        errors: [`unknown sample sentence with 5 fields\n${input}`]
      }

      expect(resultWithoutTimestamp).toEqual(expected)
    })
  })

})

