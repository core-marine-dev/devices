import { SBG_FRAME_FORMATS, SBGFrameMessageClasses, SBGFrameTypes, SBG_PARSING_STATUS } from './constants'

export type SBGFrameMessageClass = typeof SBGFrameMessageClasses[keyof typeof SBGFrameMessageClasses]
export type SBGFrameType = typeof SBGFrameTypes[keyof typeof SBGFrameTypes]
export type SBGFrameFormat = typeof SBG_FRAME_FORMATS[keyof typeof SBG_FRAME_FORMATS]
export type SBGParsingStatus = typeof SBG_PARSING_STATUS[keyof typeof SBG_PARSING_STATUS]

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
