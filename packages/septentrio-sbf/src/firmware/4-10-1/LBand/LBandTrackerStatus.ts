// coded
import { DO_NOT_USE_FLOAT, DO_NOT_USE_INT8, DO_NOT_USE_INT16 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label, scaled } from '../../../utils'
import { satelliteId } from '../satellites'

/* LBandTrackerStatus -> Number: 4201 => "OnChange" interval: 1s
  The LBandTrackerStatus block provides general information on the tracking status
  of the L-band signals.

  LBandTrackerStatus ---------------------------------------------------------
  Block fields    Type  Units Do-Not-Use  Description
  N              uint8                    Number of L-band trackers for which data is provided in this SBF block,
                                          i.e. number of TrackData sub-blocks.
  SBLength       uint8  1 byte            Length of one sub-block
  TrackData                               A succession of N TrackData sub-blocks
  Padding         uint                    Padding bytes

  TrackData ------------------------------------------------------------------
  Block fields    Type        Units  Do-Not-Use  Description
  Frequency     uint32         1 Hz          0   Nominal frequency of the beam for which data is provided in this sub-block.
  Baudrate      uint16        1 baud         0   Baudrate of the beam
  ServiceID     uint16                          Service ID of the beam. Set to 0 for the LBAS1 beam. Set to 1 for the LBAS2
                                                beam when received through an NTRIP connection.
                                                This field must be ignored if the Status field is set to anything else than
                                                3 (Locked).
  FreqOffset   float32         1 Hz  -2 * 10¹⁰  Frequency offset of the demodulator, if available
  CN0           uint16  0.01 dB-Hz          0   Current C/N0 value
  AvgPower       int16      0.01 dB     -32768  Not applicable.
  AGCGain         int8         1 dB       -128  Not applicable.
  Mode            uint8                         Current operation mode: 0 normal
  Status          uint8                         Current status: 0 Idle, 1 Search, 2 FrameSearch, 3 Locked
Rev 2 SVID        uint8                         Satellite ID, see §4.1.9
Rev 1 LockTime   uint16          1 s            Lock time to the L-band signal, clipped to 65535 seconds.
Rev 3 Source      uint8                         L-band tracking module:
                                                  0: Unknown
                                                  1: Internal
                                                  2: LBR board
                                                  3: NTRIP. L-band data received over NTRIP. In that case, the other fields
                                                     in this sub-block are not applicable and set to their Do-Not-Use value.
  Padding          uint                         Padding bytes

  ⚠️ THE REVISION MARKERS ARE OUT OF ORDER IN THE DATASHEET: SVID is marked Rev 2
  and LockTime Rev 1, yet SVID is printed FIRST. §4.1.6 guarantees fields are only
  ever appended, so a rev-1 block cannot contain SVID while omitting LockTime —
  the printed ORDER is what the wire uses, and the markers say when each appeared.
  Revision 1 therefore adds LockTime, revision 2 inserts SVID before it, and
  revision 3 appends Source. That is the only reading consistent with both the
  order and the guarantee, and it is why the tables below are written per revision
  rather than by spreading the previous one.
*/
const REVISION_0: readonly FieldDefinition[] = [
  { name: 'Frequency', type: 'uint32', units: 'Hz', doNotUse: 0, description: 'Nominal frequency of the beam' },
  { name: 'Baudrate', type: 'uint16', units: 'baud', doNotUse: 0, description: 'Baudrate of the beam' },
  { name: 'ServiceID', type: 'uint16', description: 'Service ID of the beam: 0 for LBAS1, 1 for LBAS2 over NTRIP. Ignore unless Status is Locked' },
  { name: 'FreqOffset', type: 'float32', units: 'Hz', doNotUse: DO_NOT_USE_FLOAT, description: 'Frequency offset of the demodulator, when available' },
  { name: 'CN0', type: 'uint16', units: '0.01 dB-Hz', doNotUse: 0, description: 'Current carrier-to-noise density ratio' },
  { name: 'AvgPower', type: 'int16', units: '0.01 dB', doNotUse: DO_NOT_USE_INT16, description: 'Not applicable (per the datasheet)' },
  { name: 'AGCGain', type: 'int8', units: 'dB', doNotUse: DO_NOT_USE_INT8, description: 'Not applicable (per the datasheet)' },
  { name: 'Mode', type: 'uint8', description: 'Current operation mode: 0 normal' },
  { name: 'Status', type: 'uint8', description: 'Current status: 0 idle, 1 search, 2 frame search, 3 locked' },
]

const SVID: FieldDefinition = { name: 'SVID', type: 'uint8', description: 'Satellite ID (§4.1.9)' }
const LOCK_TIME: FieldDefinition = { name: 'LockTime', type: 'uint16', units: 's', description: 'Time locked to the L-band signal, clipped to 65535 s' }
const SOURCE: FieldDefinition = { name: 'Source', type: 'uint8', description: 'Tracking module: 0 unknown, 1 internal, 2 LBR board, 3 NTRIP (in which case every other field is Do-Not-Use)' }

const REVISION_1: readonly FieldDefinition[] = [...REVISION_0, LOCK_TIME]
const REVISION_2: readonly FieldDefinition[] = [...REVISION_0, SVID, LOCK_TIME]
const REVISION_3: readonly FieldDefinition[] = [...REVISION_2, SOURCE]

const header = (fields: readonly FieldDefinition[]): readonly FieldDefinition[] => [
  { name: 'N', type: 'uint8', description: 'Number of L-band trackers reported in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one TrackData sub-block' },
  { name: 'TrackData', count: 'N', length: 'SBLength', fields, description: 'A succession of N TrackData sub-blocks, one per tracker' },
]

export const LBAND_STATUS: Readonly<Record<number, string>> = {
  0: 'IDLE',
  1: 'SEARCH',
  2: 'FRAME_SEARCH',
  3: 'LOCKED',
}

export const LBAND_SOURCE: Readonly<Record<number, string>> = {
  0: 'UNKNOWN',
  1: 'INTERNAL',
  2: 'LBR_BOARD',
  3: 'NTRIP',
}

export const LBAND_MODE: Readonly<Record<number, string>> = { 0: 'NORMAL' }

const HERTZ_PER_MEGAHERTZ = 1_000_000

const decoders: Readonly<Record<string, Decoder>> = {
  // §4.1.9: SVID -> constellation + RINEX name, the form a human reads.
  SVID: satelliteId,
  Frequency: (value) => scaled(value, HERTZ_PER_MEGAHERTZ, 'MHz'),
  CN0: (value) => scaled(value, 100, 'dB-Hz'),
  AvgPower: (value) => scaled(value, 100, 'dB'),
  Mode: (value) => label(LBAND_MODE, value),
  Status: (value) => label(LBAND_STATUS, value),
  Source: (value) => label(LBAND_SOURCE, value),
}

export const lBandTrackerStatus: BlockDefinition = {
  name: 'LBandTrackerStatus',
  number: 4201,
  description: 'Tracking status of the L-band signals: frequency, lock state, C/N0 and which module is receiving them',
  timestamp: 'receiver',
  revisions: [header(REVISION_0), header(REVISION_1), header(REVISION_2), header(REVISION_3)],
  decoders,
}
