// coded
import type { SBGType } from './types'

/* sbgECom framing — firmware reference manual SBGFWM.2.3 §2.1.1 (standard) and
   §2.1.2.1 (large). Everything is LITTLE endian (§2.1.1 Note 2).

   Standard frame:
     00     SYNC 1  0xFF
     01     SYNC 2  0x5A
     02     MSG     uint8   message id WITHIN the class
     03     CLASS   uint8   message class; bit 7 set means a LARGE frame
     04-05  LEN     uint16  size of the DATA section, max 4086
     06-..  DATA
     ..     CRC     uint16  over [MSG, CLASS, LEN, DATA]   (§2.1.1 Note 3)
     ..     ETX     uint8   always 0x33

   Large frame — the same header, then a 5-byte page header before DATA, and LEN
   INCLUDES those 5 bytes:
     06     TX ID      uint8   transmission id
     07-08  PAGE IDX   uint16  zero-based page index
     09-10  NR PAGES   uint16  total pages in this transmission
     11-..  DATA       0..4081 the fragment to be reassembled BY THE HOST
*/
export const SYNC_1 = 0xFF
export const SYNC_2 = 0x5A

export const MSG_INDEX = 2
export const CLASS_INDEX = 3
export const LENGTH_INDEX = 4
export const DATA_INDEX = 6

export const HEADER_LENGTH = 6
export const CRC_LENGTH = 2
export const ETX_LENGTH = 1
export const FOOTER_LENGTH = CRC_LENGTH + ETX_LENGTH
export const ETX = 0x33

// A frame with an empty DATA section: header + footer only.
export const MINIMAL_FRAME_LENGTH = HEADER_LENGTH + FOOTER_LENGTH
// §2.1.1 Note 1 and §2.1.2: "Maximum length value is 4086", for BOTH frame
// forms — a large frame's LEN counts its 5-byte page header, so its DATA caps at
// 4081 and the LEN ceiling is the same number.
export const MAXIMAL_DATA_LENGTH = 4086
export const MAXIMAL_FRAME_LENGTH = HEADER_LENGTH + MAXIMAL_DATA_LENGTH + FOOTER_LENGTH

/* §2.1.2.1: "A large frame is indicated when the CLASS field MSB bit is set to 1
   (ie 0x80)."

   ⚠️ The 0.0.x parser decided this from the PAYLOAD LENGTH instead
   (`length > 4096`), which is wrong twice over: the flag is a class bit, and the
   standard maximum is 4086, not 4096. A large frame with a small payload was
   read as a standard one, and its 5-byte page header was decoded as body fields. */
export const LARGE_FRAME_FLAG = 0x80
export const CLASS_MASK = 0x7F

export const TRANSMISSION_ID_INDEX = 6
export const PAGE_INDEX_INDEX = 7
export const PAGES_INDEX = 9
export const LARGE_DATA_INDEX = 11
export const LARGE_HEADER_LENGTH = LARGE_DATA_INDEX - DATA_INDEX

// Message classes (§2.1.4). Only LOG_ECOM_0 is modelled in 1.0.0; the rest are
// recognised so a frame from them is IDENTIFIED rather than called garbage.
export const CLASS_LOG_ECOM_0 = 0x00
export const CLASS_LOG_ECOM_1 = 0x01
export const CLASS_LOG_NMEA_0 = 0x02
export const CLASS_LOG_NMEA_1 = 0x03
export const CLASS_LOG_THIRD_PARTY_0 = 0x04
export const CLASS_CMD_0 = 0x10

export const CLASS_NAMES: Readonly<Record<number, string>> = {
  [CLASS_LOG_ECOM_0]: 'SBG_ECOM_CLASS_LOG_ECOM_0',
  [CLASS_LOG_ECOM_1]: 'SBG_ECOM_CLASS_LOG_ECOM_1',
  [CLASS_LOG_NMEA_0]: 'SBG_ECOM_CLASS_LOG_NMEA_0',
  [CLASS_LOG_NMEA_1]: 'SBG_ECOM_CLASS_LOG_NMEA_1',
  [CLASS_LOG_THIRD_PARTY_0]: 'SBG_ECOM_CLASS_LOG_THIRD_PARTY_0',
  [CLASS_CMD_0]: 'SBG_ECOM_CLASS_CMD_0',
}

/* This package parses TWO wire formats off ONE stream, so `protocol.name` has to
   say which — the same reasoning as septentrio-sbf, and deliberately the same
   shape, so `name.startsWith('SBG')` means "proprietary to this device".

   `SBG NMEA` is for the device's own $PSBG* / vendor sentences; a standard
   sentence keeps whatever nmea-parser assigns it ('NMEA', or a vendor name). */
export const PROTOCOL_NAME = 'SBG ECOM'
export const NMEA_PROTOCOL_NAME = 'SBG NMEA'
export const DEFAULT_FIRMWARE = '2.3'

// What metadata.name reports for a frame whose (class, id) pair is not modelled.
// The frame is still emitted with its real id, `raw` and timestamps — identified,
// not decoded — which is NOT an error.
export const UNKNOWN_LOG = 'unknown'

// The one log that carries BOTH the device uptime and a real UTC clock, which is
// how a µs-since-power-up stamp becomes an epoch (see SBGParser.sentenceTimestamp).
export const UTC_TIME_MESSAGE = 2
export const TIME_STAMP_FIELD = 'TIME_STAMP'

// Byte width per sbgECom type. sbgECom has no strings and no 64-bit integers in
// the LOG class; `bytes` is a raw buffer whose width comes from the frame.
export const TYPE_BYTES: Readonly<Record<SBGType, number>> = {
  float32: 4,
  float64: 8,
  int8: 1,
  int16: 2,
  int32: 4,
  uint8: 1,
  uint16: 2,
  uint32: 4,
}
