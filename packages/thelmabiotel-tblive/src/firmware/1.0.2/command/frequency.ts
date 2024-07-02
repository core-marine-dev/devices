import { FREQUENCY_FRAME_LENGTH, FREQUENCY_START } from '../../../constants'
import { FrequencySchema } from '../../../schemas'
import type { CommandFrequencyFrame, Frame, Frequency } from '../../../types'

export const parseFrequency = (text: string): CommandFrequencyFrame | Frame => {
  const name = 'frequency'
  // Incomplete Frame
  if (text.length < FREQUENCY_FRAME_LENGTH) { return { name, raw: text, error: 'frame incomplete' } }
  // Get Frequency
  const raw = text
  const fq = raw.replace(FREQUENCY_START, '')
  const numFq = Number(fq)
  // Incorrect Frequency
  if (isNaN(numFq)) { return { name, raw, error: `${fq} is not a number` } }
  const parsed = FrequencySchema.safeParse(numFq)
  if (!parsed.success) { return { name, raw, error: (parsed.errors as string[])[0] } }
  // Frequency
  const frequency = parsed.data as Frequency
  return {
    name,
    raw,
    data: [frequency],
    fields: [{ name: 'frequency', type: 'uint8', units: 'kHz', data: frequency }],
    metadata: {
      frequency
    }
  }
}
