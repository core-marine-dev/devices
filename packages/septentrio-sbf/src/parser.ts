// installed
import type { CMA, DeviceParser, Result } from '@coremarine/protocol-core'

// coded
import { SBFParser } from './protocol-sbf'
import { SEPTENTRIO_PROTOCOLS } from './types'
import type { FakeOptions, SBFError, SBFSentenceDefinition, SeptentrioParserOptions, SeptentrioProtocol } from './types'

// The DEVICE parser. A Septentrio receiver can be configured to emit SBF, NMEA
// or RTCM on the same port, so the device is not the same thing as the protocol:
// this facade COMPOSES a protocol parser rather than being one (the pattern
// norsub-emru settled on). Today there is exactly one protocol, `sbf`; adding
// NMEA later is a new entry in the registry below plus a bytes-to-string shim,
// with no change to this class's public surface.
type ProtocolFactory = (options: SeptentrioParserOptions) => SBFParser

const factories: Readonly<Record<SeptentrioProtocol, ProtocolFactory>> = {
  sbf: (options) => new SBFParser(options),
}

export class SeptentrioParser implements DeviceParser<Uint8Array> {
  protected _protocol: SeptentrioProtocol = 'sbf'
  protected _parser: SBFParser

  constructor(options: SeptentrioParserOptions = {}) {
    const { protocol, ...rest } = options
    // Never throws: an unknown protocol falls back to the default.
    if (protocol !== undefined && SEPTENTRIO_PROTOCOLS.includes(protocol)) this._protocol = protocol
    this._parser = factories[this._protocol](rest)
  }

  // The active protocol parser, for everything protocol-specific (firmware,
  // block definitions). Exposed as one getter instead of delegating method by
  // method, so a new protocol does not force this class to grow.
  get parser(): SBFParser { return this._parser }

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

  getSentenceDefinition(id: number | string, protocol?: string): Result<SBFSentenceDefinition[], SBFError[]> {
    return this._parser.getSentenceDefinition(id, protocol)
  }

  getFakeSentence(id: number | string, protocol?: string, options?: FakeOptions): Result<Uint8Array, SBFError[]> {
    return this._parser.getFakeSentence(id, protocol, options)
  }
}
