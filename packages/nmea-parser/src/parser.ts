// installed
import { StringParser } from '@coremarine/protocol-core'
import type { DraftCMA, ExtractedSentences, ParserOptions, Result, Timestamp } from '@coremarine/protocol-core'

// coded
import { NMEA_ID_LENGTH } from './constants'
import { PROTOCOLS } from './nmea'
import { getStoredSentences, parseProtocols } from './protocols'
import { ProtocolsFileContentSchema, StringSchema } from './schemas'
import { createFakeSentence, getTalker, getUnparsedNMEASentences, lastUncompletedSentence, newestDefinition, parseSentence } from './sentences'
import type { MapStoredSentences, NMEAError, NMEALike, ProtocolOutput, ProtocolsFileContent, Sentence, StoredSentence } from './types'

// NMEA 0183 parser. Extends the shared StringParser (which owns the
// memory/buffer/drain machinery and the addData/parseData contract) and
// implements only the protocol-specific `extractSentences`. Output is CMA.
export class NMEAParser extends StringParser {
  // Knowledge base: id -> definitions (multiple per id across NMEA versions).
  protected _definitions: MapStoredSentences = new Map()

  constructor(options: ParserOptions = {}) {
    super(options)
    // Load the built-in, bundled NMEA standard sentences. The built-in is
    // trusted and validated at build time, so this never throws: on the
    // (impossible-in-practice) validation miss we simply register nothing.
    const builtin = ProtocolsFileContentSchema.safeParse(PROTOCOLS)
    if (builtin.success) this.registerProtocols(builtin.value)
  }

  private registerProtocols(content: ProtocolsFileContent): void {
    for (const [id, definitions] of getStoredSentences(content)) {
      const existing = this._definitions.get(id) ?? []
      this._definitions.set(id, [...existing, ...definitions])
    }
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

  protected extractSentences(buffer: string): ExtractedSentences<string> {
    const remainder = lastUncompletedSentence(buffer) ?? ''
    const sentences = getUnparsedNMEASentences(buffer).map((raw) => parseSentence(raw, this._definitions))
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
