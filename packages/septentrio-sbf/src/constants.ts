// coded
import type { SBFType } from './types'

// SBF framing (reference guide §4.1.1). Every block: an 8-byte header, then a
// 6-byte time stamp, then the body, padded so the total is a multiple of 4.
//
//   00-01  Sync    c1[2]   always 0x24 0x40 ('$@')
//   02-03  CRC     uint16  CRC-CCITT over ID..last byte of the block
//   04-05  ID      uint16  bits 0-12 block number, bits 13-15 revision
//   06-07  Length  uint16  TOTAL block bytes incl. header, multiple of 4
//   08-11  TOW     uint32  ms of the GPS week          (§4.1.3)
//   12-13  WNc     uint16  continuous GPS week count   (§4.1.3)
//   14-..  Body
export const SYNC_1 = 0x24
export const SYNC_2 = 0x40

export const CRC_INDEX = 2
export const ID_INDEX = 4
export const LENGTH_INDEX = 6
export const TOW_INDEX = 8
export const WNC_INDEX = 12
export const BODY_INDEX = 14

export const HEADER_LENGTH = 8
export const TIME_LENGTH = 6
// A block with an empty body: header + time stamp only (e.g. EndOfPVT is 16
// with its padding, but 14 is the floor the framing itself imposes).
export const MINIMAL_BLOCK_LENGTH = HEADER_LENGTH + TIME_LENGTH
// The Length field is a uint16, so no block can exceed this.
export const MAXIMAL_BLOCK_LENGTH = 65_535
// §4.1.1: the total block size is always a multiple of 4.
export const LENGTH_MULTIPLE = 4

// ID field bit split (§4.1.1).
export const BLOCK_NUMBER_MASK = 0b0001_1111_1111_1111
export const BLOCK_REVISION_SHIFT = 13

// Do-Not-Use values of the time stamp itself (§4.1.3). Typical for a few
// seconds after start-up; TOW usually becomes valid before WNc.
export const DO_NOT_USE_TOW = 4_294_967_295
export const DO_NOT_USE_WNC = 65_535

// The one block whose body tells us the receiver's own GPS-UTC offset, which is
// how leap seconds are resolved without trusting a hardcoded table.
export const RECEIVER_TIME_NUMBER = 5914
export const DELTA_LS_FIELD = 'DeltaLS'
export const DO_NOT_USE_DELTA_LS = -128

// ...and the one whose body states the receiver's OWN firmware version, which is
// how `protocol.version` stops being "what the constructor was told".
export const RECEIVER_SETUP_NUMBER = 5902
export const RX_VERSION_FIELD = 'RxVersion'

// Byte width per SBF/CMA type. `string`/`char` are variable and carry their own
// `length` in the field definition.
export const TYPE_BYTES: Readonly<Record<SBFType, number>> = {
  char: 1,
  float32: 4,
  float64: 8,
  int8: 1,
  int16: 2,
  int32: 4,
  string: 1,
  uint8: 1,
  uint16: 2,
  uint32: 4,
}

// Most floating-point fields share this Do-Not-Use value, written -2 * 10^10 in
// the datasheets.
export const DO_NOT_USE_FLOAT = -2 * (10 ** 10)

export const PROTOCOL_NAME = 'SBF'
export const DEFAULT_FIRMWARE = '4.10.1'

// The name reported at metadata.name for a block the knowledge base does not
// model. The block is still emitted with its real `id`, timestamp and `raw` —
// identified, just not decoded — which is NOT an error condition.
export const UNKNOWN_BLOCK = 'unknown'

// The Do-Not-Use sentinels that repeat across many blocks.
export const DO_NOT_USE_UINT8 = 255
export const DO_NOT_USE_UINT16 = 65_535
export const DO_NOT_USE_INT8 = -128
export const DO_NOT_USE_INT16 = -32_768
export const DO_NOT_USE_INT32 = -2_147_483_648
export const DO_NOT_USE_UINT32 = 4_294_967_295
