// The public surface of @coremarine/sbg-ecom.
//
// CMA types come from the shared core so a consumer never has to depend on two
// packages to read the output — the same re-export the other parsers make.

// installed
export { fromBase64, toBase64, UNKNOWN } from '@coremarine/protocol-core'
export type {
  CMA,
  DeviceParser,
  Field,
  Metadata,
  ParserError,
  Protocol,
  Result,
  SentenceDefinition,
  SentenceMetadata,
  Timestamp,
  TimestampMetadata,
  Type,
  Value,
} from '@coremarine/protocol-core'

// coded
export {
  CLASS_CMD_0,
  CLASS_LOG_ECOM_0,
  CLASS_LOG_ECOM_1,
  CLASS_LOG_NMEA_0,
  CLASS_LOG_NMEA_1,
  CLASS_LOG_THIRD_PARTY_0,
  CLASS_NAMES,
  DEFAULT_FIRMWARE,
  MAXIMAL_DATA_LENGTH,
  MAXIMAL_FRAME_LENGTH,
  NMEA_PROTOCOL_NAME,
  PROTOCOL_NAME,
  UNKNOWN_LOG,
} from './constants'
export { firmwares, isFirmware } from './firmware'
export { SBGParser } from './parser'
export { logId } from './utils'
export type {
  Decoder,
  FakeOptions,
  FieldDefinition,
  LargePage,
  LogDefinition,
  SBGError,
  SBGFieldSpec,
  SBGParserOptions,
  SBGSentenceDefinition,
  SBGType,
} from './types'
