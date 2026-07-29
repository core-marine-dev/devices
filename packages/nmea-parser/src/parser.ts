// installed
import { StringParser } from '@coremarine/protocol-core'
import type { DraftCMA, ExtractedSentences, ParserOptions, Result, Timestamp } from '@coremarine/protocol-core'

// coded
import { NMEA_ID_LENGTH } from './constants'
import { BUILTIN_METADATA_AGGREGATORS } from './metadata'
import type { MetadataAggregators } from './metadata'
import { PROTOCOLS } from './nmea'
import { getStoredSentences, parseProtocols } from './protocols'
import { BUILTIN_SENTENCE_RESOLVERS } from './resolvers'
import type { SentenceResolvers } from './resolvers'
import { ProtocolsFileContentSchema, StringSchema } from './schemas'
import { createFakeSentence, garbageSentence, getTalker, newestDefinition, parseSentence, scanBuffer } from './sentences'
import type { MapStoredSentences, NMEAError, NMEALike, ProtocolOutput, ProtocolsFileContent, Sentence, StoredSentence } from './types'

// NMEA 0183 parser. Extends the shared StringParser (which owns the
// memory/buffer/drain machinery and the addData/parseData contract) and
// implements only the protocol-specific `extractSentences`. Output is CMA.
export class NMEAParser extends StringParser {
  // Knowledge base: id -> definitions (multiple per id across NMEA versions).
  protected _definitions: MapStoredSentences = new Map()
  // Field/payload metadata aggregators, keyed `${id}:${payloadLength}`. Own copy
  // of the built-ins so a subclass can add its own (see registerAggregators).
  protected _aggregators: MetadataAggregators = { ...BUILTIN_METADATA_AGGREGATORS }
  // Id resolvers for formats that carry their real sentence type in a field
  // (e.g. PSXN). Own copy of the built-ins, same as the aggregators.
  protected _resolvers: SentenceResolvers = { ...BUILTIN_SENTENCE_RESOLVERS }

  constructor(options: ParserOptions = {}) {
    super(options)
    // Load the built-in, bundled NMEA standard sentences. The built-in is
    // trusted and validated at build time, so this never throws: on the
    // (impossible-in-practice) validation miss we simply register nothing.
    const builtin = ProtocolsFileContentSchema.safeParse(PROTOCOLS)
    if (builtin.success) this.registerProtocols(builtin.value)
  }

  // Register already-parsed protocol knowledge. `protected` so a subclass can
  // load its OWN bundled built-in (a device with proprietary sentences) exactly
  // the way this class loads the NMEA standard — without the YAML round-trip.
  protected registerProtocols(content: ProtocolsFileContent): void {
    for (const [id, definitions] of getStoredSentences(content)) {
      const existing = this._definitions.get(id) ?? []
      this._definitions.set(id, [...existing, ...definitions])
    }
  }

  // Register field/payload metadata aggregators, keyed `${id}:${payloadLength}`.
  // `protected` so a subclass can derive metadata for its own sentences (e.g. a
  // status bitfield) through the same model the built-ins use — no need to
  // override the parse pipeline. Later registrations win on a duplicate key.
  protected registerAggregators(aggregators: MetadataAggregators): void {
    this._aggregators = { ...this._aggregators, ...aggregators }
  }

  // Register id resolvers, keyed `${id}:${payloadLength}` on the id AS RECEIVED.
  // `protected` for the same reason as the aggregators: a device whose sentences
  // share an id and field count (the real type living in a field) can be decoded
  // by plain YAML definitions once the id is resolved. Later registrations win.
  protected registerResolvers(resolvers: SentenceResolvers): void {
    this._resolvers = { ...this._resolvers, ...resolvers }
  }

  // Single knowledge-feed input: a protocols YAML string. On the web use
  // `await file.text()`; on node read the file yourself, then pass the text.
  // Never throws — a non-string input or invalid YAML/schema is a Result error.
  addSentences(yaml: string): Result<void, NMEAError> {
    if (!StringSchema.is(yaml)) {
      return { success: false, error: { kind: 'invalid-yaml', message: 'addSentences expects a YAML string' } }
    }
    const parsed = parseProtocols(yaml)
    if (!parsed.success) return parsed
    this.registerProtocols(parsed.value)
    return { success: true, value: undefined }
  }

  // Every character of the buffer is accounted for: a sentence (decoded as far
  // as possible, with `errors` for anything malformed), a garbage sentence, or
  // the still-incomplete tail that goes back on the buffer. Nothing is dropped
  // silently — bad input must be visible in the OUTPUT, not only in a log.
  protected extractSentences(buffer: string): ExtractedSentences<string> {
    const { chunks, remainder } = scanBuffer(buffer, this._bufferLimit)
    const sentences = chunks.map((chunk) => (chunk.garbage
      ? garbageSentence(chunk.raw, chunk.errors)
      : parseSentence(chunk.raw, this._definitions, this._aggregators, chunk.errors, this._resolvers)))
    return { sentences, remainder }
  }

  // The sentence's own time (-> metadata.timestamp.sentence). NMEA sentences
  // carry it in a field (GGA's utc_position), decoded to epoch ms by the
  // aggregators into field metadata; we promote the first such field. Sentences
  // with no time field (most) return undefined and get no `sentence` timestamp.
  protected override sentenceTimestamp(sentence: DraftCMA): Timestamp | undefined {
    for (const field of sentence.payload) {
      const value = field.metadata?.timestamp
      if (typeof value === 'number') return value
    }
    return undefined
  }

  // Nice to have -----------------------------------------------------------------------------------------------------
  getSentences(): StoredSentence[] {
    return Array.from(this._definitions.values()).flat()
  }

  getSentencesByProtocol(): ProtocolOutput {
    const response: ProtocolOutput = {}
    for (const sentence of this.getSentences()) {
      const key = sentence.protocol.name
      response[key] = [...(response[key] ?? []), sentence]
    }
    return response
  }

  getSentence(id: string): Sentence | null {
    if (!StringSchema.is(id) || id.length < NMEA_ID_LENGTH) return null
    const direct = this._definitions.get(id)
    if (direct !== undefined) return { ...newestDefinition(direct) }
    const talker = getTalker(id)
    if (talker === null) return null
    const stored = this._definitions.get(id.slice(talker.value.length))
    return (stored !== undefined) ? { ...newestDefinition(stored), talker } : null
  }

  getFakeSentenceByID(id: string): NMEALike | null {
    if (!StringSchema.is(id) || id.length < NMEA_ID_LENGTH) return null
    const direct = this._definitions.get(id)
    if (direct !== undefined) return createFakeSentence(newestDefinition(direct))
    const talker = getTalker(id)
    if (talker === null) return null
    const stored = this._definitions.get(id.slice(talker.value.length))
    return (stored !== undefined) ? createFakeSentence(newestDefinition(stored), talker.value) : null
  }
}
