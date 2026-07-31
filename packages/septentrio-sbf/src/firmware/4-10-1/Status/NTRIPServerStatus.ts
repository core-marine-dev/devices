// coded
import { ntripInfo, ntripStatus } from './ntrip'

import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* NTRIPServerStatus -> Number: 4122 => "OnChange" interval: 1s
  This block reports the current status of the NTRIP server connections.

  NTRIPServerStatus ----------------------------------------------------------
  Block fields             Type  Units Do-Not-Use  Description
  N                       uint8                    Number of NTRIP server connections for which status is provided in
                                                   this block, i.e. number of NTRIPServerConnection sub-blocks.
  SBLength                uint8  1 byte            Length of one NTRIPServerConnection sub-block
  NTRIPServerConnection                            A succession of N NTRIPServerConnection sub-blocks
  Padding                  uint                    Padding bytes

  NTRIPServerConnection ------------------------------------------------------
  Block fields   Type  Description
  CDIndex       uint8  Index of the NTRIP connection (1 for NTR1, 2 for NTR2, etc) for which status is
                       provided in this sub-block.
  Status        uint8  NTRIP server status:
                         0: Connection disabled
                         1: Initializing
                         2: Running, differential corrections are being sent and the link statistics is
                            available in the OutputLink block.
                         3: Error detected, the error code is provided in the next field.
                         4: Error detected. Currently trying to reconnect. The error code is provided in
                            the next field.
                         5: Disabled since the settings are a duplicate of another active NTRIP connection.
  ErrorCode     uint8  NTRIP error code:
                         0:  No error                 1:  Initialization error
                         2:  Authentication error     3:  Connection error
                         4:  Mountpoint does not exist
                         5:  Configuration conflict error
                         6:  Resolving host failed    7:  TLS setup error
                         8:  TLS handshake error      9:  TLS fingerprint error
                        10:  TLS time not known
                       254:  Unknown error
  Info          uint8  Bitfield indicating miscellaneous info about the Connection status:
                         Bit 0: TLS was used to make secure NTRIP connection if this bit is set
                         Bits 1-7: Reserved
  Padding        uint  Padding bytes

  ⚠️ The SERVER error table is NOT the client's: code 5 is "Configuration conflict"
  here and "Mountpoint unavailable" there, and everything from 6 up is shifted.
  That is why the two tables are separate files rather than one shared enum — the
  shape is common (see ./ntrip.ts), the error meanings are not.
*/
const NTRIP_SERVER_CONNECTION: readonly FieldDefinition[] = [
  { name: 'CDIndex', type: 'uint8', description: 'Index of the NTRIP connection: 1 for NTR1, 2 for NTR2, etc.' },
  { name: 'Status', type: 'uint8', description: 'Server status: 0 disabled, 1 initializing, 2 running (corrections being sent), 3 error, 4 reconnecting, 5 disabled as a duplicate' },
  { name: 'ErrorCode', type: 'uint8', description: 'NTRIP server error code; 0 means no error' },
  { name: 'Info', type: 'uint8', description: 'Bit field: bit 0 set when TLS was used for a secure NTRIP connection' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of NTRIP server connections reported in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one NTRIPServerConnection sub-block' },
  { name: 'NTRIPServerConnection', count: 'N', length: 'SBLength', fields: NTRIP_SERVER_CONNECTION, description: 'A succession of N NTRIPServerConnection sub-blocks' },
]

export const NTRIP_SERVER_ERROR: Readonly<Record<number, string>> = {
  0: 'NO_ERROR',
  1: 'INITIALIZATION_ERROR',
  2: 'AUTHENTICATION_ERROR',
  3: 'CONNECTION_ERROR',
  4: 'MOUNTPOINT_DOES_NOT_EXIST',
  5: 'CONFIGURATION_CONFLICT_ERROR',
  6: 'RESOLVING_HOST_FAILED',
  7: 'TLS_SETUP_ERROR',
  8: 'TLS_HANDSHAKE_ERROR',
  9: 'TLS_FINGERPRINT_ERROR',
  10: 'TLS_TIME_NOT_KNOWN',
  254: 'UNKNOWN_ERROR',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Status: ntripStatus,
  ErrorCode: (value) => label(NTRIP_SERVER_ERROR, value),
  Info: ntripInfo,
}

export const ntripServerStatus: BlockDefinition = {
  name: 'NTRIPServerStatus',
  number: 4122,
  description: 'Status of the NTRIP server connections — the receiver as a source of differential corrections',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
