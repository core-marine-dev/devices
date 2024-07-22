import { getChecksum } from './checksum'
import { MAX_CHARACTERS, NMEA_ID_LENGTH } from './constants'
import { NMEA_SENTENCES } from './nmea-sentences'
import { getStoreSentences, readProtocolsYAMLFile, readProtocolsYAMLString } from './protocols'
import { BooleanSchema, ProtocolsInputSchema, StringSchema, UnsignedIntegerSchema } from './schemas'
import { createFakeSentence, getIdPayloadAndChecksum, getKnownNMEASentence, getTalker, getUnknowNMEASentence, getUnparsedNMEAFrames, lastUncompletedFrame } from './sentences'
import type { MapStoredSentences, NMEALike, NMEAParser, NMEASentence, ProtocolOutput, ProtocolsFileContent, ProtocolsInput, Sentence, StoredSentence } from './types'

export class Parser implements NMEAParser {
  // Memory - Buffer
  protected _memory: boolean = true
  get memory (): typeof this._memory { return this._memory }
  set memory (mem: boolean) { this._memory = BooleanSchema.parse(mem) }
  protected _buffer: string = ''
  protected _bufferLength: number = MAX_CHARACTERS
  get bufferLimit (): typeof this._bufferLength { return this._bufferLength }
  set bufferLimit (limit: number) { this._bufferLength = UnsignedIntegerSchema.parse(limit) }
  // Sentences
  protected _sentences: MapStoredSentences = new Map()
  // get sentences() { return this._sentences }

  constructor (memory: boolean = false, limit: number = MAX_CHARACTERS) {
    this.memory = memory
    this.bufferLimit = limit
    // add NMEA standard frames
    this.readInternalProtocols()
  }

  // Mandatory --------------------------------------------------------------------------------------------------------
  private readInternalProtocols (): void {
    const parsed = ProtocolsInputSchema.parse(NMEA_SENTENCES)
    this.addProtocols(parsed)
  }

  private readProtocols (input: ProtocolsInput): ProtocolsFileContent {
    if (input.file !== undefined) return readProtocolsYAMLFile(input.file)
    if (input.content !== undefined) return readProtocolsYAMLString(input.content)
    if (input.protocols !== undefined) return { protocols: input.protocols }
    throw new Error('Invalid protocols to add')
  }

  addProtocols (input: ProtocolsInput): void {
    if (!ProtocolsInputSchema.is(input)) {
      const error = 'Parser: invalid protocols to parse'
      console.error(error)
      console.error(input)
      throw new Error(error)
    }
    const { protocols } = this.readProtocols(input)
    // Get sentences for new protocols
    const sentences = getStoreSentences({ protocols })
    // Add to known sentences
    this._sentences = new Map([...this._sentences, ...sentences])
  }

  parseData (text: string): NMEASentence[] {
    if (!StringSchema.is(text)) return []
    const data = (this.memory) ? this._buffer + text : text
    return this.getFrames(data)
  }

  private getFrames (text: string): NMEASentence[] {
    if (this._memory) {
      const lastFrame = lastUncompletedFrame(text)
      if (lastFrame !== null) {
        this._buffer = lastFrame
      }
    }
    const unparsedFrames = getUnparsedNMEAFrames(text)
    return unparsedFrames.map(frame => this.getFrame(frame))
  }

  private getFrame (text: NMEALike): NMEASentence {
    const received = Date.now()
    const { id: sentenceID, payload: pl, checksum: cs } = getIdPayloadAndChecksum(text)
    const checksum = getChecksum(cs)
    const sentence = this._sentences.get(sentenceID)
    // Known NMEA sentence
    if (sentence !== undefined) {
      const response = getKnownNMEASentence({ received, sample: text, sentenceID, sentencePayload: pl, checksum, model: sentence })
      if (response !== null) { return response }
    }
    // Known NMEA sentence with Talker
    const talker = getTalker(sentenceID)
    if (talker !== null) {
      const id = sentenceID.replace(talker.value, '')
      const talkerSentence = this._sentences.get(id)
      if (talkerSentence !== undefined) {
        const response = getKnownNMEASentence({ received, sample: text, sentenceID: id, sentencePayload: pl, checksum, model: talkerSentence })
        if (response !== null) { return { ...response, talker } }
      }
    }
    // Unknown NMEA sentence
    const unknown = getUnknowNMEASentence({ received, sample: text, sentenceID, sentencePayload: pl, checksum })
    return (talker !== null) ? { ...unknown, talker } : unknown
  }

  // Nice to have -----------------------------------------------------------------------------------------------------
  getSentences (): StoredSentence[] {
    return Array.from(this._sentences.values())
  }

  getSentencesByProtocol (): ProtocolOutput {
    const sentences = this.getSentences()
    // return Object.groupBy(sentences, (sentence: StoredSentence) => sentence.protocol.name)
    const response: ProtocolOutput = {}
    sentences.forEach(sentence => {
      const key = sentence.protocol.name
      if (!(key in response)) {
        response[key] = [sentence]
      }
      response[key].push(sentence)
    })
    return response
  }

  getSentence (id: string): Sentence | null {
    if (!StringSchema.is(id) || id.length < NMEA_ID_LENGTH) { return null }
    const sentence = this._sentences.get(id)
    if (sentence !== undefined) { return { ...sentence } }
    const talker = getTalker(id)
    if (talker === null) { return null }
    const sentenceID = id.slice(talker.value.length)
    const sent = this._sentences.get(sentenceID)
    if (sent !== undefined) { return { ...sent, talker } }
    return null
  }

  getFakeSentenceByID (id: string): NMEALike | null {
    if (!StringSchema.is(id) || id.length < NMEA_ID_LENGTH) { return null }
    // No Talker
    const sentence = this._sentences.get(id)
    if (sentence !== undefined) { return createFakeSentence(sentence) }
    // Talker
    const talker = getTalker(id)
    if (talker !== null) {
      const sentenceID = id.slice(talker.value.length)
      const sent = this._sentences.get(sentenceID)
      if (sent !== undefined) { return createFakeSentence(sent, talker.value) }
    }
    return null
  }
}
