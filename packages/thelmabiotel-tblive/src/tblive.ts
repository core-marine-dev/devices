import { FIRMWARES_AVAILABLE } from './constants'
import { parseSentences } from './parse'
import { BooleanSchema, NaturalSchema, StringSchema } from './schemas'
import { ParsedSentence } from './types'

export const tbliveFirmwares = (): string[] => FIRMWARES_AVAILABLE.filter(f => !Number.isNaN(Number(f[0])))

export class TBLive {
  protected _memory: boolean = true
  get memory (): boolean { return this._memory }
  set memory (value: boolean) {
    if (BooleanSchema.is(value)) {
      this._memory = Boolean(value)
    }
  }

  protected _buffer: string = ''
  get buffer (): string { return this._buffer }

  protected _bufferLimit: number = 1024
  get bufferLimit (): number { return this._bufferLimit }
  set bufferLimit (value: number) {
    if (NaturalSchema.is(value) && value > 0) {
      this._bufferLimit = Number(value)
    }
  }

  protected _sentences: ParsedSentence[] = []

  get firmwares (): ReturnType<typeof tbliveFirmwares> { return tbliveFirmwares() }

  constructor ({ memory, bufferLimit }: { memory?: boolean, bufferLimit?: number } = { memory: true, bufferLimit: 1024 }) {
    if (memory !== undefined) {
      this.memory = memory
    }
    if (bufferLimit !== undefined) {
      this.bufferLimit = bufferLimit
    }
  }

  addData (data: string): void {
    if (StringSchema.is(data)) {
      this._buffer = (this._memory) ? this._buffer + data : data
      const { sentences, remainder } = parseSentences(this._buffer)
      this._sentences = [...this._sentences, ...sentences]
      this._buffer = remainder
    }
  }

  parseData (data: string = ''): ParsedSentence[] {
    this.addData(data)
    const sentences = [...this._sentences]
    this._sentences = []
    return sentences
  }
}
