import { SBGFrameFormats, SBGFrameMessageClasses, SBGFrameTypes, SBGParsingStatuses } from './constants'

export type SBGFrameMessageClass = typeof SBGFrameMessageClasses[keyof typeof SBGFrameMessageClasses]
export type SBGFrameType = typeof SBGFrameTypes[keyof typeof SBGFrameTypes]
export type SBGFrameFormat = typeof SBGFrameFormats[keyof typeof SBGFrameFormats]
export type SBGParsingStatus = typeof SBGParsingStatuses[keyof typeof SBGParsingStatuses]

export interface SBGLargeFrameDataBuffer {
  transmissionID: number
  pageIndex: number
  pages: number
  data: Buffer
}

export interface SBGFrameNameData {
  name: string
  data: SBGData
}

export interface SBGFrameNameTypeData extends SBGFrameNameData {
  type: SBGFrameType
}

export interface SBGFrameData extends SBGFrameNameTypeData {
  format: SBGFrameFormat
}

export type SBGDataParser = (payload: Buffer) => SBGFrameNameData

export type SBGFrameParser = (messageClass: number, messageID: number, payload: Buffer) => SBGFrameNameTypeData

export interface SBGHeader {
  sync: Buffer
  messageID: number
  messageClass: number
  length: number
}

export type SBGData = object | null

export interface SBGFooter {
  crc: number
  ext: Buffer
}

export interface SBGFrame {
  header: SBGHeader
  data: SBGData
  footer: SBGFooter
}

export interface SBGFrameResponse {
  name: string
  type: SBGFrameType
  format: SBGFrameFormat
  frame: SBGFrame
  buffer: Buffer
}

export type SBGParser = (messageClass: number, messageID: number, payload: Buffer) => SBGFrameData
