import { crc16kermit } from 'crc'
import { ID_INDEX, MINIMAL_FRAME_LENGTH, PAYLOAD_INDEX, STANDARD_FRAME_MAXIMUM_CLASS_BYTELENGTH } from './constants'

export const getBufferData = (data: any): Buffer => {
  if (Buffer.isBuffer(data)) return data
  if (typeof data === 'string') return Buffer.from(data, 'ascii')
  try {
    return Buffer.from(data)
  } catch (error) {
    console.error(error)
    throw new Error('Input data should be binary or string ascii data')
  }
}

export const getCalculatedCRC = (frame: Buffer, payloadLength: number): number => {
  const CRC_INDEX = PAYLOAD_INDEX + payloadLength
  const data = frame.subarray(ID_INDEX, CRC_INDEX)
  return crc16kermit(data)
  // const computedCRC = crc16kermit(data)
  // console.debug(`CRC = ${crc} | calculated = ${computedCRC}`)
  // return computedCRC === crc
}

export const bitStatus = (num: number, bit: number): boolean => (num >> bit) % 2 !== 0

export const isLargeFrame = (length: number): boolean => length > STANDARD_FRAME_MAXIMUM_CLASS_BYTELENGTH

export const nextFrameIndex = (length: number): number => MINIMAL_FRAME_LENGTH + length
