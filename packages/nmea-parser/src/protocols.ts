
import fs from 'node:fs'
import yaml from 'js-yaml'
import { ProtocolsFileSchema, StringSchema } from './schemas'
import type { Protocol, ProtocolOutput, ProtocolsFile, StoredSentence, StoredSentences } from './types'

export const readProtocolsString = (content: string): ProtocolsFile => {
  const fileData = yaml.load(content)
  return ProtocolsFileSchema.parse(fileData)
}

export const readProtocolsFile = (file: string): ProtocolsFile => {
  const filename = StringSchema.parse(file)
  const content = fs.readFileSync(filename, 'utf-8')
  return readProtocolsString(content)
}

const getStoreSentencesFromProtocol = (protocol: Protocol): StoredSentences => {
  const { protocol: name, standard, version, sentences } = protocol
  const storedSentences: StoredSentences = new Map()
  sentences.forEach(element => {
    const obj: StoredSentence = {
      sentence: element.sentence,
      fields: element.fields,
      protocol: { name, standard, version },
      description: element?.description
    }
    storedSentences.set(element.sentence, obj)
  })
  return storedSentences
}

export const getStoreSentences = ({ protocols }: ProtocolsFile): StoredSentences => {
  let storedSentences: StoredSentences = new Map()
  protocols.forEach(protocol => {
    storedSentences = new Map([...storedSentences, ...getStoreSentencesFromProtocol(protocol)])
  })
  return storedSentences
}

export const getSentencesByProtocol = (storedSentences: StoredSentences): ProtocolOutput[] => {
  const mapProtocols = new Map<string, ProtocolOutput>()
  storedSentences.forEach((value, key) => {
    const mapKey = (value.protocol.version !== undefined) ? `${value.protocol.name}_${value.protocol?.version}` : value.protocol.name
    const object = mapProtocols.get(mapKey) ?? {
      protocol: value.protocol.name,
      version: value.protocol?.version,
      sentences: [key]
    }
    if (!object.sentences.includes(key)) {
      object.sentences.push(key)
    }
    mapProtocols.set(mapKey, object)
  })
  return Array.from(mapProtocols.values())
}
