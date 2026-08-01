// installed
import { toBase64 } from '@coremarine/protocol-core'

// coded
import { DO_NOT_USE_UINT8 } from '../../../constants'
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* DiffCorrIn -> Number: 5919 => "OnChange" interval: each time a RTCM or CMR
   message is received

  The DiffCorrIn block contains incoming RTCM or CMR messages. The length of the
  block depends on the message type and contents.

  DiffCorrIn -----------------------------------------------------------------
  Block fields    Type  Units Do-Not-Use  Description
  Mode           uint8                    0: RTCMv2   1: CMRv2   2: RTCMv3   3: RTCMV (a proprietary variant of RTCM2)
                                          4: SPARTN   5: Reserved
  Source         uint8              255   Receiver connection the message was received from:
                                            0 COM1, 1 COM2, 2 COM3, 3 COM4, 4 USB1, 5 USB2, 6 IP connection,
                                            7 SBF file, 8 L-Band (decoded by the built-in L-band demodulator),
                                            9 NTRIP, 10 OTG1, 11 OTG2, 12 Bluetooth, 15 UHF modem,
                                            16 IPR connection, 17 Direct call port, 18 IPS connection
  If Mode is 0: RTCM2Words   uint32[N]     30-bit words of the RTCM2 message. The Data Word Length is variable and
                                           depends on the contents:  N = 2 + ((RTCM2Words[1] >> 9) & 0x1f).
                                           N ranges 2 to 33; the first two words are the header and are always present.
                                           Bits 0-5 are parity (already checked — the block only contains valid words),
                                           bits 6-29 the 24 information bits (first received bit is the MSB),
                                           bits 30-31 bits 0 and 1 of the PRECEDING word.
  If Mode is 1: CMRMessage    uint8[N]     N depends on the CMR message type.
  If Mode is 2: RTCM3Message  uint8[N]     N depends on the RTCM 3 message type.
  If Mode is 3: RTCMVMessage  uint8[N]     N depends on the RTCMV message type.
  Padding                      uint        Padding bytes

  ⚠️ THE ONLY BLOCK SO FAR WITH A MODE-DEPENDENT LAYOUT, and it cannot be a field
  table: which field follows depends on `Mode`, and for RTCM2 the element count is
  computed from the CONTENT of the second word. Rather than pretend, the tail is
  published as ONE opaque field carrying the correction message verbatim — its
  `value` is the message in base64 (the same bytes as its `raw`), which is exactly
  what a consumer forwarding corrections to another device needs. `Mode` says how
  to interpret it, and decoding RTCM/CMR is a different library's job.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'Mode', type: 'uint8', description: 'Format of the incoming message: 0 RTCMv2, 1 CMRv2, 2 RTCMv3, 3 RTCMV, 4 SPARTN' },
  { name: 'Source', type: 'uint8', doNotUse: DO_NOT_USE_UINT8, description: 'Receiver connection the message arrived on' },
  {
    name: 'Message',
    type: 'string',
    rest: true,
    format: toBase64,
    description: 'The incoming differential correction message, verbatim, base64-encoded. Interpret it according to Mode; this parser makes no claim about its internal structure',
  },
]

export const DIFF_CORR_MODE: Readonly<Record<number, string>> = {
  0: 'RTCMv2',
  1: 'CMRv2',
  2: 'RTCMv3',
  3: 'RTCMV',
  4: 'SPARTN',
  5: 'RESERVED',
}

export const DIFF_CORR_SOURCE: Readonly<Record<number, string>> = {
  0: 'COM1',
  1: 'COM2',
  2: 'COM3',
  3: 'COM4',
  4: 'USB1',
  5: 'USB2',
  6: 'IP',
  7: 'SBF_FILE',
  8: 'LBAND',
  9: 'NTRIP',
  10: 'OTG1',
  11: 'OTG2',
  12: 'BLUETOOTH',
  15: 'UHF_MODEM',
  16: 'IPR',
  17: 'DIRECT_CALL_PORT',
  18: 'IPS',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Mode: (value) => label(DIFF_CORR_MODE, value),
  Source: (value) => label(DIFF_CORR_SOURCE, value),
}

export const diffCorrIn: BlockDefinition = {
  name: 'DiffCorrIn',
  number: 5919,
  description: 'An incoming differential correction message (RTCM, CMR or SPARTN) exactly as received, with the format and the connection it came from',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
