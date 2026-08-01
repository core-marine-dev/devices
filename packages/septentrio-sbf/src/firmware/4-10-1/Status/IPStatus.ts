// coded
import { formatIP, formatMAC } from '../../../addresses'
import { DO_NOT_USE_UINT8 } from '../../../constants'
import type { BlockDefinition, FieldDefinition } from '../../../types'

/* IPStatus -> Number: 4058 => "OnChange" interval: output each time one or more
   IP parameters change

  This block contains information on the receiver's Ethernet interface (hostname,
  IP address, gateway, netmask and MAC address).

  IPStatus -------------------------------------------------------------------
  Block fields        Type  Units       Do-Not-Use  Description
  MACAddress      uint8[6]                          MAC address. The first byte corresponds to the MSB of the address.
  IPAddress      uint8[16]         All elements set to 0  IP address. For future upgradability this field can contain a
                                                    128-bit IPv6 address. In the current firmware version, the first 12
                                                    bytes are always set to 0, and the last 4 bytes contain the IPv4 IP
                                                    address, or are set to zero if the IP address is not known or not
                                                    applicable.
  Gateway        uint8[16]         All elements set to 0  Gateway address, same encoding as IPAddress.
  Netmask            uint8                     255  Number of bits used to identify the network (CIDR notation).
  Reserved        uint8[3]                          Reserved for future use, to be ignored by decoding software.
Rev 1 HostName  char[32]                           Receiver hostname on the Ethernet interface, or empty if not known.
  Padding             uint                          Padding bytes

  The address fields are byte arrays, not text, so they carry a `format` and their
  `value` is the address as a string — `'192.168.1.10'`, `'00:11:22:33:44:55'` —
  with the bytes still in `raw`. An all-zero address is the block's own
  Do-Not-Use, and formats to `''`.
*/
const REVISION_0: readonly FieldDefinition[] = [
  { name: 'MACAddress', type: 'string', length: 6, format: formatMAC, description: 'MAC address of the Ethernet interface; the first byte is the most significant' },
  { name: 'IPAddress', type: 'string', length: 16, format: formatIP, description: 'IP address of the Ethernet interface, IPv4 in the last 4 of 16 bytes; empty when not known or not applicable' },
  { name: 'Gateway', type: 'string', length: 16, format: formatIP, description: 'Gateway address, same 16-byte encoding as IPAddress; empty when not known or not applicable' },
  { name: 'Netmask', type: 'uint8', units: 'bits', doNotUse: DO_NOT_USE_UINT8, description: 'Number of bits identifying the network (CIDR notation)' },
  { name: 'Reserved', type: 'string', length: 3, reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
]

const REVISION_1: readonly FieldDefinition[] = [
  ...REVISION_0,
  { name: 'HostName', type: 'string', length: 32, description: 'Receiver hostname on the Ethernet interface, empty if not known' },
]

// The fields that go into the aggregate as-is; `IPAddress` is the exception,
// because it is joined with the netmask into CIDR form.
const PLAIN: Readonly<Record<string, string>> = {
  gateway: 'Gateway',
  hostname: 'HostName',
  mac: 'MACAddress',
}

export const ipStatus: BlockDefinition = {
  name: 'IPStatus',
  number: 4058,
  description: 'The receiver\'s Ethernet interface: hostname, IP address, gateway, netmask and MAC address',
  timestamp: 'receiver',
  revisions: [REVISION_0, REVISION_1],
  // The network identity as one object, in the form an operator would type into a
  // browser — and with the netmask in CIDR form next to the address.
  payloadMetadata: (values) => {
    const network: Record<string, string> = {}
    for (const [key, name] of Object.entries(PLAIN)) {
      const value = values[name]
      // Every one of these is empty when the receiver does not know it.
      if (typeof value === 'string' && value !== '') network[key] = value
    }
    const address = values.IPAddress
    if (typeof address === 'string' && address !== '') {
      const netmask = values.Netmask
      network.address = (typeof netmask === 'number') ? `${address}/${netmask}` : address
    }
    return (Object.keys(network).length === 0) ? {} : { network }
  },
}
