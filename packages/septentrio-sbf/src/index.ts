// coded
export { DEFAULT_FIRMWARE, PROTOCOL_NAME } from './constants'
export { decodeBody } from './engine'
export { createFakeFrame } from './fake'
export { blocksFor, firmwares, isFirmware } from './firmware'
export { SeptentrioParser } from './parser'
export { SeptentrioNMEAParser } from './protocol-nmea'
export { SBFParser } from './protocol-sbf'
export { SEPTENTRIO_PROTOCOLS } from './types'
export type {
  BlockDefinition,
  BlockRegistry,
  DecodedBody,
  Decoder,
  FakeOptions,
  FieldDefinition,
  FieldSpec,
  SBFError,
  SBFParserOptions,
  SBFSentenceDefinition,
  SBFType,
  ScalarDefinition,
  ScalarSpec,
  SeptentrioParserOptions,
  SeptentrioProtocol,
  SubBlockDefinition,
  SubBlockSpec,
  TimestampKind,
} from './types'

// `@coremarine/protocol-core` is private and unpublished, so anything a consumer
// needs from it has to be re-exported here.
export { fromBase64, toBase64, UNKNOWN } from '@coremarine/protocol-core'
export type { CMA, DeviceParser, Field, Metadata, ParserError, Result, SentenceDefinition, Timestamp, Type, Value } from '@coremarine/protocol-core'
