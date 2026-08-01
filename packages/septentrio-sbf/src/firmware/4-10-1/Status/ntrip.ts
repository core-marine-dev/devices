// coded
import type { Decoder } from '../../../types'
import { bitState, label } from '../../../utils'

/* Shared between NTRIPClientStatus (4053) and NTRIPServerStatus (4122).
  Both blocks have the same SHAPE — N, SBLength, then N connection sub-blocks of
  { CDIndex, Status, ErrorCode, Info } — and the same Status and Info meanings.

  What they do NOT share is the ERROR TABLE. The client's has 14 codes and
  includes "Waiting for GGA" and "Out of region"; the server's has 11 and includes
  "Configuration conflict error". Sharing one table would silently mislabel half
  the errors on one of the two blocks, so each keeps its own.
*/
export const NTRIP_STATUS: Readonly<Record<number, string>> = {
  0: 'DISABLED',
  1: 'INITIALIZING',
  2: 'RUNNING',
  3: 'ERROR',
  4: 'RETRYING',
  5: 'DISABLED_DUPLICATE_SETTINGS',
}

export const ntripStatus: Decoder = (value) => label(NTRIP_STATUS, value)

// Bit 0: TLS was used to make a secure NTRIP connection if this bit is set.
export const ntripInfo: Decoder = (value) => ({ tls: bitState(value, 0) })
