// coded
import { MAX_BYTES, MAX_CHARACTERS } from './constants'
import { BooleanSchema, NaturalSchema } from './schemas'
import type { CMA, DraftCMA, ExtractedSentences, Input, ParserOptions, Timestamp, TimestampMetadata } from './types'

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
    // `received` is stamped the moment the input reaches the parser. Since
    // `addData` parses immediately, `received` and `parsed` sit microseconds
    // apart in the happy path — a visible gap is a built-in "something's
    // lagging" signal.
    const received = Date.now()
    this._buffer = this._memory ? this.concat(this._buffer, data) : data
    const { sentences, remainder } = this.extractSentences(this._buffer)
    for (const draft of sentences) {
      this._sentences.push(this.stampTimestamp(draft, received))
    }
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

  // Turn a DraftCMA into a CMA by stamping the sentence-level timestamp
  // metadata. This is the ONLY place a CMA gains its `metadata.timestamp`, so
  // the contract (required timestamp) can never be violated by a protocol.
  private stampTimestamp(draft: DraftCMA, received: Timestamp): CMA {
    const sentence = this.sentenceTimestamp(draft)
    const timestamp: TimestampMetadata = (sentence === undefined)
      ? { received, parsed: draft.timestamp }
      : { received, parsed: draft.timestamp, sentence }
    return { ...draft, metadata: { ...draft.metadata, timestamp } }
  }

  // Protocol hook: the sentence's own time (epoch ms) if it carries one, else
  // undefined. Default = no sentence timestamp. Overridden per protocol (NMEA:
  // GGA UTC; Septentrio: TOW+WNc). Reads a DraftCMA — timestamp not stamped yet.
  protected sentenceTimestamp(_sentence: DraftCMA): Timestamp | undefined {
    return undefined
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
