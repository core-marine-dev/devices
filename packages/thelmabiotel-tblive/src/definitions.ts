// installed
import { UNKNOWN } from '@coremarine/protocol-core'
import type { Type } from '@coremarine/protocol-core'

// The protocol has no name of its own — TB Live is the receiver, so we use it for
// the protocol too. Its `version` is the device FIRMWARE, because the firmware is
// what changes the wire format: 1.0.1 detections carry 9 fields and logs 8, while
// 1.0.2 carries 8 and 7.
export const PROTOCOL_NAME = 'TBLive'

export const FIRMWARES = ['1.0.1', '1.0.2'] as const
export type Firmware = typeof FIRMWARES[number] | typeof UNKNOWN

// Which of the device's APIs a sentence belongs to — NOT the state the device is
// left in. `LIVECM` is a listening-mode command that ENTERS command mode, and
// `EX!` is a command-mode action that RESUMES listening, so the two look like
// opposites on purpose: `id` says what the sentence enables, `mode` says which
// API it came from.
export const MODES = ['listening', 'command', 'update'] as const
export type Mode = typeof MODES[number] | typeof UNKNOWN

export const SENTENCE_IDS = [
  // listening API
  'emitter', 'receiver', 'ping', 'clock_round', 'clock_set', 'command',
  // command API
  'listening', 'serial_number', 'firmware', 'frequency', 'listening_mode',
  'log_interval', 'time', 'api', 'restart', 'reset',
  // update API
  'upgrade',
] as const
export type SentenceId = typeof SENTENCE_IDS[number]

// What a payload slot means. Ranges live in `description`, never in validation:
// the parser reports structural and type problems, it does not judge whether a
// value is plausible — that belongs to the consumer, which knows the deployment.
export interface FieldSpec {
  name: string
  type: Type
  units?: string
  description?: string
}

// Identifiers are `string`, never numeric. The firmware pads inconsistently
// (sometimes leading zeros, sometimes a prepended 1) and the docs disagree on
// whether a serial is 6 or 7 characters, so `Number()` would destroy the very
// evidence needed to tell devices apart. Consumers match on the last digits.
const RECEIVER_SERIAL: FieldSpec = {
  name: 'receiver_serial_number',
  type: 'string',
  description: 'TB Live serial number exactly as sent — padding is preserved',
}

const SECONDS: FieldSpec = {
  name: 'seconds',
  type: 'uint32',
  units: 's',
  description: 'Seconds since Epoch, or since power up when the clock has not been set',
}

// Present in 1.0.1 sentences only.
const SENT: FieldSpec = {
  name: 'sent',
  type: 'uint32',
  description: 'Number of strings sent since power up',
}

const DETECTION_FIELDS: FieldSpec[] = [
  RECEIVER_SERIAL,
  SECONDS,
  { name: 'milliseconds', type: 'uint16', units: 'ms', description: 'Millisecond part of the timestamp. The device does not always zero-pad it, so compose a time arithmetically rather than by concatenating the digits' },
  { name: 'transmit_protocol', type: 'string', description: 'Emitter transmit protocol, e.g. S64K, R01M, HS256' },
  { name: 'emitter', type: 'string', description: 'Emitter serial number exactly as sent' },
  // Deliberately opaque. The 16 bits carry whatever the emitter firmware encodes
  // (inclination, tilt + depth, ...); decoding that is the consumer's business,
  // not the protocol's. Empty for ID-only protocols (R256/R04K/R64K/R01M/OPi),
  // which yields `null` — a missing measurement, never a zero.
  { name: 'data', type: 'uint16', description: 'Opaque emitter payload; empty for ID-only transmit protocols' },
  { name: 'snr', type: 'uint8', description: 'Detection signal-to-noise ratio in dB; 6 is very weak, 25 and above strong' },
  { name: 'frequency', type: 'uint8', units: 'kHz', description: 'Detection frequency; the device listens 63-77 kHz' },
]

const LOG_FIELDS: FieldSpec[] = [
  RECEIVER_SERIAL,
  SECONDS,
  { name: 'log', type: 'string', description: 'Identifier for log messages, e.g. "TBR Sensor" or "Live Sensor"' },
  { name: 'temperature', type: 'int16', description: 'Raw temperature; (raw - 50) / 10 gives degrees Celsius' },
  { name: 'noise_average', type: 'uint8', description: 'Average background noise, 0-255' },
  { name: 'noise_peak', type: 'uint8', description: 'Peak background noise, 0-255' },
  { name: 'frequency', type: 'uint8', units: 'kHz', description: 'Receiver listening frequency; the device listens 63-77 kHz' },
]

// A `$…\r` sentence is identified by its FIELD COUNT, which is why the counts
// have to be unique per (id, firmware) pair — see `SAMPLE_SHAPES`.
export const SAMPLE_FIELDS = {
  emitter: {
    '1.0.1': [...DETECTION_FIELDS, SENT],
    '1.0.2': DETECTION_FIELDS,
  },
  receiver: {
    '1.0.1': [...LOG_FIELDS, SENT],
    '1.0.2': LOG_FIELDS,
  },
} as const satisfies Record<'emitter' | 'receiver', Record<typeof FIRMWARES[number], readonly FieldSpec[]>>

// 8 fields is AMBIGUOUS: a 1.0.1 log and a 1.0.2 detection both have 8. The tie
// is broken by looking for `sensor` in field 2, case-insensitively — the
// datasheets spell that identifier "TBR Sensor" in 1.0.1 and "Live Sensor" in
// 1.0.2, so an exact match on either would silently misparse the other as a
// detection with every field shifted by one.
export const LOG_IDENTIFIER = 'sensor'
export const LOG_IDENTIFIER_INDEX = 2

export interface SampleShape {
  id: 'emitter' | 'receiver'
  firmware: typeof FIRMWARES[number]
}

// Keyed by field count. The value is optional because an unrecognised count is a
// real case: it becomes an `unknown` sentence rather than a guessed one.
export const SAMPLE_DESCRIPTIONS: Record<'emitter' | 'receiver', string> = {
  emitter: 'Acoustic detection of an emitter (an implanted or clamped tag), reported by the receiver.',
  receiver: 'Sensor log from the receiver itself — water temperature and background noise — printed at the interval set by `LI=`.',
}

export const SAMPLE_SHAPES: Record<number, SampleShape[] | undefined> = {
  9: [{ id: 'emitter', firmware: '1.0.1' }],
  8: [{ id: 'receiver', firmware: '1.0.1' }, { id: 'emitter', firmware: '1.0.2' }],
  7: [{ id: 'receiver', firmware: '1.0.2' }],
}

// HOW A SENTENCE IS RECOGNISED ---------------------------------------------------------------------------------------
// This protocol has no framing. Only some listening sentences self-delimit
// (`\r`, `><>\r`, `ack0n\r`); command traffic has neither a start flag nor a
// terminator, and every response echoes its request byte for byte. So the only
// way to segment a stream is to match every known token at every offset. Four
// recognition strategies cover all 17 sentences.
export type TokenKind =
  | 'literal' // the whole sentence is a fixed string: EX!, RR!, ack01\r, LIVECM
  | 'delimited' // a start flag and a terminator, variable body: $…\r, SN=…><>\r
  | 'digits' // a start flag followed by a bounded run of digits: FC=69, UT=…
  | 'version' // a start flag followed by a dotted version, optional `v`: FV=1.0.2

export interface TokenSpec {
  token: string
  // Absent when the token alone cannot name the sentence: a `$…\r` chunk is
  // either an `emitter` or a `receiver`, decided later by field count (and, at 8
  // fields, by the log identifier). See `SAMPLE_SHAPES`.
  id?: SentenceId
  mode: Mode
  kind: TokenKind
  start: string
  end?: string
  minDigits?: number
  maxDigits?: number
  // Set when the token itself PROVES a firmware. These two are the only
  // definitive evidence besides an explicit `FV=`: 1.0.1 enters command mode
  // with `LIVECM`, 1.0.2 with `TBRC`.
  firmware?: typeof FIRMWARES[number]
  fields?: FieldSpec[]
  // What the sentence IS, in prose. `getSentenceDefinition` combines it with a
  // generated account of how the sentence is recognised on the wire, which for a
  // frameless protocol is the least guessable fact about it.
  description?: string
  // `true` means "this sentence's body may legitimately contain other tokens —
  // do not look inside". Only the `HE?` help dump qualifies: it prints the whole
  // API as prose, so it literally contains `FC=69`, `EX!`, `LIVECM` and the rest.
  // For every other sentence a token starting inside its extent is INTERFERENCE
  // (the half-duplex collision), which is handled the opposite way: the inner
  // sentence is kept and the outer one is reported as garbage.
  opaque?: boolean
}

const ACK = (name: string, description: string): FieldSpec[] => [{ name, type: 'string', description }]

// Serial numbers are 6-7 digits, and the docs contradict each other about which,
// so both are accepted.
export const SERIAL_MIN_DIGITS = 6
export const SERIAL_MAX_DIGITS = 7

// A `UT=` timestamp is 10 digits today, but an unset clock counts up from zero
// and the docs show short values, so anything up to 10 is accepted.
const TIME_MAX_DIGITS = 10

export const TOKENS: TokenSpec[] = [
  // listening API
  { token: 'sample', mode: 'listening', kind: 'delimited', start: '$', end: '\r' },
  { token: 'ping', id: 'ping', mode: 'listening', kind: 'delimited', start: 'SN=', end: '><>\r', fields: [RECEIVER_SERIAL], description: 'Answer to the listening-mode `?` query: the receiver serial number followed by an ASCII fish. Lets you check the link and read the serial without entering command mode.' },
  { token: 'clock_round', id: 'clock_round', mode: 'listening', kind: 'literal', start: 'ack01\r', fields: ACK('clock_round', 'The acknowledgement string as sent.'), description: 'Acknowledges that the clock was rounded to the nearest 10 seconds, in answer to `(+)`. Note the device sets the millisecond part to 500, not 0.' },
  { token: 'clock_set', id: 'clock_set', mode: 'listening', kind: 'literal', start: 'ack02\r', fields: ACK('clock_set', 'The acknowledgement string as sent.'), description: 'Acknowledges that the clock was set to a supplied timestamp, in answer to `(+)TTTTTTTTTC` (nine digits of tens-of-seconds plus a Luhn check digit).' },
  { token: 'command_101', id: 'command', mode: 'listening', kind: 'literal', start: 'LIVECM', firmware: '1.0.1', fields: ACK('command', 'The entry sequence, echoed by the receiver.'), description: 'Enters command mode. Sent from listening mode and echoed back unchanged, so the id names the mode it switches INTO while the mode names the API it belongs to.' },
  { token: 'command_102', id: 'command', mode: 'listening', kind: 'literal', start: 'TBRC', firmware: '1.0.2', fields: ACK('command', 'The entry sequence, echoed by the receiver.'), description: 'Enters command mode. Sent from listening mode and echoed back unchanged, so the id names the mode it switches INTO while the mode names the API it belongs to.' },
  // command API
  { token: 'listening', id: 'listening', mode: 'command', kind: 'literal', start: 'EX!', fields: ACK('listening', 'The exit command, echoed by the receiver.'), description: 'Exits command mode and resumes listening. A command-API action, so the id names the mode it returns the device to while the mode names the API it came from. The device also returns to listening on its own after about 60 minutes idle.' },
  { token: 'restart', id: 'restart', mode: 'command', kind: 'literal', start: 'RR!', fields: ACK('restart', 'The command, echoed by the receiver.'), description: 'Restarts the receiver, which comes back up in listening mode.' },
  { token: 'reset', id: 'reset', mode: 'command', kind: 'literal', start: 'FS!', fields: ACK('reset', 'The command, echoed by the receiver.'), description: 'Restores factory settings. This DELETES every tag detection and sensor log held in flash memory.' },
  { token: 'api', id: 'api', mode: 'command', kind: 'delimited', start: 'In Command Mode', end: 'L is Luhn\'s verification number.', opaque: true, fields: ACK('api', 'The help text exactly as printed.'), description: 'The `HE?` help dump: the whole command API printed as prose. Its body legitimately contains every other token, so it is treated as opaque and never split into separate sentences.' },
  { token: 'serial_number', id: 'serial_number', mode: 'command', kind: 'digits', start: 'SN=', minDigits: SERIAL_MIN_DIGITS, maxDigits: SERIAL_MAX_DIGITS, fields: [RECEIVER_SERIAL], description: 'The receiver serial number, in answer to `SN?`. The documentation calls it 6 digits in one place and 7 in another, so both lengths are accepted.' },
  { token: 'firmware', id: 'firmware', mode: 'command', kind: 'version', start: 'FV=', fields: [{ name: 'firmware', type: 'string', description: 'The firmware version as reported, with any leading `v` removed.' }], description: 'The receiver firmware version, in answer to `FV?`. This is the one sentence that states the protocol version outright, so the parser learns from it.' },
  { token: 'frequency', id: 'frequency', mode: 'command', kind: 'digits', start: 'FC=', minDigits: 2, maxDigits: 2, fields: [{ name: 'frequency', type: 'uint8', units: 'kHz', description: 'Listening frequency; the device listens 63-77 kHz' }], description: 'The listening frequency in kHz, in answer to `FC?` or echoed back after `FC=`. With several active channels this is the bottom frequency and the others sit 2 kHz apart.' },
  { token: 'listening_mode', id: 'listening_mode', mode: 'command', kind: 'digits', start: 'LM=', minDigits: 2, maxDigits: 2, fields: [{ name: 'listening_mode', type: 'string', description: 'Active transmit protocols and channel count' }], description: 'The listening mode, in answer to `LM?` or echoed back after `LM=`. The value selects which emitter transmit protocols are decoded; add 30 for two active channels or 60 for three. The decoded set is published as metadata.' },
  { token: 'log_interval', id: 'log_interval', mode: 'command', kind: 'digits', start: 'LI=', minDigits: 2, maxDigits: 2, fields: [{ name: 'log_interval', type: 'string', description: 'Sensor log interval' }], description: 'The sensor log interval, in answer to `LI?` or echoed back after `LI=`. `00` disables logging; the device default is `02`, every 10 minutes. The decoded label is published as metadata.' },
  { token: 'time', id: 'time', mode: 'command', kind: 'digits', start: 'UT=', minDigits: 1, maxDigits: TIME_MAX_DIGITS, fields: [{ name: 'time', type: 'uint32', units: 's', description: 'Seconds since Epoch, or since power up when the clock has not been set' }], description: 'The receiver clock, in answer to `UT?` or echoed back after `UT=`. Whether it reads epoch time or uptime cannot be told from the wire, so the parser reports the number without interpreting it.' },
  // update API — recognised so it is never mistaken for junk, and deliberately
  // nothing more: `UF!` puts the device in bootloader mode and can brick it.
  { token: 'upgrade', id: 'upgrade', mode: 'update', kind: 'literal', start: 'UF!', fields: ACK('upgrade', 'The command, echoed by the receiver.'), description: 'Puts the receiver into bootloader mode for a firmware update. Recognised so it is never mistaken for junk, and deliberately nothing more: this mode is not easily exited and a wrong command in it can brick the device.' },
]

// ERROR STRINGS -----------------------------------------------------------------------------------------------------
// Nothing the parser receives is ever dropped silently: every character either
// decodes, comes out as a garbage sentence, or stays on the buffer as the
// still-incomplete tail. Feedback has to be in the OUTPUT so a consumer can act
// on it per sentence — logging would repeat forever and drown the log.
export const ERROR_UNRECOGNISED = 'Unrecognised input'
export const ERROR_MISSING_END_FLAG = 'Missing end flag'
export const ERROR_BUFFER_LIMIT = 'Buffer limit exceeded'

export const errorFieldCount = (count: number): string => `Unknown field count: ${count}`

// The wrecked sentence is NOT recomposed. Real interference is corrupted bits
// rather than a clean insertion, so the true boundary is unknowable and the
// corner cases explode; the intact inner sentence is emitted and the remains are
// reported as garbage.
export const errorInterrupted = (id: string): string => `Interrupted by ${id}`

export const errorInvalidField = (name: string, raw: string): string => `Invalid ${name}: ${raw}`
