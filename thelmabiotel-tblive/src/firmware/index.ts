import type { MapFirmwareParser } from '../types'
import { parser as Parser101 } from './1.0.1'
import { parser as Parser102 } from './1.0.2'

export const firmwareParser: MapFirmwareParser = new Map()
firmwareParser.set('1.0.1', Parser101)
firmwareParser.set('1.0.2', Parser102)
