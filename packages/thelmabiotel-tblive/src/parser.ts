// installed
import { StringParser, UNKNOWN } from '@coremarine/protocol-core'
import type { DraftCMA, ExtractedSentences, ParserError, ParserOptions, Result, Timestamp } from '@coremarine/protocol-core'

// coded
import { ERROR_BUFFER_LIMIT, FIRMWARES } from './definitions'
import type { Firmware, SentenceId } from './definitions'
import { createFakeSentence } from './fake'
import type { FakeOptions } from './fake'
import { definableIds, describeSentence } from './introspect'
import type { SentenceDefinition } from './introspect'
import { buildGarbage, buildSentence } from './sentences'
import { scanBuffer } from './tokenizer'

// NOTE — there is deliberately NO `sentenceTimestamp` override.
//
// `metadata.timestamp.sentence` asserts when a sentence happened, and this device
// cannot support that claim: the two datasheets disagree about what its clock does
// when unset (1.0.1 says it counts seconds since POWER UP, 1.0.2 says it resets to
// 1 Jan 2000), and nothing on the wire says which firmware is answering. Asserting
// it is how the old parser ended up reporting "1970-01-01" as a real date.
//
// So the device's own numbers are published as DATA instead —
// `metadata.payload.time` — where they are plainly "what the device said" rather
// than "when this happened". Deciding whether that is epoch or uptime needs
// deployment knowledge the parser does not have. Same stance as norsub-emru, whose
// T1/T2 are a wrapping counter and likewise never become a sentence timestamp.
const isFirmware = (value: unknown): value is Firmware =>
  value === UNKNOWN || FIRMWARES.includes(value as typeof FIRMWARES[number])

// This parser validates a request in one pass and can therefore have several
// reasons to refuse it (three bad options, say). The shared error channel in
// @coremarine/protocol-core is an ARRAY of `{ kind, message }` for exactly that
// reason: every reason survives, each keeping its own kind.
const asParserErrors = <T>(result: Result<T, string[]>, kind: string): Result<T, ParserError[]> => {
  if (result.success) return result
  return { success: false, error: result.error.map((message) => ({ kind, message })) }
}

export interface TBLiveOptions extends ParserOptions {
  // Pin the firmware when the deployment knows it. Otherwise the parser starts at
  // `unknown` and learns from the first sentence that proves one.
  firmware?: Firmware
}

// TB Live receiver parser. Emits CMA; never throws.
export class TBLiveParser extends StringParser {
  protected _firmware: Firmware = UNKNOWN

  constructor({ firmware, ...options }: TBLiveOptions = {}) {
    super(options)
    if (isFirmware(firmware)) {
      this._firmware = firmware
    }
  }

  // The firmware in force: pinned, or learned from an `FV=` response or from
  // whether the device entered command mode with `LIVECM` (1.0.1) or `TBRC`
  // (1.0.2). `unknown` until something proves it — never a hardcoded guess.
  get firmware(): Firmware { return this._firmware }
  set firmware(value: Firmware) { if (isFirmware(value)) this._firmware = value }

  get firmwares(): readonly string[] { return FIRMWARES }

  // Fabricate a wire sentence — deterministic, so a fixture never drifts.
  //
  // `protocol` is MANDATORY and stays mandatory (cru, 2026-07-31): an `emitter`
  // sentence is genuinely different on 1.0.1 and 1.0.2 — different field counts,
  // `LIVECM` vs `TBRC` — so a fixture cannot be built without knowing which is
  // wanted, and picking one on the caller's behalf would quietly hand them the
  // wrong shape. `options` overrides individual fields and is narrowed to the ones
  // this `id` actually has. This `(id, protocol, options?)` shape is the one the
  // shared contract adopted for every parser.
  //
  // A `Result` rather than `null`, so the caller learns WHICH mistakes were made:
  // an unknown id, an unknown protocol and a malformed option are different
  // things, and one call can hit several — hence an array.
  getFakeSentence<K extends SentenceId>(
    id: K,
    protocol: Firmware,
    options?: FakeOptions[K],
  ): Result<string, ParserError[]> {
    return asParserErrors(
      createFakeSentence(id, protocol, (options ?? {}) as Record<string, unknown>),
      'invalid-fake-request',
    )
  }

  // What this parser believes a sentence looks like: fields, types, units, which API
  // it belongs to, and how it is recognised on the wire. Omit `protocol` to get every
  // protocol version. Always an array, even for a single match.
  //
  // This is a diagnostic tool. These parsers run on remote installations with
  // restricted internet access for years, so being able to ask the deployed binary
  // what it expects settles questions that would otherwise need the datasheets.
  getSentenceDefinition(id: SentenceId, protocol?: Firmware): Result<SentenceDefinition[], ParserError[]> {
    return asParserErrors(describeSentence(id, protocol), 'invalid-definition-request')
  }

  // Every sentence id this parser can fabricate or describe.
  get sentenceIds(): SentenceId[] { return definableIds() }

  protected extractSentences(buffer: string): ExtractedSentences<string> {
    const { segments, remainder } = scanBuffer(buffer)
    const timestamp = Date.now()
    const sentences: DraftCMA[] = []
    for (const segment of segments) {
      if (segment.kind === 'garbage') {
        sentences.push(buildGarbage(buffer.slice(segment.start, segment.end), segment.error, timestamp))
        continue
      }
      const { match } = segment
      const raw = buffer.slice(match.start, match.end)
      const sentence = buildSentence(raw, match, { timestamp, firmware: this._firmware })
      this.learnFirmware(sentence)
      sentences.push(sentence)
    }
    return this.enforceBufferLimit(buffer, sentences, remainder, timestamp)
  }

  // An `FV=` response states the firmware; `LIVECM` / `TBRC` prove it implicitly.
  // Both arrive as a sentence whose protocol version is not `unknown`.
  private learnFirmware(sentence: DraftCMA): void {
    if (sentence.id === 'firmware') {
      const stated = sentence.payload[0]?.value
      // The datasheet prints both `FV=1.0.1` and `FV=v1.0.1`.
      const version = (typeof stated === 'string') ? stated.replace(/^v/, '') : ''
      if (isFirmware(version)) {
        this._firmware = version
      }
      return
    }
    if (isFirmware(sentence.protocol.version) && sentence.protocol.version !== UNKNOWN) {
      this._firmware = sentence.protocol.version
    }
  }

  // The base class does not enforce the limit, and neither did the old parser —
  // it was stored, validated, and used nowhere, so a `$` with no terminator could
  // grow the buffer without bound and stay SILENT. Binary junk on the line
  // routinely contains `$`, so this is the case that actually happens.
  private enforceBufferLimit(
    buffer: string,
    sentences: DraftCMA[],
    remainder: number,
    timestamp: Timestamp,
  ): ExtractedSentences<string> {
    const pending = buffer.slice(remainder)
    if (pending.length <= this._bufferLimit) {
      return { sentences, remainder: pending }
    }
    sentences.push(buildGarbage(pending, ERROR_BUFFER_LIMIT, timestamp))
    return { sentences, remainder: '' }
  }
}
