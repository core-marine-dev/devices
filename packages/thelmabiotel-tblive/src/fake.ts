// installed
import type { Result } from '@coremarine/protocol-core'

// coded
import { FIRMWARES, TOKENS } from './definitions'
import type { Firmware, SentenceId } from './definitions'

// FAKE SENTENCES ----------------------------------------------------------------------------------------------------
// Fabricate a wire sentence for tests, demos and Node-RED example flows. It is a
// pure function of (id, protocol, options) — **no randomness**, so the same call
// always returns the same string and a fixture cannot drift between runs.
//
// The defaults are the datasheets' OWN example sentences, so a call with no options
// reproduces a document verbatim and can be checked by eye against the PDF
// (`receiver-1.0.1.pdf` §8.2.1 and §8.2.2).
//
// Everything it emits has to parse back cleanly, which constrains the defaults more
// than it looks: a log identifier must contain `sensor` or an 8-field log resolves as
// a detection, a ping serial must be 6-7 digits or the token does not match, and the
// `LM=`/`LI=` values must exist in their tables or the fixture carries no metadata.

// A value the device would send as digits. Accepted as a number or a numeric string,
// because the caller may care about padding (`'001129'` is not `1129`).
type Numeric = number | string

export interface EmitterFakeOptions {
  receiverID?: Numeric
  seconds?: Numeric
  milliseconds?: Numeric
  transmitProtocol?: string
  emitterID?: Numeric
  // `null` asks for the empty field an ID-only transmit protocol produces.
  data?: Numeric | null
  snr?: Numeric
  frequency?: Numeric
  // 1.0.1 only.
  sent?: Numeric
}

export interface ReceiverFakeOptions {
  receiverID?: Numeric
  seconds?: Numeric
  log?: string
  temperature?: Numeric
  noiseAverage?: Numeric
  noisePeak?: Numeric
  frequency?: Numeric
  // 1.0.1 only.
  sent?: Numeric
}

export interface SerialFakeOptions { receiverID?: Numeric }
export interface FrequencyFakeOptions { frequency?: Numeric }
export interface ListeningModeFakeOptions { listeningMode?: string }
export interface LogIntervalFakeOptions { logInterval?: string }
export interface TimeFakeOptions { seconds?: Numeric }
// The fixed-literal sentences have nothing to vary.
export type NoFakeOptions = Record<string, never>

// Keyed by id, so `getFakeSentence('emitter', …)` narrows to the right options.
export interface FakeOptions {
  emitter: EmitterFakeOptions
  receiver: ReceiverFakeOptions
  ping: SerialFakeOptions
  serial_number: SerialFakeOptions
  frequency: FrequencyFakeOptions
  listening_mode: ListeningModeFakeOptions
  log_interval: LogIntervalFakeOptions
  time: TimeFakeOptions
  clock_round: NoFakeOptions
  clock_set: NoFakeOptions
  command: NoFakeOptions
  listening: NoFakeOptions
  firmware: NoFakeOptions
  api: NoFakeOptions
  restart: NoFakeOptions
  reset: NoFakeOptions
  upgrade: NoFakeOptions
}

// The canonical values, straight from `receiver-1.0.1.pdf`.
const DEFAULTS = {
  receiverID: '1000042',
  emitterID: '1285',
  transmitProtocol: 'S64K',
  seconds: '1589557202',
  milliseconds: '615',
  data: '0',
  snr: '24',
  frequency: '69',
  sent: '11',
  // The log example carries its own timestamp, and its identifier MUST contain
  // `sensor` — that is what tells an 8-field log from an 8-field detection.
  logSeconds: '1589557600',
  log: 'TBR Sensor',
  temperature: '297',
  noiseAverage: '15',
  noisePeak: '29',
  logSent: '6',
  // The device's documented defaults (`receiver-1.0.1.pdf` §8.3.3).
  listeningMode: '01',
  logInterval: '02',
} as const

// VALIDATION --------------------------------------------------------------------------------------------------------
// Shape, never plausibility — the rule the parser itself follows. `frequency: 34` is
// accepted even though the device listens 63-77 kHz, because only the deployment
// knows what is valid for a given receiver.
type Check = (value: unknown) => boolean

const isUnsigned: Check = (value) => {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0
  return typeof value === 'string' && /^\d+$/.test(value)
}

const isNumericLike: Check = (value) => (typeof value === 'number') ? Number.isFinite(value) : isUnsigned(value)

const isText: Check = (value) => typeof value === 'string' && value.length > 0

const isUnsignedOrEmpty: Check = (value) => value === null || isUnsigned(value)

// Signed, because the raw temperature can be negative below 5 °C.
const isInteger: Check = (value) => {
  if (typeof value === 'number') return Number.isInteger(value)
  return typeof value === 'string' && /^-?\d+$/.test(value)
}

const ALLOWED: Partial<Record<SentenceId, Record<string, Check | undefined>>> = {
  emitter: {
    receiverID: isNumericLike,
    seconds: isUnsigned,
    milliseconds: isUnsigned,
    transmitProtocol: isText,
    emitterID: isNumericLike,
    data: isUnsignedOrEmpty,
    snr: isUnsigned,
    frequency: isUnsigned,
    sent: isUnsigned,
  },
  receiver: {
    receiverID: isNumericLike,
    seconds: isUnsigned,
    log: isText,
    temperature: isInteger,
    noiseAverage: isUnsigned,
    noisePeak: isUnsigned,
    frequency: isUnsigned,
    sent: isUnsigned,
  },
  ping: { receiverID: isNumericLike },
  serial_number: { receiverID: isNumericLike },
  frequency: { frequency: isUnsigned },
  listening_mode: { listeningMode: isText },
  log_interval: { logInterval: isText },
  time: { seconds: isUnsigned },
}

// `sent` exists only in 1.0.1 sentences, so asking for it on 1.0.2 is a mistake
// worth reporting rather than silently ignoring.
const FIRMWARE_ONLY: Record<string, Firmware | undefined> = { sent: '1.0.1' }

const isKnownFirmware = (value: unknown): value is typeof FIRMWARES[number] =>
  FIRMWARES.includes(value as typeof FIRMWARES[number])

const validateOptions = (id: SentenceId, protocol: Firmware, options: Record<string, unknown>): string[] => {
  const errors: string[] = []
  const allowed = ALLOWED[id] ?? {}
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue
    const check = allowed[key]
    if (check === undefined) {
      errors.push(`Unknown option '${key}' for '${id}'`)
      continue
    }
    if (!check(value)) {
      errors.push(`Invalid option '${key}': ${JSON.stringify(value)}`)
      continue
    }
    const only = FIRMWARE_ONLY[key]
    if (only !== undefined && only !== protocol) {
      errors.push(`Option '${key}' applies to protocol ${only} only`)
    }
  }
  return errors
}

// BUILDING ----------------------------------------------------------------------------------------------------------
const SEPARATOR = ','
const SAMPLE_START = '$'
const SAMPLE_END = '\r'

// `null` becomes the empty field; anything else is stringified exactly as given, so
// a caller's padding survives.
const text = (value: unknown, fallback: string): string => {
  if (value === null) return ''
  return (value === undefined) ? fallback : String(value)
}

const sample = (fields: string[]): string => `${SAMPLE_START}${fields.join(SEPARATOR)}${SAMPLE_END}`

// Builders read an already-validated loose record, which keeps them free of casts.
type Options = Record<string, unknown>

const buildEmitter = (o: Options, protocol: Firmware): string => {
  const fields = [
    text(o.receiverID, DEFAULTS.receiverID),
    text(o.seconds, DEFAULTS.seconds),
    text(o.milliseconds, DEFAULTS.milliseconds),
    text(o.transmitProtocol, DEFAULTS.transmitProtocol),
    text(o.emitterID, DEFAULTS.emitterID),
    text(o.data, DEFAULTS.data),
    text(o.snr, DEFAULTS.snr),
    text(o.frequency, DEFAULTS.frequency),
  ]
  if (protocol === '1.0.1') {
    fields.push(text(o.sent, DEFAULTS.sent))
  }
  return sample(fields)
}

const buildReceiver = (o: Options, protocol: Firmware): string => {
  const fields = [
    text(o.receiverID, DEFAULTS.receiverID),
    text(o.seconds, DEFAULTS.logSeconds),
    text(o.log, DEFAULTS.log),
    text(o.temperature, DEFAULTS.temperature),
    text(o.noiseAverage, DEFAULTS.noiseAverage),
    text(o.noisePeak, DEFAULTS.noisePeak),
    text(o.frequency, DEFAULTS.frequency),
  ]
  if (protocol === '1.0.1') {
    fields.push(text(o.sent, DEFAULTS.logSent))
  }
  return sample(fields)
}

// A minimal help dump. The real one is pages of prose and only its first and last
// lines are load-bearing, so this keeps an interior token on purpose: a good fixture
// must prove the parser does NOT shred the dump into several sentences.
const buildApi = (): string => {
  const spec = TOKENS.find((token) => token.token === 'api')
  return `${spec?.start ?? ''}\n  EX! ---> Exit command mode\n${spec?.end ?? ''}`
}

const BUILDERS: Partial<Record<SentenceId, (options: Options, protocol: Firmware) => string>> = {
  emitter: buildEmitter,
  receiver: buildReceiver,
  ping: (o) => `SN=${text(o.receiverID, DEFAULTS.receiverID)}><>\r`,
  serial_number: (o) => `SN=${text(o.receiverID, DEFAULTS.receiverID)}`,
  firmware: (_o, protocol) => `FV=${protocol}`,
  frequency: (o) => `FC=${text(o.frequency, DEFAULTS.frequency)}`,
  listening_mode: (o) => `LM=${text(o.listeningMode, DEFAULTS.listeningMode)}`,
  log_interval: (o) => `LI=${text(o.logInterval, DEFAULTS.logInterval)}`,
  time: (o) => `UT=${text(o.seconds, DEFAULTS.seconds)}`,
  api: () => buildApi(),
}

// The fixed-literal sentences. `command` genuinely differs by firmware — 1.0.1
// enters command mode with `LIVECM`, 1.0.2 with `TBRC` — which is the clearest
// demonstration of why `protocol` is a mandatory argument rather than an option.
const literalFor = (id: SentenceId, protocol: Firmware): string | undefined => {
  const spec = TOKENS.find((token) =>
    token.id === id && token.kind === 'literal' && (token.firmware === undefined || token.firmware === protocol))
  return spec?.start
}

// Returns a `Result` rather than `null`, so a caller is told WHICH mistake was made:
// an unknown id, an unknown protocol and a malformed option are three different things.
export const createFakeSentence = (
  id: SentenceId,
  protocol: Firmware,
  options: Options = {},
): Result<string, string[]> => {
  const errors: string[] = []
  if (!isKnownFirmware(protocol)) {
    errors.push(`Unknown protocol: ${JSON.stringify(protocol)} — expected one of ${FIRMWARES.join(', ')}`)
  }
  const builder = BUILDERS[id]
  const literal = literalFor(id, protocol)
  if (builder === undefined && literal === undefined) {
    errors.push(`Unknown sentence id: ${JSON.stringify(id)}`)
  }
  errors.push(...validateOptions(id, protocol, options))
  if (errors.length > 0) {
    return { success: false, error: errors }
  }
  const value = (builder !== undefined) ? builder(options, protocol) : literal as string
  return { success: true, value }
}
