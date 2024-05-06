import { CODE, TALKERS, TALKERS_SPECIAL } from './constants'
import type { Talker } from './types'

export const numberToHexString = (num: number): string => num.toString(16)

export const isBoundedASCII = (char: string, min: number, max: number): boolean => {
  const num = char.charCodeAt(0)
  return (min <= num) && (num <= max)
}

export const isLowerCharASCII = (char: string): boolean => isBoundedASCII(char, CODE.a, CODE.z)
export const isUpperCharASCII = (char: string): boolean => isBoundedASCII(char, CODE.A, CODE.Z)
export const isNumberCharASCII = (char: string): boolean => isBoundedASCII(char, CODE['0'], CODE['9'])

export const getTalker = (id: string): Talker => {
  // Known Talker
  const description = TALKERS.get(id)
  if (typeof description === 'string') { return { id, description } }
  // Special Talker U#
  if (id.startsWith('U') && id.length === 2 && !isNaN(Number(id[1]))) {
    return { id, description: TALKERS_SPECIAL.U }
  }
  // Special Talker Pxxx -> Propietary
  if (id.startsWith('P')) {
    return { id, description: TALKERS_SPECIAL.P }
  }
  // Uknown talker
  return { id, description: 'unknown' }
}
