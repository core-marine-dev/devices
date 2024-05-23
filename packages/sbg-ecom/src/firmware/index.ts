import type { SBGFrameParser, SBGParser } from '../types'
import { getSBGFrame as getSBGFrame2_3 } from './2.3'

// Firmwares
const firmwareParsers = new Map<string, SBGFrameParser>()
// Add Firmwares
firmwareParsers.set('2.3', getSBGFrame2_3)

const getFirmwares = (): string[] => Array.from(firmwareParsers.keys())

const getFirmareParser = (firmare: string): SBGParser => {
  const parser = firmwareParsers.get(firmare)
  if (parser == null) throwFirmwareError()
  return parser as SBGParser
}

const isAvailableFirmware = (firmware: any): boolean => firmwareParsers.has(firmware)

const throwFirmwareError = (): never => {
  // const fmws = new Intl.ListFormat('en', { type: 'unit' }).format(getFirmwares())
  const fmws = Array.from(getFirmwares()).join(', ')
  const error = `Supported firmwares are -> ${fmws}`
  throw new Error(error)
}

// Export
export {
  getFirmwares,
  getFirmareParser,
  isAvailableFirmware,
  throwFirmwareError
}
