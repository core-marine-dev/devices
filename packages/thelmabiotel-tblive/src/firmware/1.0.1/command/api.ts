import { API_END } from '../../../constants'
import type { CommandAPIFrame, Frame } from '../../../types'

export const parseAPI = (text: string): CommandAPIFrame | Frame => {
  const name = 'api'
  // Incomplete Frame
  const endIndex = text.indexOf(API_END)
  if (endIndex === -1) { return { name, raw: text, error: 'frame incomplete' } }
  // Get API
  const raw = text.slice(0, endIndex + API_END.length)
  return {
    name,
    raw,
    data: [raw],
    fields: [{ name: 'api', type: 'string', data: raw }],
    metadata: {
      api: raw
    }
  }
}
