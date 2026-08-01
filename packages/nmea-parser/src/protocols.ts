// installed
import type { Result } from '@coremarine/protocol-core'
// NAMED import: js-yaml 5 removed the default export. It also defaults `load` to the
// YAML 1.2 CORE schema, which drops the YAML 1.1 types and `!!merge` — verified safe
// here, because the protocol files use only plain strings and booleans, and every
// generated knowledge base is byte-identical across the 4.x -> 5.x bump.
import { load } from 'js-yaml'

// coded
import { ProtocolsFileContentSchema } from './schemas'
import type { MapStoredSentences, NMEAError, Protocol, ProtocolsFileContent, StoredSentence } from './types'

// Parse a protocols YAML string into the validated knowledge model. Web-safe:
// callers pass the file's text (read it yourself on the server; `await file.text()` on the web).
// Never throws — malformed YAML or an invalid schema come back as a Result error.
export const parseProtocols = (content: string): Result<ProtocolsFileContent, NMEAError[]> => {
  let data: unknown
  try {
    data = load(content)
  } catch (error) {
    return { success: false, error: [{ kind: 'invalid-yaml', message: (error as Error).message }] }
  }
  const parsed = ProtocolsFileContentSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: [{ kind: 'invalid-schema', message: parsed.errors?.toString() ?? 'invalid protocols schema' }] }
  }
  return { success: true, value: parsed.value }
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
