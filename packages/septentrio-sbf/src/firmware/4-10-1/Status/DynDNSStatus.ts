// coded
import { formatIP } from '../../../addresses'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* DynDNSStatus -> Number: 4105 => "OnChange" interval: 1s
  This block contains dynamic DNS (DynDNS) status information.

  DynDNSStatus ---------------------------------------------------------------
  Block fields        Type  Units       Do-Not-Use  Description
  Status             uint8                          DynDNS status:
                                                      0:   DynDNS disabled
                                                      1:   Updating IP address
                                                      2:   IP address updated at the DynDNS server. DynDNS is ready to use.
                                                      254: Error detected, the error code is provided in the next field.
  ErrorCode          uint8                          DynDNS error code:
                                                      0:  No error                    1:  Unspecified error
                                                      2:  Abusive update              3:  User name and password mismatch
                                                      4:  Not a credited user         5:  Hostname is not a fully-qualified domain name
                                                      6:  Hostname does not exist in this user account
                                                      7:  Hostname blocked for update abuse
                                                      8:  Bad agent                   9:  DNS error
                                                     10:  DynDNS server problem or maintenance
                                                     11:  DynDNS server not reachable
Rev 1 IPAddress  uint8[16]         All elements set to 0  IP address that has been registered at the DynDNS server. For
                                                    future upgradability this field can contain a 128-bit IPv6 address.
                                                    In the current firmware version, the first 12 bytes are always set
                                                    to 0, and the last 4 bytes contain the IPv4 IP address, or are set
                                                    to zero if the IP address is not known or not applicable (e.g.
                                                    because registration failed).
  Padding             uint                          Padding bytes
*/
const REVISION_0: readonly FieldDefinition[] = [
  { name: 'Status', type: 'uint8', description: 'DynDNS status: 0 disabled, 1 updating the IP address, 2 updated and ready, 254 error (see ErrorCode)' },
  { name: 'ErrorCode', type: 'uint8', description: 'DynDNS error code; 0 means no error' },
]

const REVISION_1: readonly FieldDefinition[] = [
  ...REVISION_0,
  { name: 'IPAddress', type: 'string', length: 16, format: formatIP, description: 'The IP address registered at the DynDNS server; empty when not known, not applicable, or registration failed' },
]

export const DYNDNS_STATUS: Readonly<Record<number, string>> = {
  0: 'DISABLED',
  1: 'UPDATING',
  2: 'READY',
  254: 'ERROR',
}

export const DYNDNS_ERROR: Readonly<Record<number, string>> = {
  0: 'NO_ERROR',
  1: 'UNSPECIFIED_ERROR',
  2: 'ABUSIVE_UPDATE',
  3: 'USERNAME_PASSWORD_MISMATCH',
  4: 'NOT_A_CREDITED_USER',
  5: 'HOSTNAME_NOT_FULLY_QUALIFIED',
  6: 'HOSTNAME_NOT_IN_ACCOUNT',
  7: 'HOSTNAME_BLOCKED_FOR_UPDATE_ABUSE',
  8: 'BAD_AGENT',
  9: 'DNS_ERROR',
  10: 'SERVER_PROBLEM_OR_MAINTENANCE',
  11: 'SERVER_NOT_REACHABLE',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Status: (value) => label(DYNDNS_STATUS, value),
  ErrorCode: (value) => label(DYNDNS_ERROR, value),
}

export const dynDNSStatus: BlockDefinition = {
  name: 'DynDNSStatus',
  number: 4105,
  description: 'Dynamic DNS status: whether the receiver has registered its IP address, and why not if it has failed',
  timestamp: 'receiver',
  revisions: [REVISION_0, REVISION_1],
  decoders,
}
