// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label, printableText } from '../../../utils'

/* EncapsulatedOutput -> Number: 4097 => "OnChange" interval: output each time an
   RTCM, CMR, NMEA or ASCIIDisplay message is output

  The EncapsulatedOutput block encapsulates non-SBF output messages into SBF. It
  is enabled with the Encapsulate option of the setDataInOut command.

  EncapsulatedOutput ---------------------------------------------------------
  Block fields        Type  Units Do-Not-Use  Description
  Mode               uint8                    Type of the message encapsulated in the Payload field:
                                                0: RTCMv2
                                                1: CMRv2
                                                2: RTCMv3
                                                4: NMEA
                                                5: ASCIIDisplay
  Reserved           uint8                    Reserved for future use, to be ignored by decoding software
  N                 uint16                    Length of Payload in bytes
  ReservedId        uint16                    Reserved for future use
  Payload        uint8[N]                     Encapsulated message
  Padding             uint                    Padding bytes

  Two of the five modes carry TEXT (NMEA, ASCIIDisplay) and three carry binary
  frames, so `Payload` publishes text only when every byte is printable — see
  `printableText`. For the binary modes the base64 `raw` is the message, and
  `Mode` in the field metadata says which decoder it belongs to.

  This is also how a Septentrio receiver can deliver its own NMEA over a single
  SBF stream, which is worth knowing when the NMEA protocol is added to the
  Septentrio facade: the sentences may arrive INSIDE these blocks rather than
  interleaved on the wire.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'Mode', type: 'uint8', description: 'Type of the encapsulated message: RTCMv2, CMRv2, RTCMv3, NMEA or ASCIIDisplay' },
  { name: 'Reserved', type: 'uint8', reserved: true, description: 'Reserved for future use, to be ignored by decoding software' },
  { name: 'N', type: 'uint16', units: 'bytes', description: 'Length of the encapsulated message' },
  { name: 'ReservedId', type: 'uint16', reserved: true, description: 'Reserved for future use' },
  { name: 'Payload', type: 'string', lengthFrom: 'N', format: printableText, description: 'The encapsulated message; text for the NMEA and ASCIIDisplay modes, otherwise read it from raw' },
]

export const ENCAPSULATED_MODE: Readonly<Record<number, string>> = {
  0: 'RTCMv2',
  1: 'CMRv2',
  2: 'RTCMv3',
  4: 'NMEA',
  5: 'ASCIIDisplay',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Mode: (value) => label(ENCAPSULATED_MODE, value),
}

export const encapsulatedOutput: BlockDefinition = {
  name: 'EncapsulatedOutput',
  number: 4097,
  description: 'A non-SBF message (RTCM, CMR, NMEA or ASCIIDisplay) wrapped in an SBF block so one stream carries everything',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
  // Which protocol the consumer has to hand this payload to, without re-reading
  // the Mode code.
  payloadMetadata: ({ Mode, N }) => {
    if (typeof Mode !== 'number') return {}
    return { encapsulated: { protocol: ENCAPSULATED_MODE[Mode] ?? 'UNKNOWN', bytes: Number(N ?? 0) } }
  },
}
