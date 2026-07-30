// coded
export { LOG_INTERVALS, PROTOCOLS } from './constants'
export { FIRMWARES, MODES, PROTOCOL_NAME, SENTENCE_IDS } from './definitions'
export type { Firmware, Mode, SentenceId } from './definitions'
export type {
  EmitterFakeOptions,
  FakeOptions,
  FrequencyFakeOptions,
  ListeningModeFakeOptions,
  LogIntervalFakeOptions,
  NoFakeOptions,
  ReceiverFakeOptions,
  SerialFakeOptions,
  TimeFakeOptions,
} from './fake'
export type { SentenceDefinition } from './introspect'
export { TBLiveParser } from './parser'
export type { TBLiveOptions } from './parser'

// `@coremarine/protocol-core` is private and unpublished, so anything a consumer
// needs from it has to be re-exported here.
export type { CMA, DeviceParser, DraftCMA, Field, Metadata, Result, Timestamp, Type, Value } from '@coremarine/protocol-core'
export { UNKNOWN } from '@coremarine/protocol-core'
