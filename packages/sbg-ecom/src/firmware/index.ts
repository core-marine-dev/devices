// coded
import { classes as classes_2_3 } from './2-3'

import { DEFAULT_FIRMWARE } from '../constants'
import type { ClassRegistry, LogRegistry } from '../types'

/* One knowledge base per supported firmware. §2.4 states the compatibility rule
   the device itself relies on: "SBG Systems reserves the right to add at the end of
   logs new fields in future revision of the sbgECom protocol for upward
   compatibility. Therefore, user must consider the DATA sizes defined in this
   document as a minimum size."

   So a log only ever GROWS at the tail, and this parser is forward-safe by
   construction: a longer body decodes every field it knows and publishes the extra
   bytes at metadata.trailing instead of failing. A newer firmware needs a registry
   here only when it ADDS a log or changes a meaning. */
const registries = new Map<string, ClassRegistry>([
  ['2.3', classes_2_3],
])

export const firmwares = (): string[] => [...registries.keys()]

export const isFirmware = (firmware: unknown): firmware is string =>
  typeof firmware === 'string' && registries.has(firmware)

// Never throws (the 0.0.x parser threw from its setter): an unknown firmware falls
// back to the default, which is always registered.
export const classesFor = (firmware: string): ClassRegistry =>
  registries.get(firmware) ?? (registries.get(DEFAULT_FIRMWARE) as ClassRegistry)

// The logs of one class, or undefined when this firmware models no log of it.
export const logsFor = (firmware: string, messageClass: number): LogRegistry | undefined =>
  classesFor(firmware).get(messageClass)
