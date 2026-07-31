// coded
import type { BlockDefinition, Decoder, FieldDefinition } from '../../../types'
import { label } from '../../../utils'

/* RxMessage -> Number: 4103 => "OnChange" interval: block generated each time a
   message needs to be sent

  The receiver generates ASCII messages to help users follow the progress of
  processes such as file logging or FTP push (activity log). These messages are
  output in the RxMessage block, and they can also be retrieved from the command
  line using the lif, RxMessages command.

  RxMessage ------------------------------------------------------------------
  Block fields            Type  Units Do-Not-Use  Description
  Type                   uint8               255  Type of message contained in this block:
                                                    1: Asynchronous command reply
                                                    2: Message about internal logging
                                                    3: Message about FTP push
                                                    4: Message about Receiver Status
                                                    5: Message from slave GNSS receiver
                                                    6: Message about CloudIt
  Severity               uint8               255  Message severity:
                                                    1: Info
                                                    2: Warning
                                                    3: Error
  MessageID             uint32                 0  A unique value associated to each message. This is a counter starting at
                                                 1 for the first message after boot and incrementing at each message.
  StringLn              uint16                    Length of Message in characters, including the terminating \0.
  Reserved2           uint8[2]                    Reserved, contents to be ignored.
  Message      char[StringLn]                    Receiver message terminated by \0.
  Padding                 uint                    Padding bytes

  `Message` is the first field in this parser whose WIDTH comes from another
  field, which is why the engine grew `lengthFrom`.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'Type', type: 'uint8', doNotUse: 255, description: 'Kind of message: 1 asynchronous command reply, 2 internal logging, 3 FTP push, 4 receiver status, 5 slave GNSS receiver, 6 CloudIt' },
  { name: 'Severity', type: 'uint8', doNotUse: 255, description: 'Message severity: 1 info, 2 warning, 3 error' },
  { name: 'MessageID', type: 'uint32', doNotUse: 0, description: 'Unique value per message: a counter starting at 1 on the first message after boot' },
  { name: 'StringLn', type: 'uint16', description: 'Length of Message in characters, including the terminating NUL' },
  { name: 'Reserved2', type: 'uint16', reserved: true, description: 'Reserved, contents to be ignored' },
  { name: 'Message', type: 'string', lengthFrom: 'StringLn', description: 'The receiver message, NUL-terminated' },
]

export const MESSAGE_TYPE: Readonly<Record<number, string>> = {
  1: 'ASYNCHRONOUS_COMMAND_REPLY',
  2: 'INTERNAL_LOGGING',
  3: 'FTP_PUSH',
  4: 'RECEIVER_STATUS',
  5: 'SLAVE_GNSS_RECEIVER',
  6: 'CLOUDIT',
}

export const MESSAGE_SEVERITY: Readonly<Record<number, string>> = {
  1: 'INFO',
  2: 'WARNING',
  3: 'ERROR',
}

const decoders: Readonly<Record<string, Decoder>> = {
  Type: (value) => label(MESSAGE_TYPE, value),
  Severity: (value) => label(MESSAGE_SEVERITY, value),
}

export const rxMessage: BlockDefinition = {
  name: 'RxMessage',
  number: 4103,
  description: 'An ASCII message from the receiver about its own activity: logging, FTP push, status, or a command reply',
  timestamp: 'receiver',
  revisions: [FIELDS],
  decoders,
}
