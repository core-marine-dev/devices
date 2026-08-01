// coded
import type { Decoder } from '../../../types'
import { label, UNKNOWN_LABEL } from '../../../utils'

/* Shared by InputLink (4090) and OutputLink (4091): the connection-descriptor
  numbering and the data-type table, both reproduced verbatim from §4.2.15.

  CD — identifier of the connection this information applies to:
    0-31    COMx, with x = CD                    1: COM1
    32-47   USBx, with x = CD-32                33: USB1
    48-63   OTGx, with x = CD-48                49: OTG1
    64-95   IPx, with x = CD-54                 64: IP10
    96-127  DSKx, with x = CD-96                97: DSK1
    128-159 NTRx, with x = CD-128 (NTRIP)      129: NTR1
    160-191 IPSx, with x = CD-160 (IP server)  161: IPS1
    192     BT01 (Bluetooth connection)
    193     BT02 (Bluetooth connection)
    196     UHF1 (UHF modem)
    200-205 IPRx, with x = CD-200 (IP receive) 201: IPR1
    210     DCL1 (cellular data-call connection)
    214     CAN1 (CAN stream interface)
    215-219 Reserved
    220     SPI1 (SPI interface)
    221-255 Reserved

  Note the deliberate oddity in the IP range: x = CD-54, not CD-64, so CD 64 is
  "IP10" rather than "IP0". Transcribed as printed.
*/
interface Range {
  from: number
  to: number
  prefix: string
  offset: number
}

const RANGES: readonly Range[] = [
  { from: 0, to: 31, prefix: 'COM', offset: 0 },
  { from: 32, to: 47, prefix: 'USB', offset: 32 },
  { from: 48, to: 63, prefix: 'OTG', offset: 48 },
  { from: 64, to: 95, prefix: 'IP', offset: 54 },
  { from: 96, to: 127, prefix: 'DSK', offset: 96 },
  { from: 128, to: 159, prefix: 'NTR', offset: 128 },
  { from: 160, to: 191, prefix: 'IPS', offset: 160 },
  { from: 200, to: 205, prefix: 'IPR', offset: 200 },
]

const SINGLES: Readonly<Record<number, string | undefined>> = {
  192: 'BT01',
  193: 'BT02',
  196: 'UHF1',
  210: 'DCL1',
  214: 'CAN1',
  220: 'SPI1',
}

// CD -> the connection's name as the receiver's own documentation writes it.
export const connectionName = (cd: number): string => {
  const single = SINGLES[cd]
  if (single !== undefined) return single
  const range: Range | undefined = RANGES.find((entry) => cd >= entry.from && cd <= entry.to)
  return (range === undefined) ? UNKNOWN_LABEL : `${range.prefix}${cd - range.offset}`
}

export const connectionDescriptor: Decoder = (value) => ({ label: connectionName(value) })

// The data types a connection can carry. Shared verbatim between the two blocks,
// except that OutputLink's table is a subset (it has no CMD/BINEX/SPARTN/… entries
// for input-only formats); using the full table is harmless — a type the receiver
// never outputs simply never appears.
export const LINK_DATA_TYPE: Readonly<Record<number, string>> = {
  0: 'NONE',
  1: 'DAISY_CHAIN',
  32: 'CMD',
  33: 'SBF',
  34: 'ASCII_DISPLAY',
  35: 'RINEX',
  36: 'CGGTTS',
  40: 'BINEX',
  64: 'NMEA',
  96: 'RTCMv2',
  97: 'RTCMv3',
  98: 'CMRv2',
  99: 'RTCMV',
  100: 'SPARTN',
  101: 'LBMP',
  110: 'RAW_LBAS1',
  111: 'RAW_LBAS2',
  118: 'RAW_LBAND_BEAM1',
  119: 'RAW_LBAND_BEAM2',
  120: 'RAW_LBAND_BEAM3',
  121: 'RAW_LBAND_BEAM4',
  131: 'SBG_IMU',
  137: 'ADIS',
  160: 'ASCII_IN',
}

export const linkDataType: Decoder = (value) => label(LINK_DATA_TYPE, value)
