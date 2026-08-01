// coded
import { DO_NOT_USE_INT8 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, scaled, UNKNOWN_LABEL } from '../../../utils'
import { satelliteId } from '../satellites'

/* ChannelStatus -> Number: 4013 => "OnChange" interval: default PVT output rate
  This block describes the current satellite allocation and tracking status of the
  active receiver channels. Active channels are channels to which a satellite has
  been allocated.

  This block uses a two-level sub-block structure analogous to that of the
  MeasEpoch block. For each active channel, a ChannelSatInfo sub-block contains all
  satellite-dependent information such as health, azimuth and elevation. Each of
  these sub-blocks contains N2 ChannelStateInfo sub-blocks, N2 being the number of
  active antennas in a given channel (for single-antenna receivers, N2 is one). The
  ChannelStateInfo reports information such as the tracking status and PVT usage of
  a given signal type tracked on a given antenna.

  Inactive channels are not contained in the ChannelStatus block.

  Health, tracking and PVT status fields are available for each satellite. These
  status fields consist of a sequence of up to 8 two-bit fields. Each 2-bit field
  contains the status of one of the signals transmitted by the satellite. The
  position of the 2 bits corresponding to a given signal is dependent on the
  constellation, but is otherwise fixed:

    GPS:         [15-14 Reserved][13-12 Reserved][11-10 L1C][9-8 L5][7-6 L2C][5-4 P2(Y)][3-2 P1(Y)][1-0 L1CA]
    GLONASS:     [15-14 Reserved][13-12 Reserved][11-10 Reserved][9-8 L3][7-6 L2CA][5-4 L2P][3-2 L1P][1-0 L1CA]
    Galileo:     [15-14 Reserved][13-12 E5-AltBOC][11-10 E5b][9-8 E5a][7-6 E6BC][5-4 E6A][3-2 L1BC][1-0 L1A]
    SBAS:        [15-14 .. 5-4 Reserved][3-2 L5][1-0 L1]
    BeiDou:      [15-14 Reserved][13-12 Reserved][11-10 B2b][9-8 B2a][7-6 B1C][5-4 B3I][3-2 B2I][1-0 B1I]
    QZSS:        [15-14 Reserved][13-12 Reserved][11-10 L1S][9-8 L1C][7-6 L6][5-4 L5][3-2 L2C][1-0 L1CA]
    NavIC/IRNSS: [15-14 .. 3-2 Reserved][1-0 L5]

  ChannelStatus --------------------------------------------------------------
  Block fields    Type  Units Do-Not-Use  Description
  N              uint8                    Number of channels for which status are provided in this SBF block, i.e.
                                          number of ChannelSatInfo sub-blocks. If N is 0, there are no active channels.
  SB1Length      uint8  1 byte            Length of a ChannelSatInfo sub-block, EXCLUDING the nested ChannelStateInfo
  SB2Length      uint8  1 byte            Length of a ChannelStateInfo sub-block
  Reserved    uint8[3]                    Reserved for future use, to be ignored by decoding software
  SatInfo                                 A succession of N ChannelSatInfo sub-blocks
  Padding         uint                    Padding bytes

  ChannelSatInfo -------------------------------------------------------------
  Block fields       Type      Units  Do-Not-Use  Description
  SVID              uint8                         Satellite ID, see §4.1.9
  FreqNr            uint8                     0   For GLONASS FDMA signals, the frequency number with an offset of 8,
                                                  ranging 1 (actual -7) to 21 (actual 13). Otherwise reserved.
  Reserved1      uint8[2]                         Reserved for future use, to be ignored by decoding software
  Azimuth/RiseSet  uint16                         bit field:
                          1 degree        511       Bits 0-8:   Azimuth [0,359]. 0 is North, increasing towards East.
                                                    Bits 9-13:  Reserved
                                            3       Bits 14-15: Rise/Set indicator: 0 setting, 1 rising, 3 elevation rate unknown
  HealthStatus     uint16                         Sequence of 2-bit health status fields (see the tables above):
                                                    0 health unknown or not applicable, 1 healthy, 3 unhealthy.
                                                  The 2-bit health status is a condensed version of the health status as
                                                  sent by the satellite. For SBAS it is set from the almanac data (MT17).
  Elevation          int8   1 degree       -128   Elevation [-90,90] relative to the local horizontal plane
  N2                uint8                         Number of ChannelStateInfo blocks following this ChannelSatInfo block.
                                                  There is one ChannelStateInfo sub-block per antenna.
  RxChannel         uint8                         Channel number, see §4.1.11
  Reserved2         uint8                         Reserved for future use, to be ignored by decoding software
  Padding            uint                         Padding bytes

  ChannelStateInfo -----------------------------------------------------------
  Block fields       Type  Description
  Antenna           uint8  Antenna number (0 for main antenna)
  Reserved          uint8  Reserved for future use, to be ignored by decoding software
  TrackingStatus   uint16  Sequence of 2-bit tracking status fields: 0 idle or not applicable, 1 search, 2 sync, 3 tracking
  PVTStatus        uint16  Sequence of 2-bit PVT status fields: 0 not used, 1 waiting for ephemeris, 2 used, 3 rejected
  PVTInfo          uint16  Internal info
  Padding            uint  Padding bytes

  The 2-bit sequences are decoded as EIGHT slots each, indexed 0-7 by their bit
  position, NOT as a signal name: the name depends on the constellation, and the
  constellation comes from SVID (§4.1.9), which this block does not resolve for
  itself. A consumer that knows the constellation can map slot -> signal with the
  tables above; publishing a guessed name here would be the datasheet's job, not
  the parser's.
*/
const CHANNEL_STATE_INFO: readonly FieldDefinition[] = [
  { name: 'Antenna', type: 'uint8', description: 'Antenna number; 0 is the main antenna' },
  { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'TrackingStatus', type: 'uint16', description: 'Eight 2-bit tracking states, one per signal slot: 0 idle, 1 search, 2 sync, 3 tracking' },
  { name: 'PVTStatus', type: 'uint16', description: 'Eight 2-bit PVT states, one per signal slot: 0 not used, 1 waiting for ephemeris, 2 used, 3 rejected' },
  { name: 'PVTInfo', type: 'uint16', reserved: true, description: 'Internal info' },
]

const CHANNEL_SAT_INFO: readonly FieldDefinition[] = [
  { name: 'SVID', type: 'uint8', description: 'Satellite ID (§4.1.9)' },
  { name: 'FreqNr', type: 'uint8', doNotUse: 0, description: 'GLONASS FDMA frequency number with an offset of 8 (1 means -7, 21 means 13); reserved for other constellations' },
  { name: 'Reserved1', type: 'string', length: 2, reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'Azimuth/RiseSet', type: 'uint16', description: 'Bit field: bits 0-8 azimuth in degrees (0 is North, increasing East), bits 14-15 rise/set indicator' },
  { name: 'HealthStatus', type: 'uint16', description: 'Eight 2-bit health states, one per signal slot: 0 unknown, 1 healthy, 3 unhealthy' },
  { name: 'Elevation', type: 'int8', units: 'deg', doNotUse: DO_NOT_USE_INT8, description: 'Elevation relative to the local horizontal plane, -90 to 90' },
  { name: 'N2', type: 'uint8', description: 'Number of ChannelStateInfo sub-blocks that follow — one per antenna' },
  { name: 'RxChannel', type: 'uint8', description: 'Receiver channel number (§4.1.11)' },
  { name: 'Reserved2', type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'StateInfo', count: 'N2', length: 'SB2Length', fields: CHANNEL_STATE_INFO, description: 'A succession of N2 ChannelStateInfo sub-blocks, one per antenna' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of active channels reported; 0 means no channel has a satellite allocated' },
  { name: 'SB1Length', type: 'uint8', units: 'bytes', description: 'Length of a ChannelSatInfo sub-block, excluding its nested ChannelStateInfo blocks' },
  { name: 'SB2Length', type: 'uint8', units: 'bytes', description: 'Length of one ChannelStateInfo sub-block' },
  { name: 'Reserved', type: 'string', length: 3, reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'SatInfo', count: 'N', length: 'SB1Length', fields: CHANNEL_SAT_INFO, description: 'A succession of N ChannelSatInfo sub-blocks, one per active channel' },
]

export const RISE_SET: Readonly<Record<number, string>> = {
  0: 'SETTING',
  1: 'RISING',
  3: 'ELEVATION_RATE_UNKNOWN',
}

export const HEALTH: Readonly<Record<number, string>> = { 0: 'UNKNOWN', 1: 'HEALTHY', 3: 'UNHEALTHY' }
export const TRACKING: Readonly<Record<number, string>> = { 0: 'IDLE', 1: 'SEARCH', 2: 'SYNC', 3: 'TRACKING' }
export const PVT_USAGE: Readonly<Record<number, string>> = { 0: 'NOT_USED', 1: 'WAITING_FOR_EPHEMERIS', 2: 'USED', 3: 'REJECTED' }

const SLOTS = 8
const AZIMUTH_DO_NOT_USE = 511

// One 16-bit word carrying eight 2-bit states -> the states by slot index. The
// slot's SIGNAL name depends on the constellation (see the tables in the comment),
// which this block does not resolve, so the index is what is published.
const slots = (value: number, table: Readonly<Record<number, string>>): Record<number, string> => {
  const decoded: Record<number, string> = {}
  for (let slot = 0; slot < SLOTS; slot++) {
    decoded[slot] = table[bits(value, slot * 2, (slot * 2) + 1)] ?? UNKNOWN_LABEL
  }
  return decoded
}

const decoders: Readonly<Record<string, Decoder>> = {
  // §4.1.9: SVID -> constellation + RINEX name, the form a human reads.
  'SVID': satelliteId,
  'Azimuth/RiseSet': (value) => {
    const azimuth = bits(value, 0, 8)
    return {
      azimuth: (azimuth === AZIMUTH_DO_NOT_USE) ? null : { value: azimuth, units: 'deg' },
      riseSet: RISE_SET[bits(value, 14, 15)] ?? UNKNOWN_LABEL,
    }
  },
  'HealthStatus': (value) => ({ health: slots(value, HEALTH) }),
  'TrackingStatus': (value) => ({ tracking: slots(value, TRACKING) }),
  'PVTStatus': (value) => ({ pvt: slots(value, PVT_USAGE) }),
  'FreqNr': (value) => scaled(value - 8, 1),
}

export const channelStatus: BlockDefinition = {
  name: 'ChannelStatus',
  number: 4013,
  description: 'Satellite allocation and tracking status of every active receiver channel, per antenna and per signal',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
  payloadMetadata: ({ N }) => (typeof N === 'number') ? { channels: { active: N } } : {},
}
