// coded
import { MAX_BYTES, MAX_CHARACTERS } from './constants'
import { BooleanSchema, NaturalSchema } from './schemas'
import type { CMA, ExtractedSentences, Input, ParserOptions } from './types'

// Shared parser contract. Every CoreMarine device parser is created with an
// options object, fed bytes/chars with `addData`, and drained with
// `parseData` — regardless of protocol. The ONLY protocol-specific piece is
// `extractSentences`: given the current buffer, return the complete sentences
// and the trailing remainder. Everything else (memory, buffering, the drained
// queue) lives here and is identical across parsers.
export abstract class Parser<B extends Input> {
  protected _memory: boolean
  protected _bufferLimit: number
  protected _buffer: B
  protected _sentences: CMA[] = []

  constructor({ memory = true, bufferLimit }: ParserOptions = {}) {
    this._memory = memory
    this._bufferLimit = bufferLimit ?? this.defaultBufferLimit()
    this._buffer = this.emptyBuffer()
  }

  get memory(): boolean { return this._memory }
  // Never throws (legacy behaviour we avoid): validate, set if valid, else keep the current value.
  set memory(value: boolean) { if (BooleanSchema.is(value)) this._memory = value }

  get bufferLimit(): number { return this._bufferLimit }
  set bufferLimit(value: number) { if (NaturalSchema.is(value)) this._bufferLimit = value }

  get buffer(): B { return this._buffer }

  addData(data: B): void {
    this._buffer = this._memory ? this.concat(this._buffer, data) : data
    const { sentences, remainder } = this.extractSentences(this._buffer)
    this._sentences.push(...sentences)
    this._buffer = remainder
  }

  parseData(data?: B): CMA[] {
    if (data !== undefined) {
      this.addData(data)
    }
    const sentences = [...this._sentences]
    this._sentences = []
    return sentences
  }

  // Protocol-specific — the one method a concrete parser must implement.
  protected abstract extractSentences(buffer: B): ExtractedSentences<B>
  // Buffer-type mechanics — supplied by the StringParser / BinaryParser bases.
  protected abstract emptyBuffer(): B
  protected abstract concat(a: B, b: B): B
  protected abstract defaultBufferLimit(): number
}

// String protocols (NMEA, Norsub, TB Live).
export abstract class StringParser extends Parser<string> {
  protected emptyBuffer(): string { return '' }
  protected concat(a: string, b: string): string { return a + b }
  protected defaultBufferLimit(): number { return MAX_CHARACTERS }
}

// Binary protocols (Septentrio SBF, SBG sbgECom).
export abstract class BinaryParser extends Parser<Uint8Array> {
  protected emptyBuffer(): Uint8Array { return new Uint8Array(0) }

  protected concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    const out = new Uint8Array(a.length + b.length)
    out.set(a)
    out.set(b, a.length)
    return out
  }

  protected defaultBufferLimit(): number { return MAX_BYTES }
}
