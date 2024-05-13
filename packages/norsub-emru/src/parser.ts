import path from 'node:path'
import * as v from 'valibot'
import { MAX_CHARACTERS, NMEAParser } from '@coremarine/nmea-parser'
import type { FieldParsed, NMEALike, NMEASentence, ProtocolOutput, ProtocolsInput, Sentence } from '@coremarine/nmea-parser'
import { getUint32 } from './utils'
import { getStatus } from './status'
import { NorsubSentence } from './types'
import { BooleanSchema } from './schemas'
import { UnsignedIntegerSchema } from '@schemasjs/valibot-numbers'

export class NorsubParser {
  // Parser
  protected _parser: NMEAParser = new NMEAParser()
  // Memory - Buffer
  get memory (): typeof this._parser.memory { return this._parser.memory }
  set memory (mem: boolean) { this._parser.memory = v.parse(BooleanSchema, mem) }
  get bufferLimit (): typeof this._parser.bufferLimit { return this._parser.bufferLimit }
  set bufferLimit (limit: number) { this._parser.bufferLimit = v.parse(UnsignedIntegerSchema, limit) }

  constructor (memory: boolean = true, limit: number = MAX_CHARACTERS) {
    this.memory = memory
    this.bufferLimit = limit
    const NORSUB_FILE = path.join(__dirname, 'norsub.yaml')
    this.addProtocols({ file: NORSUB_FILE })
  }

  private getStatusIndexes (fields: FieldParsed[]): number[] {
    const indexes: number[] = []
    fields.forEach((field, index) => {
      if (field.name.includes('status')) {
        indexes.push(index)
      }
    })
    return indexes
  }

  private addStatus (nmea: NMEASentence): NorsubSentence {
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
    const [indexA, indexB] = indexes
    const statusA = sentence.fields[indexA].data as number
    const statusB = sentence.fields[indexB].data as number
    const status = getStatus({ status_a: statusA, status_b: statusB })
    if (status !== null) {
      const statusNumber = getUint32(statusA, statusB)
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

  parseData (data: string): NorsubSentence[] {
    const sentences = this._parser.parseData(data)
    if (sentences.length === 0) return sentences
    return sentences.map(sentence => {
      if (sentence.protocol.name.includes('NORSUB')) {
        return this.addStatus(sentence)
      }
      return sentence
    })
  }

  addProtocols (protocols: ProtocolsInput): void { this._parser.addProtocols(protocols) }

  getProtocols (): ProtocolOutput[] { return this._parser.getProtocols() }

  getSentence (id: string): Sentence { return this._parser.getSentence(id) }

  getFakeSentenceByID (id: string): NMEALike { return this._parser.getFakeSentenceByID(id) as NMEALike }
}
