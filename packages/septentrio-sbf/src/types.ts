import { SBF_PARSING_STATUS } from './constants'

export interface SBFFrame {
  header: SBFHeader
  time: SBFTime
  body: SBFBody
}

export interface SBFHeader {
  sync: string
  crc: number
  id: SBFID
  length: number
}

export interface SBFID {
  blockNumber: number
  blockRevision: number
}

export interface SBFTime {
  tow: number | null
  wnc: number | null
  timestamp?: number | null
  date?: string | null
}

export type SBFBody = object | null

export type Padding = number | null

export interface SBFResponse {
  name: string
  number: number
  version: number
  frame: SBFFrame
  buffer: Buffer
}

export interface SBFBodyData {
  name: string
  body: SBFBody
}

export type SBFParsingStatus = typeof SBF_PARSING_STATUS[keyof typeof SBF_PARSING_STATUS]

export type SBFBodyDataParser = (blockNumber: number, blockRevision: number, data: Buffer) => SBFBodyData
export type SBFBodyDataBlockParser = (blockRevision: number, data: Buffer) => SBFBodyData
export type SBFBodyDataMap = Map<number, SBFBodyDataBlockParser>

export type Firmware = `${number}.${number}.${number}` | `${number}.${number}` | `${number}`

export interface SeptentrioParser {
  getAvailableFirmwares: () => Firmware[]
  addData: (data: Buffer) => void
  parseData: () => SBFResponse[]
}
