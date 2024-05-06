export const FIELD_TYPE = ['int8', 'int16', 'int32', 'uint8', 'uint16', 'uint32', 'string', 'boolean'] as const

export const FIRMWARES_AVAILABLE = ['1.0.1', '1.0.2'] as const

export const MODES = ['listening', 'command'] as const
export const LISTENING_MODE = 'EX!'
export const COMMAND_MODE = 'LIVECM'
export const UPDATE_MODE = 'UF!'

// COMMAND FLAGS
export const SERIAL_NUMBER_START = 'SN='
export const SERIAL_NUMBER_LENGTH_MIN = 6
export const SERIAL_NUMBER_LENGTH_MAX = 7
export const SERIAL_NUMBER_FRAME_LENGTH_MIN = SERIAL_NUMBER_START.length + SERIAL_NUMBER_LENGTH_MIN
export const SERIAL_NUMBER_FRAME_LENGTH_MAX = SERIAL_NUMBER_START.length + SERIAL_NUMBER_LENGTH_MAX
export const SERIAL_NUMBERS_RESERVED = [104, 105, 106, 107, 110, 111]

export const FIRMWARE_START = 'FV='

export const FREQUENCY_START = 'FC='
export const FREQUENCY_LENGTH = 2
export const FREQUENCY_FRAME_LENGTH = FREQUENCY_START.length + FREQUENCY_LENGTH
export const FREQUENCY_MIN = 63
export const FREQUENCY_MAX = 77

export const LOG_INTERVAL_START = 'LI='
export const LOG_INTERVAL_LENGTH = 2
export const LOG_INTERVAL_FRAME_LENGTH = LOG_INTERVAL_START.length + LOG_INTERVAL_LENGTH
export const LOG_INTERVAL_MIN = 0
export const LOG_INTERVAL_MAX = 7
export const LOG_INTERVALS = {
  '00': 'disabled',
  '01': '5 minutes',
  '02': '10 minutes',
  '03': '30 minutes',
  '04': '60 minutes',
  '05': '2 hours',
  '06': '12 hours',
  '07': '24 hours'
} as const

export const PROTOCOLS_START = 'LM='
export const PROTOCOLS_LENGTH = 2
export const PROTOCOLS_FRAME_LENGTH = PROTOCOLS_START.length + PROTOCOLS_LENGTH
export const PROTOCOLS_SINGLE_CHANNEL_MIN = 0
export const PROTOCOLS_SINGLE_CHANNEL_MAX = 8
export const PROTOCOLS_DUAL_CHANNEL_MIN = 30
export const PROTOCOLS_DUAL_CHANNEL_MAX = 38
export const PROTOCOLS_TRIPLE_CHANNEL_MIN = 60
export const PROTOCOLS_TRIPLE_CHANNEL_MAX = 68
export const PROTOCOLS = {
  // Single Channel
  '00': { channel: 'single', id: ['R256', 'R04K', 'R64K'], data: ['S256'] },
  '01': { channel: 'single', id: ['R64K', 'R01M'], data: ['S256', 'S64K'] },
  '02': { channel: 'single', id: ['R01M'], data: ['S64K'] },
  '03': { channel: 'single', id: ['R01M'], data: [] },
  '04': { channel: 'single', id: [], data: ['S64K'] },
  '05': { channel: 'single', id: [], data: ['HS256'] },
  '06': { channel: 'single', id: [], data: ['DS256'] },
  '07': { channel: 'single', id: ['OPi'], data: ['OPs'] },
  '08': { channel: 'single', id: ['R64K', 'R01M', 'OPi'], data: ['S256', 'S64K', 'OPs'] },
  // Dual Channel
  '30': { channel: 'dual', id: ['R256', 'R04K', 'R64K'], data: ['S256'] },
  '31': { channel: 'dual', id: ['R64K', 'R01M'], data: ['S256', 'S64K'] },
  '32': { channel: 'dual', id: ['R01M'], data: ['S64K'] },
  '33': { channel: 'dual', id: ['R01M'], data: [] },
  '34': { channel: 'dual', id: [], data: ['S64K'] },
  '35': { channel: 'dual', id: [], data: ['HS256'] },
  '36': { channel: 'dual', id: [], data: ['DS256'] },
  '37': { channel: 'dual', id: ['OPi'], data: ['OPs'] },
  '38': { channel: 'dual', id: ['R64K', 'R01M', 'OPi'], data: ['S256', 'S64K', 'OPs'] },
  // Triple Channel
  '60': { channel: 'triple', id: ['R256', 'R04K', 'R64K'], data: ['S256'] },
  '61': { channel: 'triple', id: ['R64K', 'R01M'], data: ['S256', 'S64K'] },
  '62': { channel: 'triple', id: ['R01M'], data: ['S64K'] },
  '63': { channel: 'triple', id: ['R01M'], data: [] },
  '64': { channel: 'triple', id: [], data: ['S64K'] },
  '65': { channel: 'triple', id: [], data: ['HS256'] },
  '66': { channel: 'triple', id: [], data: ['DS256'] },
  '67': { channel: 'triple', id: ['OPi'], data: ['OPs'] },
  '68': { channel: 'triple', id: ['R64K', 'R01M', 'OPi'], data: ['S256', 'S64K', 'OPs'] }
} as const

export const TIMESTAMP_START = 'UT='
export const TIMESTAMP_LENGTH = 10
export const TIMESTAMP_FRAME_LENGTH = TIMESTAMP_START.length + TIMESTAMP_LENGTH

export const API_START = 'In Command Mode'
export const API_END = 'L is Luhn\'s verification number.'
export const API_TYPICAL_CONTENT = `In Command Mode
Read values
  SN?	-	-	->	TBR serial number
  FV?	-	-	->	Firmware version
  FC?	-	-	->	Listening freq. in kHz
  LM?	-	-	->	Listening Mode. Determines active protocols
  LI?	-	-	->	TBR sensor log interval (00=never,01=once every 5 min,02=10 min,03=30 min, 04=1 hour, 05=2 hours, 06=12 hours, 07=24 hours)
  UT?	-	-	->	Current UNIX timestamp (UTC)
Set values
  FC=69	-	->	Set freq. channel (base frequency)
  LM=01	-	-	->	Listening Mode. Sets active protocols.
  LI=00	-	->	Set TBR sensor log interval (00=never,01=once every 5 min,02=10 min,03=30 min, 04=1 hour, 05=2 hours, 06=12 hours, 07=24 hours)
  UT=1234567890	->	Set UNIX timestamp (UTC)
Actions
  EX!	-	-	->	Exit command mode and resume listening for signals
  RR!	-	-	->	Restart TBR
  FS!	-	-	->	Warning: Restores factory settings and deletes all tag detections and TBR sensor logs from flash memory
  UF!	-	-	->	Warning: Puts TBR in bootloader mode. Firmware must be written after activating this action

In Listening mode
Note: Minimum 1 ms betwee
n input characters
  TBRC		->	 Enter Command Mode
  (+)			->	 Sync Time
  (+)XXXXXXXXXL	->	 Sync and set new time (UTC) with the least significant digit being 10 seconds. L is Luhn's verification number.`

export const RESTART_DEVICE = 'RR!'
export const FACTORY_RESET = 'FS!'
export const UPGRADE_FIRMWARE = 'UF!'

export const FLAGS_COMMAND = [SERIAL_NUMBER_START, FIRMWARE_START, FREQUENCY_START, LOG_INTERVAL_START, PROTOCOLS_START, TIMESTAMP_START, API_START, RESTART_DEVICE, FACTORY_RESET, UPGRADE_FIRMWARE, COMMAND_MODE, LISTENING_MODE] as const
// LISTENING MODE
export const SAMPLE_START = '$'
export const SAMPLE_END = '\r'
export const SAMPLE_SPLIT = ','

export const PING_START = 'SN='
export const PING_END = '><>\r'
export const PING_LENGTH_MIN = PING_START.length + PING_END.length + SERIAL_NUMBER_LENGTH_MIN
export const PING_LENGTH_MAX = PING_START.length + PING_END.length + SERIAL_NUMBER_LENGTH_MAX

// export const CLOCK_FLAG = 'ack'
export const CLOCK_ROUND = 'ack01\r'
export const CLOCK_SET = 'ack02\r'

export const FLAGS_LISTENING = [SAMPLE_START, PING_START, CLOCK_ROUND, CLOCK_SET] as const

// export const MODES = ['listening', 'command', 'update'] as const

export const LISTENING_FRAMES = ['sample', 'ping', 'roundClock', 'setClock'] as const

export const EMITTER_ANGLE_BIT_LENGTH = 10
export const EMITTER_ANGLE_FACTOR = 10
export const EMITTER_DEVIATION_BIT_LENGTH = 6
export const EMITTER_DEVIATION_FACTOR = 4
// TB LIVE
export const MAX_BUFFER_LENGTH = API_TYPICAL_CONTENT.length + 100