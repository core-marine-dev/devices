import { crc16xmodem } from 'crc'
import type { Padding } from './types'

export const computedCRC = (data: Buffer): number => crc16xmodem(data)

export const bitState = (num: number, bit: number): boolean => (num >>> bit) % 2 !== 0

export const getPadding = (data: Buffer, index: number = 0, length: number = 0): Padding => (length > 0) ? data.readUIntLE(index, length) : null

// TODO: Create a proper Generic type for the callback
export const getNullableValue = (value: any, callback: Function): any => (value !== null) ? callback(value) : null
