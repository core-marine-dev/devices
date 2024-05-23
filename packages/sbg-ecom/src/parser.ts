import {
  SYNC_FLAG, SYNC_LENTGH,
  ID_INDEX, ID_LENGTH,
  CLASS_INDEX, CLASS_LENGTH,
  CRC_LENGTH,
  LENGTH_INDEX, LENGTH_LENGTH,
  PAYLOAD_INDEX,
  ETX_FLAG,
  MINIMAL_FRAME_LENGTH,
  TRANSMISSION_ID_LENGTH, PAGES_LENGTH, PAGE_INDEX_LENGTH,
  UNKNOWN_SBG_FRAME_DATA,
  TWO_BYTES_MAX,
  FOOTER_LENGTH,
  HEADER_LENGTH,
  SBG_PARSING_STATUS,
  SBG_FRAME_FORMATS
} from './constants'
import { getFirmareParser, getFirmwares, isAvailableFirmware, throwFirmwareError } from './firmware'
import type { SBGLargeFrameDataBuffer, SBGFrameData, SBGHeader, SBGFooter, SBGFrameResponse, SBGFrameParser, SBGParsingStatus } from './types'
import { getCalculatedCRC, isLargeFrame } from './utils'

export class Parser {
  // Internal Buffer
  protected _buffer: Buffer = Buffer.from([])
  get bufferSize (): number { return this._buffer.length }

  protected _bufferLimit: number = TWO_BYTES_MAX
  get bufferLimit (): typeof this._bufferLimit { return this._bufferLimit }
  set bufferLimit (limit: number) {
    if (typeof limit !== 'number') throw new Error('limit has to be a number')
    if (limit < 0) throw new Error('limit has to be a positive integer')
    if (limit < 1) throw new Error('limit has to be a positive integer greater than zero')
    this._bufferLimit = Math.trunc(limit)
    this.setBuffer()
  }

  // Internal Parsed Frames
  protected _frames: SBGFrameResponse[] = []
  // Firmware
  protected _firmware: string = '2.3'
  protected _parser: SBGFrameParser = getFirmareParser('2.3')
  get firmware (): typeof this._firmware { return this._firmware }
  set firmware (fw: string) {
    if (typeof fw !== 'string') throw new Error('firmware has to be a string')
    if (!isAvailableFirmware(fw)) throwFirmwareError()
    this._firmware = fw
    this._parser = getFirmareParser(fw)
  }

  // Memory
  protected _memory: boolean = false
  get memory (): typeof this._memory { return this._memory }
  set memory (mem: boolean) {
    if (typeof mem !== 'boolean') throw new Error('memory has to be boolean')
    this._memory = mem
  }

  constructor (firmware: string = '2.3', memory: boolean = false) {
    this.firmware = firmware
    this.memory = memory
  }

  getAvailableFirmwares (): string[] {
    return getFirmwares()
  }

  getFrames (): SBGFrameResponse[] {
    const frames = structuredClone(this._frames)
    this._frames = []
    return frames
  }

  addData (data: Buffer): void {
    // Check input data is Buffer
    if (!Buffer.isBuffer(data)) { throw new Error('data has to be a Buffer') }
    // If input data may have a frame, it will be stored
    if (data.includes(SYNC_FLAG)) {
      this._buffer = (this._memory) ? Buffer.concat([this._buffer, data]) : data
      // Parse data
      this.parseData()
    }
  }

  protected parseData (): void {
    const frames = [] as SBGFrameResponse[]
    let pivot = 0
    // Get last Index
    const lastIndex = this._buffer.lastIndexOf(SYNC_FLAG)
    do {
      // Get start of next frame
      const index = this._buffer.indexOf(SYNC_FLAG, pivot)
      if (index === -1) {
        this._buffer = Buffer.from([])
        break
      }
      // Refactor buffer
      const buffer = this._buffer.subarray(index)
      // Check buffer has the minimun length
      if (buffer.length < MINIMAL_FRAME_LENGTH) {
        console.debug('parseData: Not enough data get a frame')
        this._buffer = this._buffer.subarray(lastIndex)
        break
      }
      // Get frame
      const { status, frame: sbgframe } = this.getSBGFrame(buffer)
      // Correct frame
      // if (status === SBGParsingStatus.OK || status === SBGParsingStatus.ERROR_EXT) {
      if (status === SBG_PARSING_STATUS.OK) {
        frames.push(sbgframe)
        pivot = index + sbgframe.buffer.length
        continue
      }
      // Incomplete frame and last incomplete frame
      if (status === SBG_PARSING_STATUS.MISSING_BYTES && index === lastIndex) {
        this._buffer = this._buffer.subarray(lastIndex)
        break
      }
      // pivot = index + SYNC_LENTGH
      pivot = index + 1
    } while (true)
    // Update frames
    this.updateFrames(frames)
    // Limit buffer
    this.setBuffer()
  }

  protected getSBGFrame (info: Buffer): { status: SBGParsingStatus, frame: SBGFrameResponse } {
    let status: SBGParsingStatus = SBG_PARSING_STATUS.OK
    let sbgFrame = {} as any
    // HEADER
    const header = this.getHeader(info)
    const payloadLength = header.length
    const frame = { header }
    const buffer = info.subarray(0, HEADER_LENGTH + payloadLength + FOOTER_LENGTH)
    sbgFrame = { frame, buffer }
    // Check length
    if (info.subarray(PAYLOAD_INDEX).length < (payloadLength + FOOTER_LENGTH)) {
      // if (buffer.subarray(PAYLOAD_INDEX).length < (payloadLength + CRC_LENGTH)) {
      console.debug('getSBGFrame: SBG Frame is incomplete')
      status = SBG_PARSING_STATUS.MISSING_BYTES
      return { status, frame: sbgFrame as SBGFrameResponse }
    }
    // FOOTER
    const footerBuffer = info.subarray(PAYLOAD_INDEX + payloadLength, PAYLOAD_INDEX + payloadLength + FOOTER_LENGTH)
    const footer = this.getFooter(footerBuffer)
    sbgFrame.frame.footer = footer
    // Check CRC
    const crc = getCalculatedCRC(info, payloadLength)
    if (crc !== footer.crc) {
      console.debug(`getSBGFrame: Invalid CRC - should be ${footer.crc} -> get it ${crc}`)
      status = SBG_PARSING_STATUS.ERROR_CRC
      return { status, frame: sbgFrame as SBGFrameResponse }
    }
    // Check ext -> Optional
    if (Buffer.compare(footer.ext, ETX_FLAG) !== 0) {
      console.debug(`getSBGFrame: Invalid EXT Flag - should be ${ETX_FLAG.toString()} -> get it ${footer.ext.toString()}`)
      status = SBG_PARSING_STATUS.ERROR_EXT
      return { status, frame: sbgFrame as SBGFrameResponse }
    }
    // PAYLOAD
    const payloadBuffer = info.subarray(PAYLOAD_INDEX, PAYLOAD_INDEX + payloadLength)
    const { name, type, format, data } = this.getPayloadData(header.messageClass, header.messageID, payloadBuffer)
    sbgFrame.name = name
    sbgFrame.type = type
    sbgFrame.format = format
    sbgFrame.frame.data = data
    return { status, frame: sbgFrame as SBGFrameResponse }
  }

  protected getHeader (buffer: Buffer): SBGHeader {
    return {
      sync: buffer.subarray(0, SYNC_LENTGH),
      messageID: buffer.readUIntLE(ID_INDEX, ID_LENGTH),
      messageClass: buffer.readUIntLE(CLASS_INDEX, CLASS_LENGTH),
      length: buffer.readUIntLE(LENGTH_INDEX, LENGTH_LENGTH)
    }
  }

  protected getFooter (footer: Buffer): SBGFooter {
    return {
      crc: footer.readUIntLE(0, CRC_LENGTH),
      ext: footer.subarray(CRC_LENGTH, FOOTER_LENGTH)
    }
  }

  protected getPayloadData (messageClass: number, messageID: number, payload: Buffer): SBGFrameData {
    const sbgFrame: SBGFrameData = UNKNOWN_SBG_FRAME_DATA
    if (isLargeFrame(payload.length)) {
      const { data: subpayload, ...largedata } = this.getLargeFrameMetadata(payload)
      const { name, type, data } = this._parser(messageClass, messageID, payload)
      sbgFrame.name = name
      sbgFrame.format = SBG_FRAME_FORMATS.LARGE
      sbgFrame.type = type
      sbgFrame.data = { ...largedata, data }
    } else {
      const { name, type, data } = this._parser(messageClass, messageID, payload)
      sbgFrame.name = name
      sbgFrame.format = SBG_FRAME_FORMATS.STANDARD
      sbgFrame.type = type
      sbgFrame.data = data
    }
    return sbgFrame
  }

  protected getLargeFrameMetadata (payload: Buffer): SBGLargeFrameDataBuffer {
    const transmissionIDIndex = 0
    const pageIndex = transmissionIDIndex + TRANSMISSION_ID_LENGTH
    const pagesIndex = pageIndex + PAGE_INDEX_LENGTH
    const dataIndex = pagesIndex + PAGES_LENGTH
    return {
      transmissionID: payload.readUIntLE(transmissionIDIndex, TRANSMISSION_ID_LENGTH),
      pageIndex: payload.readUIntLE(pageIndex, PAGE_INDEX_LENGTH),
      pages: payload.readUIntLE(pagesIndex, PAGES_LENGTH),
      data: payload.subarray(dataIndex)
    }
  }

  protected updateFrames (frames: SBGFrameResponse[]): void {
    if (frames.length > 0) {
      if (this._memory) {
        this._frames = this._frames.concat(frames)
      } else {
        this._frames = frames
      }
    }
  }

  protected setBuffer (): void {
    if (this._buffer.length > this._bufferLimit) {
      this._buffer = this._buffer.subarray(-this._bufferLimit)
    }
  }
}
