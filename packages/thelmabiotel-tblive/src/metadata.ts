// installed
import { UNKNOWN } from '@coremarine/protocol-core'
import type { Field, Metadata } from '@coremarine/protocol-core'

// coded
import { LOG_INTERVALS, PROTOCOLS } from './constants'
import type { SentenceId } from './definitions'

// METADATA ----------------------------------------------------------------------------------------------------------
// Two levels, both optional extras on top of the mandatory field values:
//
//   * FIELD level (`payload[i].metadata`) — one field decoded into a richer form.
//   * PAYLOAD level (`metadata.payload`) — values aggregated from several fields,
//     AND a deliberate mirror of the facts that identify the device.
//
// The mirroring is redundant on purpose. Nobody can guarantee which firmware a
// production TB Live runs, and the firmwares differ in field count and order, so
// a consumer needs ONE fixed read path for the key facts. Swap a 1.0.1 unit for a
// 1.0.2 and nothing downstream changes. Same rule the NorSub status word uses.
//
// What is NOT here: any interpretation of the emitter `data` field. Those 16 bits
// carry a CoreMarine encoding (inclination, tilt + depth, ...) rather than
// anything the TB Live protocol defines, so decoding them belongs to the consumer.

// Aggregators read fields BY INDEX, never by name: field names are ours and may
// change, whereas the position of a field in a sentence is fixed by the protocol.
const at = (payload: Field[], index: number): Field | undefined => payload[index]

const raw = (payload: Field[], index: number): string | undefined => at(payload, index)?.raw

const numeric = (payload: Field[], index: number): number | undefined => {
  const value = at(payload, index)?.value
  return (typeof value === 'number') ? value : undefined
}

const text = (payload: Field[], index: number): string | undefined => {
  const value = at(payload, index)?.value
  return (typeof value === 'string') ? value : undefined
}

// Attach field-level metadata in place. Every caller has already established that
// the field decoded, so there is no null check here — only the bounds check the
// type system needs.
const attach = (payload: Field[], index: number, metadata: Metadata): void => {
  const field = at(payload, index)
  if (field !== undefined) {
    field.metadata = metadata
  }
}

// The datasheet's own bands: 6 is a very weak signal, 25 and above is strong.
const SNR_WEAK = 6
const SNR_STRONG = 25

const snrMetadata = (value: number): Metadata => {
  if (value > SNR_STRONG) return { raw: value, signal: 'strong' }
  if (value > SNR_WEAK) return { raw: value, signal: 'regular' }
  return { raw: value, signal: 'weak' }
}

// (raw - 50) / 10 -> degrees Celsius, per the datasheet.
const TEMPERATURE_OFFSET = 50
const TEMPERATURE_FACTOR = 10
const DECIMALS = 1

const temperatureMetadata = (value: number): Metadata => ({
  raw: value,
  celsius: Number.parseFloat(((value - TEMPERATURE_OFFSET) / TEMPERATURE_FACTOR).toFixed(DECIMALS)),
})

const MILLISECONDS = 1000

// The device's OWN time, published as data rather than as a claim.
//
// It is deliberately NOT promoted to `metadata.timestamp.sentence`: the two
// datasheets disagree about what the clock reads when unset (1.0.1 says seconds
// since power up, 1.0.2 says it resets to 1 Jan 2000), and nothing on the wire
// says which firmware is answering — so whether these numbers are a date or an
// uptime cannot be decided here. `total_milliseconds` is plain arithmetic on the
// two fields, provided because composing them is easy to get wrong: the old parser
// CONCATENATED the digits, so a device sending `,50,` yielded 1974 instead of 2020.
// No ISO date is offered, because that is what made a meaningless value look
// authoritative.
const timeFields = (seconds: number, milliseconds?: number): Metadata => {
  const offset = milliseconds ?? 0
  const time: Metadata = { seconds, total_milliseconds: seconds * MILLISECONDS + offset }
  if (milliseconds !== undefined) {
    time.milliseconds = milliseconds
  }
  return time
}

// Detection: receiver serial (0), emitter serial (4), snr (6).
const emitterMetadata = (payload: Field[]): Metadata => {
  const snr = numeric(payload, 6)
  if (snr !== undefined) {
    attach(payload, 6, snrMetadata(snr))
  }
  const mirror: Metadata = {
    receiver: text(payload, 0) ?? UNKNOWN,
    emitter: text(payload, 4) ?? UNKNOWN,
  }
  const seconds = numeric(payload, 1)
  if (seconds !== undefined) {
    // An absent millisecond field composes as 000. The substitution stays visible:
    // `payload[2].value` is still `null`, so a consumer can tell a device that sent
    // nothing from one that genuinely sent zero.
    mirror.time = timeFields(seconds, numeric(payload, 2) ?? 0)
  }
  if (snr !== undefined) {
    mirror.snr = snrMetadata(snr)
  }
  return mirror
}

// Log: receiver serial (0), temperature (3), average (4) and peak (5) noise.
const receiverMetadata = (payload: Field[]): Metadata => {
  const temperature = numeric(payload, 3)
  if (temperature !== undefined) {
    attach(payload, 3, temperatureMetadata(temperature))
  }
  const mirror: Metadata = { receiver: text(payload, 0) ?? UNKNOWN }
  const seconds = numeric(payload, 1)
  if (seconds !== undefined) {
    mirror.time = timeFields(seconds)
  }
  if (temperature !== undefined) {
    mirror.temperature = temperatureMetadata(temperature)
  }
  // Genuinely aggregated from two fields — the original reason payload metadata
  // exists, as opposed to the mirroring above.
  const average = numeric(payload, 4)
  const peak = numeric(payload, 5)
  if (average !== undefined || peak !== undefined) {
    mirror.noise = { average, peak }
  }
  return mirror
}

const serialMetadata = (payload: Field[]): Metadata => ({ receiver: text(payload, 0) ?? UNKNOWN })

// `LM=nn` — which transmit protocols are active, and over how many channels.
const listeningModeMetadata = (payload: Field[]): Metadata | undefined => {
  const key = raw(payload, 0)
  const protocols = (key === undefined) ? undefined : PROTOCOLS[key]
  if (protocols === undefined) return undefined
  attach(payload, 0, { ...protocols })
  return { ...protocols }
}

// `LI=nn` — the sensor log interval as a human label.
const logIntervalMetadata = (payload: Field[]): Metadata | undefined => {
  const key = raw(payload, 0)
  const interval = (key === undefined) ? undefined : LOG_INTERVALS[key as keyof typeof LOG_INTERVALS]
  if (interval === undefined) return undefined
  attach(payload, 0, { interval })
  return { interval }
}

// `UT=…` — the same stance as the sample time above: report the number, do not
// decide whether it is a date or an uptime.
const timeMetadata = (payload: Field[]): Metadata | undefined => {
  const seconds = numeric(payload, 0)
  if (seconds === undefined) return undefined
  const decoded = timeFields(seconds)
  attach(payload, 0, decoded)
  return decoded
}

type Aggregator = (payload: Field[]) => Metadata | undefined

const AGGREGATORS: Partial<Record<SentenceId, Aggregator>> = {
  emitter: emitterMetadata,
  receiver: receiverMetadata,
  ping: serialMetadata,
  serial_number: serialMetadata,
  listening_mode: listeningModeMetadata,
  log_interval: logIntervalMetadata,
  time: timeMetadata,
}

// Returns the payload-level metadata for a sentence, and attaches field-level
// metadata to `payload` in place. Returns `undefined` when the sentence has none.
export const aggregate = (id: SentenceId | typeof UNKNOWN, payload: Field[]): Metadata | undefined => {
  const aggregator = AGGREGATORS[id as SentenceId]
  if (aggregator === undefined) return undefined
  const metadata = aggregator(payload)
  return (metadata === undefined || Object.keys(metadata).length === 0) ? undefined : metadata
}
