import { test, expect } from 'vitest'
import * as utils  from '../src/utils'

test('getUint32', () => {
  const a = 0b1111_1010_0101_0000
  const b = 0b1010_0101_0000_1111
  const b_a = Uint32Array.from([0b1010_0101_0000_1111_1111_1010_0101_0000])[0]
  const d = utils.getUint32(a, b)
  expect(d).toBe(b_a)
})

test('getBit', () => {
  const bits = 0b1010_1010_1010_1010
  for (let i = 0; i < 16; i++) {
    const bit = utils.getBit(bits, i)
    if ((i % 2) === 0) {
      expect(bit).toBeFalsy()
    } else {
      expect(bit).toBeTruthy()
    }
  }
})