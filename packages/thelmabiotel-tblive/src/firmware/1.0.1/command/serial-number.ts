import { SerialNumberSchema } from '../../../schemas'
import { SERIAL_NUMBER_FRAME_LENGTH_MAX, SERIAL_NUMBER_START } from '../../../constants'
import type { Frame, CommandSerialNumberFrame, SerialNumber } from '../../../types'

export const parseSerialNumber = (text: string): CommandSerialNumberFrame | Frame => {
  const name = 'serial number'
  // Incomplete Frame
  if (text.length < SERIAL_NUMBER_FRAME_LENGTH_MAX) { return { name, raw: text, error: 'frame incomplete' } }
  // Get Serial Number
  const raw = text
  const data = raw.replace(SERIAL_NUMBER_START, '')
  const parsed = SerialNumberSchema.safeParse(data)
  // Incorrect Serial Number
  if (!parsed.success) { return { name, raw, error: (parsed.errors as string[])[0] } }
  // Serial Number
  const sn = parsed.data as SerialNumber
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
