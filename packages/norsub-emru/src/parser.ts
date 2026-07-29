// installed
import type { CMA, DeviceParser } from '@coremarine/nmea-parser'

// coded
import { NorsubNMEAParser } from './protocol-nmea'
import type { NorsubParserOptions, NorsubProtocol, ProtocolParserOptions } from './types'

// The active protocol parser. A one-member union today; each future protocol adds
// itself here, and consumers reach protocol-specific extras through `NorsubParser.parser`.
type ProtocolParser = NorsubNMEAParser

const DEFAULT_PROTOCOL: NorsubProtocol = 'nmea'

// How to build each protocol's parser. Adding protocol #2 is ONE entry plus ONE
// class, with no edit to the facade below — that is the whole point of composing
// rather than extending (Open/Closed).
const PROTOCOL_PARSERS: Record<NorsubProtocol, (options: ProtocolParserOptions) => ProtocolParser> = {
  nmea: (options) => new NorsubNMEAParser(options),
}

const isProtocol = (value: unknown): value is NorsubProtocol => (
  typeof value === 'string' && Object.hasOwn(PROTOCOL_PARSERS, value)
)

// Indexing the registry lives here rather than inline: with a single-member
// `NorsubProtocol` union, TypeScript narrows an already-guarded `value` to `never`
// after an inequality check, which makes `PROTOCOL_PARSERS[value]` uncallable.
// Passing the protocol as a parameter keeps the lookup honest at any union size.
const createProtocolParser = (protocol: NorsubProtocol, options: ProtocolParserOptions): ProtocolParser => (
  PROTOCOL_PARSERS[protocol](options)
)

// A NorSub eMRU device: a facade over the ONE protocol the device is configured to
// emit. Typed by `DeviceParser<string>` (the shared contract) rather than by any
// base class, so it is interchangeable with the parsers that extend `Parser`.
//
// Nothing here throws — an invalid assignment is discarded and the current value
// kept, following the core setter precedent.
export class NorsubParser implements DeviceParser<string> {
  private _protocol: NorsubProtocol
  private _parser: ProtocolParser

  constructor({ bufferLimit, memory, protocol }: NorsubParserOptions = {}) {
    this._protocol = isProtocol(protocol) ? protocol : DEFAULT_PROTOCOL
    this._parser = createProtocolParser(this._protocol, { bufferLimit, memory })
  }

  // The active protocol parser, exposed so protocol-specific extras are reachable —
  // `norsub.parser.getFakeSentenceByID('PNORSUB8')`, `.addSentences(yaml)`,
  // `.getSentence(id)`, `.getSentencesByProtocol()`. Deliberately NOT delegated
  // method by method: the facade's API would balloon as protocols are added, and
  // most of those methods are meaningless for whichever protocol is active.
  get parser(): ProtocolParser { return this._parser }

  // Every protocol this parser can be switched to.
  get protocols(): NorsubProtocol[] { return Object.keys(PROTOCOL_PARSERS) as NorsubProtocol[] }

  get protocol(): NorsubProtocol { return this._protocol }

  // Switching protocol DISCARDS internal state: a fresh protocol parser means the
  // input buffer AND any parsed-but-undrained sentences are dropped, because half a
  // sentence in protocol A can never be completed by protocol B. `memory` and
  // `bufferLimit` carry over. Assigning the protocol already in use is a no-op.
  set protocol(value: NorsubProtocol) {
    if (!isProtocol(value) || value === this._protocol) return
    const { bufferLimit, memory } = this._parser
    this._protocol = value
    this._parser = createProtocolParser(value, { bufferLimit, memory })
  }

  get memory(): boolean { return this._parser.memory }
  set memory(value: boolean) { this._parser.memory = value }

  get bufferLimit(): number { return this._parser.bufferLimit }
  set bufferLimit(value: number) { this._parser.bufferLimit = value }

  get buffer(): string { return this._parser.buffer }

  addData(data: string): void {
    this._parser.addData(data)
  }

  parseData(data?: string): CMA[] {
    return this._parser.parseData(data)
  }
}
