import yaml from 'js-yaml'
import fs from 'node:fs'
import { ProtocolsFileContentSchema, StringSchema } from './schemas'
import type { MapStoredSentences, Protocol, ProtocolsFileContent, StoredSentence } from './types'

export const readProtocolsYAMLString = (content: string): ProtocolsFileContent => {
  const fileData = yaml.load(content)
  const parsed = ProtocolsFileContentSchema.safeParse(fileData)
  if (!parsed.success) {
    throw new Error(parsed.errors?.toString())
  }
  return parsed.value
  // Valibot version to debug
  // const parsed = safeParse(ValibotProtocolsFileContentSchema, fileData)
  // if (parsed.success) { return parsed.output }
  // throw new Error(parsed.issues?.toString())
}

export const readProtocolsYAMLFile = (file: string): ProtocolsFileContent => {
  const filename = StringSchema.parse(file)
  const content = fs.readFileSync(filename, 'utf-8')
  return readProtocolsYAMLString(content)
}

const getStoreSentencesFromProtocol = (protocol: Protocol): MapStoredSentences => {
  const { protocol: name, standard, version, sentences } = protocol
  const storedSentences: MapStoredSentences = new Map()
  for (const element of sentences) {
    const obj: StoredSentence = {
      id: element.id,
      payload: element.payload,
      protocol: { name, standard, version },
      description: element?.description
    }
    storedSentences.set(element.id, obj)
  }
  return storedSentences
}

export const getStoreSentences = ({ protocols }: ProtocolsFileContent): MapStoredSentences => {
  let storedSentences: MapStoredSentences = new Map()
  for (const protocol of protocols) {
    storedSentences = new Map([...storedSentences, ...getStoreSentencesFromProtocol(protocol)])
  }
  return storedSentences
}
