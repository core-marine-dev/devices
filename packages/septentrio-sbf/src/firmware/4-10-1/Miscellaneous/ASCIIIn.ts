// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { connectionDescriptor } from '../Status/links'

/* ASCIIIn -> Number: 4075 => "OnChange" interval: block generated each time an
   ASCII string is received

  The ASCIIIn block contains a string that has been received on one of the
  receiver's connection ports.

  More specifically, this block is output each time an end-of-line character is
  received on a communication port configured to receive ASCIIIn input (with the
  setDataInOut command). The string reported in this block contains all characters
  received since the previous occurrence of an end-of-line character.

  The maximum length of the string is 2000 characters. If there are more than 2000
  characters between the occurrence of two successive end-of-line characters, the
  string is discarded.

  ASCIIIn --------------------------------------------------------------------
  Block fields             Type  Units Do-Not-Use  Description
  CD                      uint8                    Identifier of the connection from which the data has been received
                                                   (see ../Status/links.ts for the numbering)
  Reserved1            uint8[3]                    Reserved, contents to be ignored
  StringLn               uint16                    Length of ASCIIString in characters
  SensorModel          char[20]                    Not supported, reserved for future use
  SensorType           char[20]                    Not supported, reserved for future use
  Reserved2            uint8[20]                   Reserved, contents to be ignored
  ASCIIString  char[StringLn]                      ASCII string. Note that this string is not terminated by the "\0"
                                                   character. The string does not include the end-of-line character(s)
                                                   (carriage return and/or line feed).
  Padding                  uint                    Padding bytes

  This is the block that carries a THIRD-PARTY sensor's own text into SBF — a
  gyro, an echo sounder, anything wired into a port set to ASCIIIn. `SensorModel`
  and `SensorType` are the fields Septentrio reserved to say which sensor it came
  from; the firmware does not fill them, so they are flagged reserved and the CD
  is the only thing that identifies the source.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'CD', type: 'uint8', description: 'Connection descriptor: the port the string arrived on' },
  { name: 'Reserved1', type: 'string', length: 3, reserved: true, description: 'Reserved, contents to be ignored' },
  { name: 'StringLn', type: 'uint16', description: 'Length of ASCIIString in characters; the maximum is 2000' },
  { name: 'SensorModel', type: 'string', length: 20, reserved: true, description: 'Not supported, reserved for future use' },
  { name: 'SensorType', type: 'string', length: 20, reserved: true, description: 'Not supported, reserved for future use' },
  { name: 'Reserved2', type: 'string', length: 20, reserved: true, description: 'Reserved, contents to be ignored' },
  { name: 'ASCIIString', type: 'string', lengthFrom: 'StringLn', description: 'The received string, NOT NUL-terminated and without its end-of-line character(s)' },
]

const decoders: Readonly<Record<string, Decoder>> = {
  CD: connectionDescriptor,
}

export const asciiIn: BlockDefinition = {
  name: 'ASCIIIn',
  number: 4075,
  description: 'One line of ASCII text received on a port configured for ASCIIIn input, as sent by a third-party sensor',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
