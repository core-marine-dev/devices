// installed
import type { CMA, DeviceParser, ParserError, Result, SentenceDefinition } from '@coremarine/protocol-core'

// coded
import { SeptentrioNMEAParser } from './protocol-nmea'
import { SBFParser } from './protocol-sbf'
import { SEPTENTRIO_PROTOCOLS } from './types'
import type { FakeOptions, SeptentrioParserOptions, SeptentrioProtocol } from './types'

// The DEVICE parser. A Septentrio receiver can be configured to emit SBF, NMEA
// or RTCM on the same port, so the device is not the same thing as the protocol:
// this facade COMPOSES a protocol parser rather than being one (the pattern
// norsub-emru settled on). Two protocols are implemented — `sbf` and `nmea`; a
// third is a new entry in the registry below, with no change to this class's
// public surface.
//
// Both protocol parsers take BYTES, so this class stays uniform: the NMEA one
// adapts nmea-parser (a StringParser) internally rather than making the facade
// know which protocols are text and which are binary.
type ProtocolParser = SBFParser | SeptentrioNMEAParser
type ProtocolFactory = (options: SeptentrioParserOptions) => ProtocolParser

const factories: Readonly<Record<SeptentrioProtocol, ProtocolFactory>> = {
  sbf: (options) => new SBFParser(options),
  nmea: (options) => new SeptentrioNMEAParser(options),
}

export class SeptentrioParser implements DeviceParser<Uint8Array> {
  protected _protocol: SeptentrioProtocol = 'sbf'
  protected _parser: ProtocolParser

  constructor(options: SeptentrioParserOptions = {}) {
    const { protocol, ...rest } = options
    // Never throws: an unknown protocol falls back to the default.
    if (protocol !== undefined && SEPTENTRIO_PROTOCOLS.includes(protocol)) this._protocol = protocol
    this._parser = factories[this._protocol](rest)
  }

  // The active protocol parser, for everything protocol-specific: SBF's block
  // registry and its richer definition shape (`name`, `revision`, `timestamp`),
  // NMEA's `addSentences`/`getSentencesByProtocol`. Exposed as ONE getter instead of
  // delegating method by method, so a new protocol does not force this class to grow
  // — and narrowing is `parser instanceof SBFParser`.
  get parser(): ProtocolParser { return this._parser }

  get protocol(): SeptentrioProtocol { return this._protocol }
  // Switching protocol DISCARDS the buffer and any undrained sentences: the
  // bytes were being interpreted under different framing rules, so keeping them
  // would be worse than dropping them. An invalid value is ignored.
  set protocol(protocol: SeptentrioProtocol) {
    if (!SEPTENTRIO_PROTOCOLS.includes(protocol)) return
    // Resolved before the equality check below: with a single-member union TS
    // narrows `protocol` to `never` after it, and this reads better than a cast.
    const factory = factories[protocol]
    if (protocol === this._protocol) return
    const { firmware, memory, bufferLimit } = this._parser
    this._protocol = protocol
    this._parser = factory({ memory, bufferLimit, firmware })
  }

  get protocols(): readonly SeptentrioProtocol[] { return SEPTENTRIO_PROTOCOLS }

  get firmware(): string { return this._parser.firmware }
  set firmware(firmware: string) { this._parser.firmware = firmware }

  get memory(): boolean { return this._parser.memory }
  set memory(memory: boolean) { this._parser.memory = memory }

  get bufferLimit(): number { return this._parser.bufferLimit }
  set bufferLimit(bufferLimit: number) { this._parser.bufferLimit = bufferLimit }

  get buffer(): Uint8Array { return this._parser.buffer }

  addData(data: Uint8Array): void { this._parser.addData(data) }

  parseData(data?: Uint8Array): CMA[] { return this._parser.parseData(data) }

  // The introspection surface every CoreMarine parser exposes, delegated to the
  // active protocol parser.
  get sentenceIds(): string[] { return this._parser.sentenceIds }

  // Typed by the SHARED contract, not by SBF's richer shape: a facade can only
  // promise what every protocol it fronts can deliver. SBF's extra keys (`name`,
  // `revision`, `timestamp`, `opaque`) are reached through `.parser`, the same rule
  // this class already applies to every other protocol-specific extra.
  getSentenceDefinition(id: number | string, protocol?: string): Result<SentenceDefinition[], ParserError[]> {
    return (this._parser instanceof SBFParser)
      ? this._parser.getSentenceDefinition(id, protocol)
      : this._parser.getSentenceDefinition(String(id), protocol)
  }

  // `options` is SBF's fake-frame control; the NMEA side takes no options today.
  getFakeSentence(id: number | string, protocol?: string, options?: FakeOptions): Result<Uint8Array, ParserError[]> {
    return (this._parser instanceof SBFParser)
      ? this._parser.getFakeSentence(id, protocol, options)
      : this._parser.getFakeSentence(String(id), protocol)
  }
}
