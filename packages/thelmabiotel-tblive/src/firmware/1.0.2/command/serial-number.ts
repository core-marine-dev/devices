import { SerialNumberSchema } from '../../../schemas'
import { SERIAL_NUMBER_FRAME_LENGTH_MAX, SERIAL_NUMBER_START } from '../../../constants'
import type { Frame, CommandSerialNumberFrame, SerialNumber } from '../../../types'
import { getParsedSchema } from '../../../utils'

export const parseSerialNumber = (text: string): CommandSerialNumberFrame | Frame => {
  const name = 'serial number'
  // Incomplete Frame
  if (text.length < SERIAL_NUMBER_FRAME_LENGTH_MAX) { return { name, raw: text, error: 'frame incomplete' } }
  // Get Serial Number
  const raw = text
  const serialnumber = raw.replace(SERIAL_NUMBER_START, '')
  const { data, error } = getParsedSchema(SerialNumberSchema, serialnumber)
  // Incorrect Serial Number
  if (error !== undefined) { return { raw, name, error } }
  // Serial Number
  const sn = data as SerialNumber
  return {
    name,
    raw,
    data: [sn],
    fields: [{ name: 'serial number', type: 'string', data: sn }],
    metadata: {
      receiver: sn
    }
  }
}
