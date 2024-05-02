import * as v from 'valibot'
import { FIRMWARES_AVAILABLE, FREQUENCY_MAX, FREQUENCY_MIN, MODES, PING_END, PING_LENGTH_MAX, PING_LENGTH_MIN, PING_START } from './constants'
// COMMONS
export const StringSchema = v.string()
export const StringArraySchema = v.array(StringSchema)
export const BooleanSchema = v.boolean()
export const NumberSchema = v.number()

// HARDWARE
export const SerialNumberSchema = v.string('SerialNumber: It should be a string', [
  v.custom((input: string) => {
    const num = Number(input)
    return !Number.isNaN(num) && Number.isInteger(num) && num > -1
  }, 'SerialNumber: It should be a positive integer string number'),
  v.minLength(6, 'SerialNumber: It should have at least 6 digits'),
  v.maxLength(7, 'SerialNumber: It should have 7 digits at most')
])

export const FrequencySchema = v.number(
  'Frequency: It should be a number',
  [
    v.integer('Frequency: It should be an integer'),
    v.minValue(63, 'Frequency: It should greater equal to 63'),
    v.maxValue(77, 'Frequency: It should lesser equal to 77')
  ])

// export const FirmwareSchema = v.picklist(FIRMWARES_AVAILABLE, 'Firmware: It should be "1.0.1" or "1.0.2"')
export const FirmwareSchema = v.string([
  v.custom(input => FIRMWARES_AVAILABLE.some(fw => input.includes(fw)), `Firmware: available firmwares are ${FIRMWARES_AVAILABLE.toString()}`)
])

export const ModeSchema = v.picklist(MODES, 'Mode: It should be "listening" or "command" or "update"')


export const EmitterSchema = v.object({
  serialNumber: SerialNumberSchema,
  frequency: FrequencySchema
})

export const ReceiverSchema = v.object(
  {
    serialNumber: SerialNumberSchema,
    frequency: FrequencySchema,
    firmware: FirmwareSchema,
    mode: v.optional(ModeSchema),
    emitters: v.optional(v.array(EmitterSchema, [
      v.minLength(1, 'Receiver: It should be at least one emitter'),
      v.maxLength(3, 'Receiver: It should be only three emitters as maximum')
    ]))
  },
  [
    v.forward(
      v.custom(
        ({ emitters }) => ((emitters === undefined)
          ? true :
          new Set(emitters.map(emitter => emitter.serialNumber)).size === emitters.length),
        'Receiver: All emitters serial number should be different between them'
      ),
      ['emitters']
    ),
    v.forward(
      v.custom(
        ({ emitters }) => ((emitters === undefined)
          ? true
          : new Set(emitters.map(emitter => emitter.frequency)).size === emitters.length),
        'Receiver: All emitters frequencies should be different between them'
      ),
      ['emitters']
    ),
    v.forward(
      v.custom(
        ({ emitters }) => ((emitters === undefined)
          ? true
          : emitters.map(emitter => emitter.frequency).every(freq => (freq >= FREQUENCY_MIN) && (freq <= FREQUENCY_MAX))),
        `Receiver: All emitters frequencies should be between ${FREQUENCY_MIN} and ${FREQUENCY_MAX} kHz`),
      ['emitters']
    ),
    v.forward(
      v.custom(
        ({ frequency, emitters }) => ((emitters === undefined)
          ? true
          : emitters.map(emitter => emitter.frequency).filter(freq => [frequency - 2, frequency, frequency + 2].includes(freq)).length === emitters.length),
        'Receiver: All emitters frequencies should be equal to TB-Live frequency or ± 2 kHz'),
      ['emitters']
    )
  ]
)
// FRAMES
export const PingResponseInputSchema = v.string([
  v.startsWith(PING_START, `PingResponse: It should start with ${PING_START}`),
  v.endsWith(PING_END, `PingResponse: It should end with ${PING_END}`),
  v.minLength(PING_LENGTH_MIN, `PingResponse: It should have a minimal length of ${PING_LENGTH_MIN}`),
  v.maxLength(PING_LENGTH_MAX, `PingResponse: It should have a maximal length of ${PING_LENGTH_MAX}`),
  v.custom(input => {
    const sn = ((input.split(PING_START))[1].split(PING_END))[0]
    return v.safeParse(SerialNumberSchema, sn).success
  }, 'PingResponse: It should contain a valid serial number')
])

export const PingResponseOutputSchema = v.transform(
  PingResponseInputSchema,
  (input: string) => {
    const sn = ((input.split(PING_START))[1].split(PING_END))[0]
    return v.parse(SerialNumberSchema, sn)
  }
)
