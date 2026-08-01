// coded
import { blocks as blocks_4_10_1 } from './4-10-1'

import { DEFAULT_FIRMWARE } from '../constants'
import type { BlockRegistry } from '../types'

// One knowledge base per supported firmware. SBF block definitions only ever
// grow (§4.1.6: a revision adds fields, never removes them), so a newer
// firmware is a superset — but the mapping stays explicit rather than assumed,
// because Septentrio also ADDS blocks between firmwares.
const registries = new Map<string, BlockRegistry>([
  ['4.10.1', blocks_4_10_1],
])

export const firmwares = (): string[] => [...registries.keys()]

export const isFirmware = (firmware: unknown): firmware is string =>
  typeof firmware === 'string' && registries.has(firmware)

// Never throws (the 1.x parser threw from its setter): an unknown firmware
// falls back to the default, which is always registered.
export const blocksFor = (firmware: string): BlockRegistry =>
  registries.get(firmware) ?? (registries.get(DEFAULT_FIRMWARE) as BlockRegistry)
