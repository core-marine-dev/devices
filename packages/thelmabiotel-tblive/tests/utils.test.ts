import { describe, test, expect } from 'vitest'
import { getLineAngle, getLineSNR, getLinesTemperature } from '../src/utils'
import { EMITTER_ANGLE_AVERAGE_BIT_LENGTH, EMITTER_ANGLE_AVERAGE_FACTOR, EMITTER_ANGLE_DEVIATION_FACTOR } from '../src/constants'

// Claude ---------------------------------------------------------------------
describe('getLineAngle function', () => {
  test('should correctly calculate angle data', () => {
    const average = 102.3
    const averageRaw = average * EMITTER_ANGLE_AVERAGE_FACTOR
    const deviation = 0
    const deviationRaw = deviation * EMITTER_ANGLE_DEVIATION_FACTOR
    const data = averageRaw + (deviationRaw << EMITTER_ANGLE_AVERAGE_BIT_LENGTH)
    // const data = 0b000_0000_0111_1111_1111 // 511 in binary
    const result = getLineAngle(data)
    
    const expected = {
      raw: data,
      average: {
        raw: averageRaw,
        degrees: average
      },
      deviation: {
        raw: deviationRaw,
        degrees: deviation
      }
    }
    expect(result).toEqual(expected)
  })

  test('should correctly calculate angle data with deviation', () => {
    const average = 102.3
    const averageRaw = average * EMITTER_ANGLE_AVERAGE_FACTOR
    const deviation = 1.75
    const deviationRaw = deviation * EMITTER_ANGLE_DEVIATION_FACTOR
    const data = averageRaw + (deviationRaw << EMITTER_ANGLE_AVERAGE_BIT_LENGTH)
    // const data = 0b0000_0001_0111_1111_1111 // 511 with bit 10 set (deviation)
    const result = getLineAngle(data)
    
    const expected = {
      raw: data,
      average: {
        raw: averageRaw,
        degrees: average
      },
      deviation: {
        raw: deviationRaw,
        degrees: deviation
      }
    }
    expect(result).toEqual(expected)
  })
})

describe("getLineSNR function", () => {
  test('should return "weak" for SNR <= 6', () => {
    expect(getLineSNR(5)).toEqual({ signal: "weak", raw: 5 });
    expect(getLineSNR(6)).toEqual({ signal: "weak", raw: 6 });
  });

  test('should return "regular" for 6 < SNR <= 25', () => {
    expect(getLineSNR(7)).toEqual({ signal: "regular", raw: 7 });
    expect(getLineSNR(25)).toEqual({ signal: "regular", raw: 25 });
  });

  test('should return "strong" for SNR > 25', () => {
    expect(getLineSNR(26)).toEqual({ signal: "strong", raw: 26 });
    expect(getLineSNR(100)).toEqual({ signal: "strong", raw: 100 });
  });
})

describe('getLinesTemperature function', () => {
  test('should correctly calculate temperature in celsius', () => {
    expect(getLinesTemperature(50)).toEqual({ raw: 50, celsius: 0 })
    expect(getLinesTemperature(60)).toEqual({ raw: 60, celsius: 1 })
    expect(getLinesTemperature(55)).toEqual({ raw: 55, celsius: 0.5 })
  })
})
