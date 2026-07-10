// installed
import yaml from 'js-yaml'

// coded
import { ProtocolsFileContentSchema } from './schemas'
import type { MapStoredSentences, Protocol, ProtocolsFileContent, StoredSentence } from './types'

// Parse a protocols YAML string into the validated knowledge model. Web-safe:
// callers pass the file's text (read it yourself on the server; `await file.text()` on the web).
export const parseProtocols = (content: string): ProtocolsFileContent => {
  const data = yaml.load(content)
  const parsed = ProtocolsFileContentSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.errors?.toString())
  }
  return parsed.value
}

const storedSentencesFromProtocol = (protocol: Protocol): StoredSentence[] => {
  const { protocol: name, standard, version, sentences } = protocol
  return sentences.map((element) => ({
    id: element.id,
    payload: element.payload,
    protocol: { name, standard, version },
    description: element?.description,
  }))
}

// Build the in-memory knowledge base: id -> definitions. Multiple definitions
// per id are appended (same id can differ in field count across versions).
export const getStoredSentences = ({ protocols }: ProtocolsFileContent): MapStoredSentences => {
  const store: MapStoredSentences = new Map()
  for (const protocol of protocols) {
    for (const sentence of storedSentencesFromProtocol(protocol)) {
      const definitions = store.get(sentence.id) ?? []
      definitions.push(sentence)
      store.set(sentence.id, definitions)
    }
  }
  return store
}
