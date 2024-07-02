import { LOG_INTERVALS, LOG_INTERVAL_FRAME_LENGTH, LOG_INTERVAL_START } from '../../../constants'
import type { CommandLogIntervalFrame, Frame } from '../../../types'
import { LogIntervalSchema } from '../../../schemas'
import { getParsedSchema } from '../../../utils'

export const parseLogInterval = (text: string): CommandLogIntervalFrame | Frame => {
  const name = 'log interval'
  // Incomplete Frame
  if (text.length < LOG_INTERVAL_FRAME_LENGTH) { return { name, raw: text, error: 'frame incomplete' } }
  // Get Log Interval
  const raw = text
  const li = raw.replace(LOG_INTERVAL_START, '')
  // Incorrect Log Interval
  if (isNaN(Number(li))) { return { name, raw, error: `${li} is not a number` } }
  const { data, error } = getParsedSchema(LogIntervalSchema, li)
  if (error !== undefined) { return { raw, name, error } }
  // Log Interval
  const logInterval = data as keyof typeof LOG_INTERVALS
  const metadata = LOG_INTERVALS[logInterval] ?? 'unknown'
  return {
    name,
    raw,
    data: [li],
    fields: [{ name: 'log interval', type: 'string', data: li, metadata }],
    metadata: {
      logInterval,
      time: metadata
    }
  }
}
