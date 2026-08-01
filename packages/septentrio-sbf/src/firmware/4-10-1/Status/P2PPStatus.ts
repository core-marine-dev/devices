// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { bits, bitState, label, UNKNOWN_LABEL } from '../../../utils'

/* P2PPStatus -> Number: 4238 => "OnChange" interval: 1s
  This block reports the status of the active P2PP (Point-to-Point Protocol)
  sessions. See the setPointToPoint command for details.

  P2PPStatus -----------------------------------------------------------------
  Block fields       Type  Units Do-Not-Use  Description
  N                 uint8                     Number of active P2PP sessions for which status is provided in this block,
                                              i.e. number of P2PPSession sub-blocks.
  SBLength          uint8  1 byte             Length of one P2PPSession sub-block
  P2PPSession                                 A succession of N P2PPSession sub-blocks
  Padding            uint                     Padding bytes

  P2PPSession ----------------------------------------------------------------
  Block fields       Type  Description
  SessionID         uint8  Index of the P2PP session (1 for P2PP1, 2 for P2PP2, etc) for which status is
                           provided in this sub-block.
  Port              uint8  Index for the COM port the P2PP session is configured on (1 for COM1, 2 for COM2, etc).
  Status            uint8  Bit field:
                             Bit 0: Mode: set if the P2PP session is in Server mode, unset if it is in
                                    Client mode (future functionality).
                             Bits 1-7: P2PP status:
                               0: Initializing
                               1: Waiting for Connection
                               2: Connected
                               3: Disconnecting
                               4: Error, see ErrorCode field below
  ErrorCode         uint8  P2PP error:
                             1: No error          2: Configuration      3: Port Acquisition
                             4: Port Lock         5: Start Daemon       6: Server Authentication
                             7: Client Authentication                   8: Timeout on Activity
                             9: Timeout on Negotiation                 10: Link Negotiation
                           255: Unspecified
  Padding            uint  Padding bytes

  Note the unusual encoding of `Status`: the state is in bits 1-7, NOT in the low
  bits — bit 0 is the server/client mode. Reading the byte as a state code would
  double every value.
*/
const P2PP_SESSION: readonly FieldDefinition[] = [
  { name: 'SessionID', type: 'uint8', description: 'Index of the P2PP session: 1 for P2PP1, 2 for P2PP2, etc.' },
  { name: 'Port', type: 'uint8', description: 'Index of the COM port the session is configured on: 1 for COM1, 2 for COM2, etc.' },
  { name: 'Status', type: 'uint8', description: 'Bit field: bit 0 set in Server mode (unset in Client mode), bits 1-7 the session state' },
  { name: 'ErrorCode', type: 'uint8', description: 'P2PP error code; 1 means no error, 255 unspecified' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of active P2PP sessions reported in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one P2PPSession sub-block' },
  { name: 'P2PPSession', count: 'N', length: 'SBLength', fields: P2PP_SESSION, description: 'A succession of N P2PPSession sub-blocks' },
]

export const P2PP_STATE: Readonly<Record<number, string>> = {
  0: 'INITIALIZING',
  1: 'WAITING_FOR_CONNECTION',
  2: 'CONNECTED',
  3: 'DISCONNECTING',
  4: 'ERROR',
}

export const P2PP_ERROR: Readonly<Record<number, string>> = {
  1: 'NO_ERROR',
  2: 'CONFIGURATION',
  3: 'PORT_ACQUISITION',
  4: 'PORT_LOCK',
  5: 'START_DAEMON',
  6: 'SERVER_AUTHENTICATION',
  7: 'CLIENT_AUTHENTICATION',
  8: 'TIMEOUT_ON_ACTIVITY',
  9: 'TIMEOUT_ON_NEGOTIATION',
  10: 'LINK_NEGOTIATION',
  255: 'UNSPECIFIED',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Status: (value) => ({
    mode: bitState(value, 0) ? 'SERVER' : 'CLIENT',
    state: P2PP_STATE[bits(value, 1, 7)] ?? UNKNOWN_LABEL,
  }),
  ErrorCode: (value) => label(P2PP_ERROR, value),
}

export const p2ppStatus: BlockDefinition = {
  name: 'P2PPStatus',
  number: 4238,
  description: 'Status of the active Point-to-Point Protocol sessions',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
