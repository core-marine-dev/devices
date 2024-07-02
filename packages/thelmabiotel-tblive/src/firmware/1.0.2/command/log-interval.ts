import { LOG_INTERVALS, LOG_INTERVAL_FRAME_LENGTH, LOG_INTERVAL_START } from '../../../constants'
import { LogIntervalSchema } from '../../../schemas'
import type { CommandLogIntervalFrame, Frame } from '../../../types'

export const parseLogInterval = (text: string): CommandLogIntervalFrame | Frame => {
  const name = 'log interval'
  // Incomplete Frame
  if (text.length < LOG_INTERVAL_FRAME_LENGTH) { return { name, raw: text, error: 'frame incomplete' } }
  // Get Log Interval
  const raw = text
  const li = raw.replace(LOG_INTERVAL_START, '')
  // Incorrect Log Interval
  if (isNaN(Number(li))) { return { name, raw, error: `${li} is not a number` } }
  const parsed = LogIntervalSchema.safeParse(li)
  if (!parsed.success) { return { name, raw, error: (parsed.errors as string[])[0] } }
  // Log Interval
  const logInterval = parsed.data as keyof typeof LOG_INTERVALS
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
