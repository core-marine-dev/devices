import type { Field, NMEASentence, Uint16, Uint32 } from '@coremarine/nmea-parser'
import { MAX_CHARACTERS, NMEAParser, ProtocolsInputSchema } from '@coremarine/nmea-parser'
import { NORSUB_SENTENCES } from './norsub'
import { getStatus } from './status'
import { StatusInput } from './types'

export class NorsubParser extends NMEAParser {
  constructor (memory: boolean = true, limit: number = MAX_CHARACTERS) {
    super(memory, limit)
    const parsed = ProtocolsInputSchema.parse(NORSUB_SENTENCES)
    this.addProtocols(parsed)
  }

  private addStatus (sentence: NMEASentence): NMEASentence {
    const input: StatusInput = sentence.id.includes('b')
      ? { status_a: sentence.payload.at(-2)?.value as Uint16, status_b: sentence.payload.at(-1)?.value as Uint16 }
      : { status: sentence.payload.at(-1)?.value as Uint32 }
    const status = getStatus(input)
    sentence.metadata = { status }
    if (input.status !== undefined) {
      (sentence.payload.at(-1) as Field).metadata = { status }
    }
    return sentence
  }

  parseData (data: string): NMEASentence[] {
    const sentences = super.parseData(data)
    if (sentences.length === 0) return sentences
    return sentences.map(sentence => {
      if (sentence.id.includes('PNORSUB')) {
        return this.addStatus(sentence)
      }
      return sentence
    })
  }
}
