// coded
import { connectionDescriptor, linkDataType } from './links'

import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'

/* OutputLink -> Number: 4091 => "OnChange" interval: 1s
  The OutputLink block reports statistics of the number of bytes sent on each
  active connection descriptor.

  Per connection descriptor, the receiver maintains two byte counters
  NrBytesProduced and NrBytesSent, which are reported in the sub-block. They
  provide an indication of the amount of data output and data lost on a given
  connection.

  These counters are reset simultaneously on the following events:
    - start-up of the receiver
    - overflow of one of the counters
    - deactivation of a connection descriptor, e.g. on disconnection of USB or IP ports
    - change of COM port settings.

  There is one OutputStatsSub sub-block per connection descriptor for which
  statistics is available. Each OutputStatsSub sub-block contains a number of
  OutputTypeSub sub-blocks. These sub-blocks indicate which data type has been
  output through the connection in question during the last second. If no output
  happened during the last second, there is no OutputTypeSub sub-block.

  OutputLink -----------------------------------------------------------------
  Block fields    Type  Units Do-Not-Use  Description
  N1             uint8                    Number of OutputStatsSub sub-blocks in this OutputLink block.
  SB1Length      uint8  1 byte            Length of an OutputStatsSub sub-block, EXCLUDING the nested OutputTypeSub
  SB2Length      uint8  1 byte            Length of an OutputTypeSub sub-block
  Reserved    uint8[3]                    Reserved for future use
  OutputStats                             A succession of N1 OutputStatsSub sub-blocks
  Padding         uint                    Padding bytes

  OutputStatsSub -------------------------------------------------------------
  Block fields          Type       Units  Description
  CD                   uint8              Identifier of the connection (see ./links.ts for the numbering)
  N2                   uint8              Number of OutputTypeSub sub-blocks included at the end of this OutputStatsSub
  AllowedRate         uint16  1 kbyte/s   Maximum datarate recommended on this connection
  NrBytesProduced     uint32     1 byte   Total number of bytes produced by the receiver. See also NrBytesSent.
  NrBytesSent         uint32     1 byte   Total number of bytes actually sent (i.e. without congestions or transmission
                                          errors). The ratio of NrBytesSent to NrBytesProduced gives an indication of the
                                          amount of bandwidth overload. Both are 32-bit counters; if one overflows, both
                                          are reset to zero.
Rev 1 NrClients        uint8              Number of clients currently connected to this connection. Most connection types
                                          can only serve one client at a time, but each IP server (IPS) port can serve up
                                          to eight simultaneous clients. When NrClients is more than one, NrBytesProduced
                                          and NrBytesSent are the number of bytes produced and sent to each individual client.
  Reserved          uint8[3]              Reserved for future use
  OutputType                              A succession of N2 OutputTypeSub sub-blocks

  OutputTypeSub --------------------------------------------------------------
  Block fields   Type  Units  Description
  Type          uint8         Type of data (see ./links.ts)
  Percentage    uint8    1 %  Percentage of the produced bytes that belong to this type, during the last second
  Padding        uint         Padding bytes

  ⚠️ This is the two-level case that made the engine honour "declared length
  EXCLUDES the nested sub-blocks": SB1Length covers the OutputStatsSub scalars
  only, and the N2 OutputTypeSub blocks follow it, each of SB2Length.
*/
const OUTPUT_TYPE_SUB: readonly FieldDefinition[] = [
  { name: 'Type', type: 'uint8', description: 'Type of data output through this connection' },
  { name: 'Percentage', type: 'uint8', units: '%', description: 'Share of the produced bytes belonging to this type during the last second' },
]

const outputStatsSub = (revision: number): readonly FieldDefinition[] => [
  { name: 'CD', type: 'uint8', description: 'Connection descriptor: which port or stream this row is about' },
  { name: 'N2', type: 'uint8', description: 'Number of OutputTypeSub sub-blocks at the end of this sub-block' },
  { name: 'AllowedRate', type: 'uint16', units: 'kB/s', description: 'Maximum datarate recommended on this connection' },
  { name: 'NrBytesProduced', type: 'uint32', units: 'bytes', description: 'Total bytes the receiver produced for this connection' },
  { name: 'NrBytesSent', type: 'uint32', units: 'bytes', description: 'Total bytes actually sent, i.e. without congestion or transmission errors' },
  ...((revision >= 1)
    ? [{ name: 'NrClients', type: 'uint8', description: 'Clients currently connected; an IP server port serves up to eight, and then the byte counters are PER client' } as const]
    : []),
  { name: 'Reserved', type: 'string', length: 3, reserved: true, description: 'Reserved for future use' },
  { name: 'OutputType', count: 'N2', length: 'SB2Length', fields: OUTPUT_TYPE_SUB, description: 'A succession of N2 OutputTypeSub sub-blocks' },
]

const header = (revision: number): readonly FieldDefinition[] => [
  { name: 'N1', type: 'uint8', description: 'Number of OutputStatsSub sub-blocks in this block' },
  { name: 'SB1Length', type: 'uint8', units: 'bytes', description: 'Length of an OutputStatsSub sub-block, excluding its nested OutputTypeSub blocks' },
  { name: 'SB2Length', type: 'uint8', units: 'bytes', description: 'Length of one OutputTypeSub sub-block' },
  { name: 'Reserved', type: 'string', length: 3, reserved: true, description: 'Reserved for future use' },
  { name: 'OutputStats', count: 'N1', length: 'SB1Length', fields: outputStatsSub(revision), description: 'A succession of N1 OutputStatsSub sub-blocks, one per connection' },
]

const decoders: Readonly<Record<string, Decoder>> = {
  CD: connectionDescriptor,
  Type: linkDataType,
}

export const outputLink: BlockDefinition = {
  name: 'OutputLink',
  number: 4091,
  description: 'Byte statistics for every active output connection: how much was produced, how much actually went out, and of what type',
  timestamp: 'receiver',
  revisions: [header(0), header(1)],
  decoders,
  // Bandwidth overload, which is what the produced/sent pair exists to show.
  payloadMetadata: ({ NrBytesProduced, NrBytesSent }) => {
    if (typeof NrBytesProduced !== 'number' || typeof NrBytesSent !== 'number' || NrBytesProduced === 0) return {}
    return {
      link: {
        sent: { value: Math.round((NrBytesSent / NrBytesProduced) * 1000) / 10, units: '%' },
        lost: { value: NrBytesProduced - NrBytesSent, units: 'bytes' },
      },
    }
  },
}
