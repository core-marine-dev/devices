// coded
import type { BlockDefinition, FieldDefinition } from '../../../types'

/* Comment -> Number: 5936 => "OnChange" interval: block generated each time a
   comment is entered with setObserverComment

  The Comment block contains a comment string as entered with the
  setObserverComment command.

  Comment --------------------------------------------------------------------
  Block fields             Type  Units Do-Not-Use  Description
  CommentLn              uint16                    Length of the Comment string, in characters. The maximum length of a
                                                   comment is 120 characters.
  Comment      char[CommentLn]                    Comment string, as entered with the setObserverComment command. Note
                                                   that this string is NOT terminated by the "\0" character.
  Padding                  uint                    Padding bytes

  Note the difference from RxMessage: this string is NOT NUL-terminated, so its
  length field is the only thing that says where it ends — which is exactly what
  `lengthFrom` reads.
*/
const FIELDS: readonly FieldDefinition[] = [
  { name: 'CommentLn', type: 'uint16', description: 'Length of the comment in characters; the maximum is 120' },
  { name: 'Comment', type: 'string', lengthFrom: 'CommentLn', description: 'The comment as entered with setObserverComment. NOT NUL-terminated' },
]

export const comment: BlockDefinition = {
  name: 'Comment',
  number: 5936,
  description: 'A comment string entered by the observer with the setObserverComment command',
  timestamp: 'receiver',
  revisions: [FIELDS],
}
