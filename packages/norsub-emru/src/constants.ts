import path from 'node:path'
import { fileURLToPath } from 'node:url'
// DIR
export const DIRNAME = ((): string => {
  try {
    // CJS
    return __dirname
  } catch (error) {
    // ESM
    const filename = fileURLToPath(import.meta.url)
    return path.dirname(filename)
  }
})()
// GENERATE NUMBERS
export const UINT8_MAX = Uint8Array.from([0b1111_1111])[0]
export const UINT16_MAX = Uint16Array.from([0b1111_1111_1111_1111])[0]
export const UINT32_MAX = Uint32Array.from([0b1111_1111_1111_1111_1111_1111_1111_1111])[0]
// export const UINT64_MAX = Uint64Array.from([0b11111111_11111111_11111111_11111111_11111111_11111111_11111111_11111111])[0]

export const [INT8_MIN, INT8_MAX] = Int8Array.from([0b1000_0000, 0b0111_1111])
export const [INT16_MIN, INT16_MAX] = Int16Array.from([0b1000_0000_0000_0000, 0b0111_1111_1111_1111])
export const [INT32_MIN, INT32_MAX] = Int32Array.from([0b1000_0000_0000_0000_0000_0000_0000_0000, 0b0111_1111_1111_1111_1111_1111_1111_1111])
// export const [INT64_MIN, INT64_MAX] = Int64Array.from([0b10000000_00000000_00000000_00000000_00000000_00000000_00000000_00000000, 0b01111111_11111111_11111111_11111111_11111111_11111111_11111111_11111111])

export const MAX_FLOAT = 999999999999999
export const MIN_FLOAT = -999999999999999
