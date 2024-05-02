import path from 'node:path'
import { NMEAParser } from '@coremarine/nmea-parser'
import { FieldParsed, NMEALike, NMEASentence, ProtocolOutput, ProtocolsInput, Sentence } from '@coremarine/nmea-parser/lib/types'
import { BooleanSchema, NaturalSchema } from '@coremarine/nmea-parser/lib/schemas'
import { MAX_CHARACTERS } from '@coremarine/nmea-parser/lib/constants'
import { getUint32 } from './utils'
import { getStatus } from './status'
import { NorsubSentence } from './types'

export class NorsubParser {
  // Parser
  protected _parser: NMEAParser = new NMEAParser()
  // Memory - Buffer
  get memory() { return this._parser.memory }
  set memory(mem: boolean) { this._parser.memory = BooleanSchema.parse(mem) }
  get bufferLimit() { return this._parser.bufferLimit }
  set bufferLimit(limit: number) { this._parser.bufferLimit = NaturalSchema.parse(limit) }

  constructor(memory: boolean = true, limit: number = MAX_CHARACTERS) {
    this.memory = memory
    this.bufferLimit = limit
    const NORSUB_FILE = path.join(__dirname, 'norsub.yaml')
    this.addProtocols({ file: NORSUB_FILE })
  }

  private getStatusIndexes(fields: FieldParsed[]): number[] {
    let indexes: number[] = []
    fields.forEach((field, index) => {
      if (field.name.includes('status')) {
        indexes.push(index)
      }
    })
    return indexes
  }

  private addStatus(nmea: NMEASentence): NorsubSentence {
    const indexes: number[] = this.getStatusIndexes(nmea.fields)
    const numberOfIndex = indexes.length
    if (![1, 2].includes(numberOfIndex)) { return nmea }
    const sentence: NorsubSentence = { ...nmea }
    // Status
    if (numberOfIndex === 1) {
      const index = indexes[0]
      const data = sentence.fields[index].data as number
      const status = getStatus({ status: data })
      if (status !== null) {
        sentence.fields[index].metadata = status
      }
      return sentence
    }
    // Status_A + Status_B
    const [index_a, index_b] = indexes
    const status_a = sentence.fields[index_a].data as number
    const status_b = sentence.fields[index_b].data as number
    const status = getStatus({ status_a, status_b })
    if (status !== null) {
      const statusNumber = getUint32(status_a, status_b)
      sentence.data.push(statusNumber)
      sentence.fields.push({
        name: 'status',
        type: 'uint32',
        data: statusNumber,
        metadata: status
      })
    }
    return sentence
  }

  parseData(data: string): NorsubSentence[] {
    const sentences = this._parser.parseData(data)
    if (sentences.length === 0) return sentences
    return sentences.map(sentence => {
      if (sentence.protocol.name.includes('NORSUB')) {
        return this.addStatus(sentence)
      }
      return sentence
    })
  }

  addProtocols(protocols: ProtocolsInput): void { this._parser.addProtocols(protocols) }
  
  getProtocols(): ProtocolOutput[] { return this._parser.getProtocols() }

  getSentence(id: string): Sentence { return this._parser.getSentence(id) }

  getFakeSentenceByID(id: string): NMEALike | null { return this._parser.getFakeSentenceByID(id) }
}
