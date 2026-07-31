// installed
import type { CMA, DeviceParser, ParserError, Result, SentenceDefinition } from '@coremarine/nmea-parser'

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
  // `norsub.parser.addSentences(yaml)`, `.getSentencesByProtocol()`. Deliberately NOT
  // delegated method by method: the facade's API would balloon as protocols are added,
  // and most of those methods are meaningless for whichever protocol is active.
  //
  // The THREE introspection members below are the exception, because they are part of
  // the shared `DeviceParser` contract (see @coremarine/protocol-core): every parser,
  // device-level or protocol-level, can list what it knows, describe it and fabricate
  // it. Those are delegated.
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

  // Introspection — the shared contract, delegated to the ACTIVE protocol parser.
  //
  // A facade can only answer for the protocol currently selected, and that is the
  // whole subtlety: `norsub.getSentenceDefinition('X')` failing does NOT mean the
  // device cannot speak X, only that the active protocol does not. So a failure
  // carries a second error naming the active protocol and pointing at `.parser`,
  // which is where protocol-specific lookups belong (`addSentences`,
  // `getSentencesByProtocol`, and anything a future protocol adds).
  //
  // NOTE on the word "protocol": the second argument means what it means for
  // every parser — the protocol/version a DEFINITION belongs to (`'NORSUB8'`,
  // `'GYROCOMPAS1'`), passed straight through. The DEVICE protocol is selected
  // with the `protocol` property, not here.
  get sentenceIds(): string[] { return this._parser.sentenceIds }

  getSentenceDefinition(id: string, protocol?: string): Result<SentenceDefinition[], ParserError[]> {
    return this.withActiveProtocol(this._parser.getSentenceDefinition(id, protocol))
  }

  getFakeSentence(id: string, protocol?: string): Result<string, ParserError[]> {
    return this.withActiveProtocol(this._parser.getFakeSentence(id, protocol))
  }

  private withActiveProtocol<T>(result: Result<T, ParserError[]>): Result<T, ParserError[]> {
    if (result.success) return result
    const others = this.protocols.filter((protocol) => protocol !== this._protocol)
    const alternatives = (others.length === 0) ? 'no other protocol is implemented yet' : `this device also speaks: ${others.join(', ')}`
    return {
      success: false,
      error: [
        ...result.error,
        {
          kind: 'inactive-protocol',
          message: `asked of the active device protocol '${this._protocol}' (${alternatives}); use .parser for protocol-specific lookups`,
        },
      ],
    }
  }
}
