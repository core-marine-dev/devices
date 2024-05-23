
export const SBGFrameMessageClasses = {
  CMD: 0x10,
  LOG: 0x00,
  HIGH_FREQ: 0x01,
  NMEA_STANDARD: 0x02,
  NMEA_PROPIETARY: 0x03,
  THIRD_PARTY: 0x04
} as const

export const SBGFrameTypes = {
  CMD: 'command',
  LOG: 'log',
  HIGH_FREQ: 'high-frequency',
  NMEA_STANDARD: 'nmea-standard',
  NMEA_PROPIETARY: 'nmea-propietary',
  THIRD_PARTY: 'thid-party',
  UNKNOWN: 'unknown'
} as const

export const SBG_FRAME_FORMATS = {
  STANDARD: 'standard',
  LARGE: 'large'
} as const

export const SBG_PARSING_STATUS = {
  OK: 0,
  MISSING_BYTES: 1,
  ERROR_CRC: 2,
  ERROR_EXT: 3
} as const

export const TWO_BYTES_MAX = 65_535
// ALL FRAMES
export const SYNC_FLAG = Buffer.from([0xff, 0x5a])
export const SYNC_INDEX = 0
export const SYNC_LENTGH = 2

export const ID_INDEX = 2
export const ID_LENGTH = 1

export const CLASS_INDEX = 3
export const CLASS_LENGTH = 1

export const LENGTH_INDEX = 4
export const LENGTH_LENGTH = 2

export const PAYLOAD_INDEX = 6

export const CRC_LENGTH = 2

export const ETX_FLAG = Buffer.from([0x33])
export const ETX_LENGTH = 1

export const HEADER_LENGTH = SYNC_LENTGH + ID_LENGTH + CLASS_LENGTH + LENGTH_LENGTH
export const FOOTER_LENGTH = CRC_LENGTH + ETX_LENGTH

export const MINIMAL_FRAME_LENGTH = HEADER_LENGTH + FOOTER_LENGTH
// LARGE FRAME
export const STANDARD_FRAME_MAXIMUM_CLASS_BYTELENGTH = 4096
export const LARGE_FRAME_MINIMUM_CLASS = Buffer.from([0x80]).readUInt8()
export const TRANSMISSION_ID_INDEX = 6

export const TRANSMISSION_ID_LENGTH = 1

export const PAGE_INDEX_INDEX = 7
export const PAGE_INDEX_LENGTH = 2

export const PAGES_INDEX = 9
export const PAGES_LENGTH = 2

export const DATA_INDEX = 11
// UNKOWN MESSAGE
export const UNKNOWN_SBG_FRAME_DATA = {
  name: 'unknown',
  type: SBGFrameTypes.UNKNOWN,
  format: SBG_FRAME_FORMATS.STANDARD,
  data: null
}
