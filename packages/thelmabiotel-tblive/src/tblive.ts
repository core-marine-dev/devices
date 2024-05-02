import * as v from 'valibot'
import { API_END, API_START, FIRMWARES_AVAILABLE, FIRMWARE_START, MAX_BUFFER_LENGTH } from './constants'
import { FirmwareSchema, FrequencySchema, ReceiverSchema, StringSchema } from './schemas'
import type { Parser, Firmware, Receiver, FirmwareFrame, OutputFrame, SerialNumber, Frequency, Emitter, ListeningEmitterFrame } from './types'
import { firmwareParser } from './firmware'

export class TBLive {
  protected _parser: Parser
  protected _buffer: string = ''

  protected _firmware: Firmware
  get firmware(): Firmware { return this._firmware }
  set firmware(fw: Firmware) {
    this._firmware = v.parse(FirmwareSchema, fw)
    const parser = firmwareParser.get(this.firmware)
    if (parser !== undefined) {
      this._parser = parser
    }
    if (this._receiver !== null) {
      this._receiver.firmware = fw
    }
  }

  get firmwares(): typeof FIRMWARES_AVAILABLE { return FIRMWARES_AVAILABLE }

  protected _receiver: Receiver | null = null
  get receiver(): Receiver | null { return (this._receiver !== null) ? { ...this._receiver } : null }
  set receiver(receiver: Receiver) {
    this._receiver = v.parse(ReceiverSchema, receiver)
    if (this._receiver.firmware !== this._firmware) {
      this._firmware = this._receiver.firmware
    }
  }

  constructor(firmware: Firmware = '1.0.1', receiver: Receiver | null = null) {
    this._firmware = v.parse(FirmwareSchema, firmware)
    const parser = firmwareParser.get(this._firmware)
    if (parser === undefined) throw new Error(`Firmware ${firmware} is not supported`)
    this._parser = parser
    if (receiver !== null) {
      this._receiver = { ...v.parse(ReceiverSchema, receiver) }
      this._receiver.firmware = firmware
    }
  }

  protected checkEmitters(emitter: string, frequency: number, emitters: Emitter[]): string {
    for (const _emitter of emitters) {
      if (_emitter.serialNumber === emitter) {
        return (_emitter.frequency === frequency) ? '' : `Invalid Emitter Frequency ${frequency} -> Valid ${_emitter.frequency}`
      }
    }
    return `Invalid Emitter Serial Number ${emitter} -> Valid emitters are ${emitters.map(em => em.serialNumber).toString()}`
  }

  protected checkReceiver(frame: FirmwareFrame): string {
    if (this._receiver === null) return ''
    if (['emitter', 'receiver', 'ping', 'serial number'].every(name => frame.name !== name)) return ''
    const receiverSerialNumber: SerialNumber = this._receiver.serialNumber
    const { metadata } = frame
    if (metadata === undefined) return ''
    const frameSerialNumber: Firmware = metadata.receiver as Firmware
    // Check Receiver Serial number
    const sameSerialNumber = receiverSerialNumber.includes(frameSerialNumber)
    if (!sameSerialNumber) return `Invalid receiver serial number ${frameSerialNumber} -> it should be ${receiverSerialNumber}`
    if (frame.name === 'ping' || frame.name === 'serial number') return ''
    // Check Receiver Frequency
    const receiverFrequency: Frequency = this._receiver.frequency
    if (frame.name === 'receiver') {
      const { frequency }: { frequency: Frequency } = metadata.sample
      if (frequency !== undefined && frequency !== receiverFrequency) return `Invalid receiver frequency ${frequency} -> it should be ${receiverFrequency}`
    }
    // Listening Emitter Frame
    const { frequency: sampleFrequency, emitter: sampleEmitter } = metadata.sample as ListeningEmitterFrame['metadata']['sample']
    const parsedFrequency = v.safeParse(FrequencySchema, sampleFrequency)
    if (!parsedFrequency.success) return parsedFrequency.issues[0].message
    const frameFrequency = parsedFrequency.output
    if (frameFrequency !== receiverFrequency) return `Invalid receiver frequency -> received ${frameFrequency} - expected ${receiverFrequency}`
    // Check Emitters
    const emitters: Emitter[] | undefined = this._receiver.emitters
    if (emitters === undefined) return ''
    return this.checkEmitters(sampleEmitter, frameFrequency, emitters)
  }

  protected getNewFirmwareChange(): void {
    // Check there is a new firmware change
    const nextFirmwareChangeIndex = this._buffer.indexOf(FIRMWARE_START, FIRMWARE_START.length)
    if (nextFirmwareChangeIndex === -1) {
      this._buffer = ''
      return
    }
    // Check  firmware change is outside an API frame
    const nextAPIStartIndex = this._buffer.indexOf(API_START)
    if (nextAPIStartIndex === -1 || nextFirmwareChangeIndex < nextAPIStartIndex) {
      this._buffer = this._buffer.slice(nextFirmwareChangeIndex)
      return
    }
    const nextAPIEndIndex = this._buffer.indexOf(API_END, nextAPIStartIndex)
    if (nextAPIEndIndex === -1 || nextAPIEndIndex < nextFirmwareChangeIndex) {
      this._buffer = this._buffer.slice(nextFirmwareChangeIndex)
      return
    }
    // Firmware change is inside an API frame
    this._buffer = this._buffer.slice(nextAPIEndIndex + API_END.length)
    this.getNewFirmwareChange()
  }

  addData(data: string): void { this._buffer += v.parse(StringSchema, data) }

  parseData(data: string = ''): OutputFrame[] {
    if (v.parse(StringSchema, data).length > 0) {
      this.addData(data)
    }
    const timestamp = Date.now()
    let response: FirmwareFrame[] = []
    while (this._buffer.length > 0) {
      const { frames, nonparsed, firmwareChange } = this._parser(this._buffer)
      response = response.concat(frames)
      this._buffer = nonparsed
      // No firmware change -> finish
      if (!firmwareChange) { break }
      // Firmware change -> change the firmware and parse the nonparsed
      const firmwareChangeFrame: FirmwareFrame = frames.slice(-1)[0]
      const newFirmware: Firmware = (firmwareChangeFrame.data?.at(0) as Firmware) ?? '9.9.9'
      const parsed = v.safeParse(FirmwareSchema, newFirmware)
      // Non supported firmware -> find next fw change
      if (!parsed.success) {
        response[response.length - 1].errorFirmware = `Firmware ${newFirmware} is not supported, just ${FIRMWARES_AVAILABLE.toString()}`
        this.getNewFirmwareChange()
        break
      }
      this.firmware = newFirmware
    }
    if (this._receiver !== null) {
      this._receiver.mode = response.slice(-1)[0].mode
    }
    // Do not over-increase internal buffer
    if (this._buffer.length > MAX_BUFFER_LENGTH) {
      this._buffer = this._buffer.slice(-MAX_BUFFER_LENGTH)
    }
    // Return response
    return response.map(frame => {
      // Check receiver serial number and / or emitters serial number
      if (this._receiver !== null) {
        const errorReceiver = this.checkReceiver(frame)
        if (errorReceiver.length > 0) {
          return {
            ...frame,
            timestamp,
            errorReceiver
          }
        }
      }
      // None receiver or none serialnumber errors
      return { ...frame, timestamp }
    })
  }
}
