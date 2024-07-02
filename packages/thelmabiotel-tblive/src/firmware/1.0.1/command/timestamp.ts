import { TIMESTAMP_FRAME_LENGTH, TIMESTAMP_START } from '../../../constants'
import { TimestampSchema } from '../../../schemas'
import type { CommandTimestampFrame, Frame, Timestamp } from '../../../types'
import { getParsedSchema } from '../../../utils'

export const parseTimestamp = (text: string): CommandTimestampFrame | Frame => {
  const name = 'device time'
  // Incomplete Frame
  if (text.length < TIMESTAMP_FRAME_LENGTH) { return { name, raw: text, error: 'frame incomplete' } }
  // Get Timestamp
  const raw = text
  const tm = raw.replace(TIMESTAMP_START, '')
  // Incorrect Timestamp
  if (isNaN(Number(tm))) { return { name, raw, error: `${tm} is not a string-number` } }
  const { data, error } = getParsedSchema(TimestampSchema, tm)
  if (error !== undefined) { return { raw, name, error } }
  // Timestamp
  const seconds = data as Timestamp
  const timestamp = Number(seconds) * 1000
  const date = (new Date(timestamp)).toISOString()
  return {
    name,
    raw,
    data: [tm],
    fields: [{ name: 'timestamp', type: 'uint16', units: 'seconds', data: seconds, metadata: date }],
    metadata: {
      timestamp,
      date
    }
  }
}
