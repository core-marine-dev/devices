import type { Firmware, SBFBodyDataParser } from '../types'
import { getSBFFrame as getSBFFrame_4_10_1 } from './4-10-1'

// Firmwares
const firmwareParsers = new Map<Firmware, SBFBodyDataParser>()
// Add Firmwares
firmwareParsers.set('4.10.1', getSBFFrame_4_10_1)

const getFirmwares = (): Firmware[] => Array.from(firmwareParsers.keys())

const getFirmareParser = (firmare: Firmware): SBFBodyDataParser | undefined => firmwareParsers.get(firmare)

const isAvailableFirmware = (firmware: any): boolean => firmwareParsers.has(firmware)

const throwFirmwareError = (fw: string): never => {
  // const fmws = new Intl.ListFormat('en', { type: 'unit' }).format(getFirmwares())
  const fmws = Array.from(getFirmwares()).join(', ')
  const error = `Supported firmwares are -> ${fmws} not ${fw}`
  throw new Error(error)
}
// Export
export {
  getFirmwares,
  getFirmareParser,
  isAvailableFirmware,
  throwFirmwareError
}
