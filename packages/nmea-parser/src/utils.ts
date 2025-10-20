import { CODE } from './constants'

export const numberToHexString = (num: number): string => num.toString(16)

export const isBoundedASCII = (char: string, min: number, max: number): boolean => {
  const num = char.codePointAt(0)
  if (num === undefined) return false
  return (min <= num) && (num <= max)
}

export const isLowerCharASCII = (char: string): boolean => isBoundedASCII(char, CODE.a, CODE.z)
export const isUpperCharASCII = (char: string): boolean => isBoundedASCII(char, CODE.A, CODE.Z)
export const isNumberCharASCII = (char: string): boolean => isBoundedASCII(char, CODE['0'], CODE['9'])
