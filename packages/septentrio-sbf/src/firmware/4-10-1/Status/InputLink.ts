// coded
import { connectionDescriptor, linkDataType } from './links'

import { DO_NOT_USE_UINT16, DO_NOT_USE_UINT32 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'

/* InputLink -> Number: 4090 => "OnChange" interval: 1s
  The InputLink block reports statistics of the number of bytes and messages
  received and accepted on each active connection descriptor.

  Per connection descriptor, the receiver maintains two byte counters
  (NrBytesReceived and NrBytesAccepted) and two message counters (NrMsgReceived
  and NrMsgAccepted), which are reported in the sub-blocks. These counters provide
  useful information on the quality of the transmission link, and of the bandwidth
  efficiency.

  These counters (as well as the age of the last message) are reset simultaneously
  on the following events:
    - start-up of the receiver
    - overflow of one of the counters
    - change of input type
    - deactivation of a connection descriptor, e.g. on disconnection of USB or IP ports.

  There is one sub-block per connection descriptor for which statistics is available.

  InputLink ------------------------------------------------------------------
  Block fields    Type  Units Do-Not-Use  Description
  N              uint8                    Number of connection descriptors for which communication link statistics
                                          are included
  SBLength       uint8  1 byte            Length of one InputStatsSub sub-block
  InputStats                              A succession of N InputStatsSub sub-blocks
  Padding         uint                    Padding bytes

  InputStatsSub --------------------------------------------------------------
  Block fields          Type     Units  Do-Not-Use  Description
  CD                   uint8                        Identifier of the connection (see ./links.ts for the numbering)
  Type                 uint8                        Type of data on this connection (see ./links.ts)
  AgeOfLastMessage    uint16       1 s       65535   Age of the last accepted message. Clipped to 65534 s.
  NrBytesReceived     uint32    1 byte  4294967295   Total number of bytes received
  NrBytesAccepted     uint32    1 byte  4294967295   Total number of bytes in messages that passed the check for this type
                                                    of input (CRC, parity check, ...). The ratio of NrBytesAccepted to
                                                    NrBytesReceived gives an indication of the quality of the link.
  NrMsgReceived       uint32  1 message              Total number of messages of type Type received.
  NrMsgAccepted       uint32  1 message              Total number of messages of type Type that were interpreted and used
                                                    by the receiver. The ratio of NrMsgAccepted to NrMsgReceived gives an
                                                    indication of the bandwidth usage efficiency.
  Padding               uint                        Padding bytes

  (6) For RTCM 2.x, one 8-bit byte contains 6 RTCM data bits.

  The two RATIOS the datasheet points at are computed at payload level: they are
  the reason the counters exist, and computing them per consumer invites the
  division-by-zero nobody remembers.
*/
const INPUT_STATS_SUB: readonly FieldDefinition[] = [
  { name: 'CD', type: 'uint8', description: 'Connection descriptor: which port or stream this row is about' },
  { name: 'Type', type: 'uint8', description: 'Type of data arriving on this connection' },
  { name: 'AgeOfLastMessage', type: 'uint16', units: 's', doNotUse: DO_NOT_USE_UINT16, description: 'Age of the last accepted message, clipped to 65534 s' },
  { name: 'NrBytesReceived', type: 'uint32', units: 'bytes', doNotUse: DO_NOT_USE_UINT32, description: 'Total bytes received on this connection' },
  { name: 'NrBytesAccepted', type: 'uint32', units: 'bytes', doNotUse: DO_NOT_USE_UINT32, description: 'Total bytes in messages that passed this input type\'s integrity check (CRC, parity, …)' },
  { name: 'NrMsgReceived', type: 'uint32', units: 'messages', description: 'Total messages of this type received' },
  { name: 'NrMsgAccepted', type: 'uint32', units: 'messages', description: 'Total messages of this type interpreted and used by the receiver' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of connection descriptors with statistics in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one InputStatsSub sub-block' },
  { name: 'InputStats', count: 'N', length: 'SBLength', fields: INPUT_STATS_SUB, description: 'A succession of N InputStatsSub sub-blocks, one per connection' },
]

const decoders: Readonly<Record<string, Decoder>> = {
  CD: connectionDescriptor,
  Type: linkDataType,
}

const percentage = (part: number, whole: number): number => Math.round((part / whole) * 1000) / 10

export const inputLink: BlockDefinition = {
  name: 'InputLink',
  number: 4090,
  description: 'Byte and message statistics for every active input connection: how much arrived, and how much of it was usable',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
  // The two ratios the datasheet itself calls out — link quality and bandwidth
  // efficiency — for the LAST sub-block in the block (names collapse across
  // occurrences; per-connection values are in metadata.subBlocks).
  payloadMetadata: ({ NrBytesReceived, NrBytesAccepted, NrMsgReceived, NrMsgAccepted }) => {
    const link: Record<string, unknown> = {}
    if (typeof NrBytesReceived === 'number' && typeof NrBytesAccepted === 'number' && NrBytesReceived > 0) {
      link.linkQuality = { value: percentage(NrBytesAccepted, NrBytesReceived), units: '%' }
    }
    if (typeof NrMsgReceived === 'number' && typeof NrMsgAccepted === 'number' && NrMsgReceived > 0) {
      link.bandwidthEfficiency = { value: percentage(NrMsgAccepted, NrMsgReceived), units: '%' }
    }
    return (Object.keys(link).length === 0) ? {} : { link }
  },
}
