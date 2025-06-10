import * as v from 'valibot'
import { ValibotValidator } from '@schemasjs/validator'
import { FIRMWARES_AVAILABLE, FREQUENCY_MAX, FREQUENCY_MIN, LOG_INTERVAL_MAX, LOG_INTERVAL_MIN, MODES, PING_END, PING_LENGTH_MAX, PING_LENGTH_MIN, PING_START, PROTOCOLS } from './constants'
// COMMONS
const ValibotStringSchema = v.string()
export const StringSchema = ValibotValidator<v.InferInput<typeof ValibotStringSchema>>(ValibotStringSchema)

const ValibotBooleanSchema = v.boolean()
export const BooleanSchema = ValibotValidator<v.InferInput<typeof ValibotBooleanSchema>>(ValibotBooleanSchema)

const ValibotNaturalSchema = v.pipe(
  v.number('It should be a number'),
  v.integer('It should be an integer'),
  v.minValue(0, 'It should be a positive integer number greater or equal to 0')
)
export const NaturalSchema = ValibotValidator<v.InferInput<typeof ValibotNaturalSchema>>(ValibotNaturalSchema)

// HARDWARE
const ValibotSerialNumberSchema = v.pipe(
  v.string('SerialNumber: It should be a string'),
  v.minLength(6, 'SerialNumber: It should have at least 6 digits'),
  v.maxLength(7, 'SerialNumber: It should have 7 digits at most'),
  v.check(
    (input: string) => {
      const num = Number(input)
      return !Number.isNaN(num) && Number.isInteger(num) && num > -1
    },
    'SerialNumber: It should be a positive integer string number'
  )
)
export const SerialNumberSchema = ValibotValidator<v.InferInput<typeof ValibotSerialNumberSchema>>(ValibotSerialNumberSchema)

const ValibotFrequencySchema = v.pipe(
  v.number('Frequency: It should be a number'),
  v.integer('Frequency: It should be an integer'),
  v.minValue(63, 'Frequency: It should greater equal to 63'),
  v.maxValue(77, 'Frequency: It should lesser equal to 77')
)
export const FrequencySchema = ValibotValidator<v.InferInput<typeof ValibotFrequencySchema>>(ValibotFrequencySchema)

// const FirmwareSchema = v.picklist(FIRMWARES_AVAILABLE, 'Firmware: It should be "1.0.1" or "1.0.2"')
const ValibotFirmwareSchema = v.pipe(
  v.string(),
  v.check(
    input => FIRMWARES_AVAILABLE.some(fw => input.includes(fw)),
    `Firmware: available firmwares are ${FIRMWARES_AVAILABLE.toString()}`
  )
)
export const FirmwareSchema = ValibotValidator<v.InferInput<typeof ValibotFirmwareSchema>>(ValibotFirmwareSchema)

const ValibotModeSchema = v.picklist(MODES, 'Mode: It should be "listening" or "command" or "update"')
export const ModeSchema = ValibotValidator<v.InferInput<typeof ValibotModeSchema>>(ValibotModeSchema)

const ValibotEmitterSchema = v.object({
  serialNumber: ValibotSerialNumberSchema,
  frequency: ValibotFrequencySchema
})
export const EmitterSchema = ValibotValidator<v.InferInput<typeof ValibotEmitterSchema>>(ValibotEmitterSchema)

const ValibotEmittersSchema = v.pipe(
  v.array(ValibotEmitterSchema),
  v.minLength(1, 'Receiver: It should be at least one emitter'),
  v.maxLength(3, 'Receiver: It should be only three emitters as maximum'),
  v.check(
    emitters => ((emitters === undefined) ? true : new Set(emitters.map(emitter => emitter.serialNumber)).size === emitters.length),
    'Receiver: All emitters serial number should be different between them'
  ),
  v.check(
    emitters => ((emitters === undefined) ? true : new Set(emitters.map(emitter => emitter.frequency)).size === emitters.length),
    'Receiver: All emitters frequencies should be different between them'
  ),
  v.check(
    emitters => ((emitters === undefined) ? true : emitters.map(emitter => emitter.frequency).every(freq => (freq >= FREQUENCY_MIN) && (freq <= FREQUENCY_MAX))),
    `Receiver: All emitters frequencies should be between ${FREQUENCY_MIN} and ${FREQUENCY_MAX} kHz`)
)
export const EmittersSchema = ValibotValidator<v.InferInput<typeof ValibotEmittersSchema>>(ValibotEmittersSchema)

const ValibotReceiverSchema = v.pipe(
  v.object({
    serialNumber: ValibotSerialNumberSchema,
    frequency: ValibotFrequencySchema,
    firmware: ValibotFirmwareSchema,
    mode: v.optional(ValibotModeSchema),
    emitters: v.optional(ValibotEmittersSchema)
  }),
  v.check(
    ({ frequency, emitters }) => (
      (emitters === undefined)
        ? true
        : emitters.map(emitter => emitter.frequency).filter(freq => [frequency - 2, frequency, frequency + 2].includes(freq)).length === emitters.length
    ),
    'Receiver: All emitters frequencies should be equal to TB-Live frequency or ± 2 kHz'
  )
)
export const ReceiverSchema = ValibotValidator<v.InferInput<typeof ValibotReceiverSchema>>(ValibotReceiverSchema)
// FRAMES
const ValibotPingResponseInputSchema = v.pipe(
  v.string(),
  v.startsWith(PING_START, `PingResponse: It should start with ${PING_START}`),
  v.endsWith(PING_END, `PingResponse: It should end with ${PING_END}`),
  v.minLength(PING_LENGTH_MIN, `PingResponse: It should have a minimal length of ${PING_LENGTH_MIN}`),
  v.maxLength(PING_LENGTH_MAX, `PingResponse: It should have a maximal length of ${PING_LENGTH_MAX}`),
  v.check(
    input => {
      const sn = ((input.split(PING_START))[1].split(PING_END))[0]
      return v.is(ValibotSerialNumberSchema, sn)
    },
    'PingResponse: It should contain a valid serial number'
  )
)
export const PingResponseInputSchema = ValibotValidator<v.InferInput<typeof ValibotPingResponseInputSchema>>(ValibotPingResponseInputSchema)

const ValibotPingResponseOutputSchema = v.pipe(
  ValibotPingResponseInputSchema,
  v.transform(
    (input: string) => {
      const sn = ((input.split(PING_START))[1].split(PING_END))[0]
      return v.parse(ValibotSerialNumberSchema, sn)
    }
  )
)
export const PingResponseOutputSchema = ValibotValidator<v.InferInput<typeof ValibotPingResponseOutputSchema>>(ValibotPingResponseOutputSchema)

const ValibotLogIntervalSchema = v.pipe(
  v.string(),
  v.check(input => !isNaN(Number(input)), 'Log Interval: it is not a number'),
  v.check(input => Number.isInteger(Number(input)), 'Log Interval: it is not an integer'),
  v.check(input => Number(input) >= LOG_INTERVAL_MIN, `Log Interval: interval should be greater equal to ${LOG_INTERVAL_MIN}`),
  v.check(input => Number(input) <= LOG_INTERVAL_MAX, `Log Interval: interval should be less equal to ${LOG_INTERVAL_MAX}`)
)
export const LogIntervalSchema = ValibotValidator<v.InferInput<typeof ValibotLogIntervalSchema>>(ValibotLogIntervalSchema)

const ValibotProtocolSchema = v.pipe(
  v.string(),
  v.check(input => !isNaN(Number(input)), 'it is not a number'),
  v.check(input => Number.isInteger(Number(input)), 'it is not an integer'),
  v.check(input => input in PROTOCOLS, 'invalid listenning mode protocol')
)
export const ProtocolSchema = ValibotValidator<v.InferInput<typeof ValibotProtocolSchema>>(ValibotProtocolSchema)

// const ValibotTimestampSchema = v.pipe(
//   v.string(),
//   v.length(TIMESTAMP_LENGTH, 'invalid length for timestamp'),
//   v.check(input => !isNaN(Number(input)), 'it is not a string-number'),
//   v.check(input => Number.isInteger(Number(input)), 'it is not a string-integer'),
//   v.check(input => Number(input) >= 0, 'it is not a string-integer positive')
// )
const ValibotTimestampSchema = v.pipe(
  v.number(),
  v.integer('Timestamp: It should be an integer'),
  v.minValue(0, 'Timestamp: It should be a positive integer'),
  v.maxValue(Math.pow(2, 32), `Timestamp: It should be a positive integer less than ${Math.pow(2, 32) + 1}`)
)
export const TimestampSchema = ValibotValidator<v.InferInput<typeof ValibotTimestampSchema>>(ValibotTimestampSchema)
