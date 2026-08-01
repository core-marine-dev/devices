// coded
import { ntripInfo, ntripStatus } from './ntrip'

import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* NTRIPClientStatus -> Number: 4053 => "OnChange" interval: 1s
  This block reports the current status of the NTRIP client connections.

  NTRIPClientStatus ----------------------------------------------------------
  Block fields             Type  Units Do-Not-Use  Description
  N                       uint8                    Number of NTRIP client connections for which status is provided in
                                                   this block, i.e. number of NTRIPClientConnection sub-blocks.
  SBLength                uint8  1 byte            Length of one NTRIPClientConnection sub-block
  NTRIPClientConnection                            A succession of N NTRIPClientConnection sub-blocks
  Padding                  uint                    Padding bytes

  NTRIPClientConnection ------------------------------------------------------
  Block fields   Type  Description
  CDIndex       uint8  Index of the NTRIP connection (1 for NTR1, 2 for NTR2, etc) for which status is
                       provided in this sub-block.
  Status        uint8  NTRIP client status:
                         0: Connection disabled
                         1: Initializing
                         2: Running, differential corrections are being received and the link statistics
                            is available in the InputLink block.
                         3: Error detected, the error code is provided in the next field.
                         4: Retrying, client encountered an error, we are trying to reconnect. The error
                            code is provided in the next field.
                         5: Disabled since the settings are a duplicate of another active NTRIP connection.
  ErrorCode     uint8  NTRIP error code:
                         0:  No error                    1:  Initialization error (e.g. source table retrieval failure)
                         2:  Authentication error        3:  Connection error
                         4:  Mountpoint does not exist   5:  Mountpoint unavailable
                         6:  Waiting for GGA             7:  GGA sending disabled when required by mountpoint
                         8:  Resolving host failed       9:  Out of region
                        10:  TLS setup error            11:  TLS handshake error
                        12:  TLS fingerprint error      13:  TLS time not known
                       254:  Unknown error
  Info          uint8  Bitfield indicating miscellaneous info about the Connection status:
                         Bit 0: TLS was used to make secure NTRIP connection if this bit is set
                         Bits 1-7: Reserved
  Padding        uint  Padding bytes

  Two of these error codes are worth reading twice on a vessel: **6 "Waiting for
  GGA"** and **7 "GGA sending disabled when required by mountpoint"** mean the
  correction stream is stalled because the RECEIVER is not telling the caster where
  it is — a configuration problem, not a network one.
*/
const NTRIP_CLIENT_CONNECTION: readonly FieldDefinition[] = [
  { name: 'CDIndex', type: 'uint8', description: 'Index of the NTRIP connection: 1 for NTR1, 2 for NTR2, etc.' },
  { name: 'Status', type: 'uint8', description: 'Client status: 0 disabled, 1 initializing, 2 running (corrections arriving), 3 error, 4 retrying, 5 disabled as a duplicate' },
  { name: 'ErrorCode', type: 'uint8', description: 'NTRIP client error code; 0 means no error' },
  { name: 'Info', type: 'uint8', description: 'Bit field: bit 0 set when TLS was used for a secure NTRIP connection' },
]

const FIELDS: readonly FieldDefinition[] = [
  { name: 'N', type: 'uint8', description: 'Number of NTRIP client connections reported in this block' },
  { name: 'SBLength', type: 'uint8', units: 'bytes', description: 'Length of one NTRIPClientConnection sub-block' },
  { name: 'NTRIPClientConnection', count: 'N', length: 'SBLength', fields: NTRIP_CLIENT_CONNECTION, description: 'A succession of N NTRIPClientConnection sub-blocks' },
]

export const NTRIP_CLIENT_ERROR: Readonly<Record<number, string>> = {
  0: 'NO_ERROR',
  1: 'INITIALIZATION_ERROR',
  2: 'AUTHENTICATION_ERROR',
  3: 'CONNECTION_ERROR',
  4: 'MOUNTPOINT_DOES_NOT_EXIST',
  5: 'MOUNTPOINT_UNAVAILABLE',
  6: 'WAITING_FOR_GGA',
  7: 'GGA_SENDING_DISABLED_BUT_REQUIRED',
  8: 'RESOLVING_HOST_FAILED',
  9: 'OUT_OF_REGION',
  10: 'TLS_SETUP_ERROR',
  11: 'TLS_HANDSHAKE_ERROR',
  12: 'TLS_FINGERPRINT_ERROR',
  13: 'TLS_TIME_NOT_KNOWN',
  254: 'UNKNOWN_ERROR',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Status: ntripStatus,
  ErrorCode: (value) => label(NTRIP_CLIENT_ERROR, value),
  Info: ntripInfo,
}

export const ntripClientStatus: BlockDefinition = {
  name: 'NTRIPClientStatus',
  number: 4053,
  description: 'Status of the NTRIP client connections — the receiver as a consumer of differential corrections',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
