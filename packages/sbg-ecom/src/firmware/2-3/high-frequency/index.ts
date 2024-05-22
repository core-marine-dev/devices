import { UNKNOWN_SBG_FRAME_DATA } from '../../../constants'
import { SBGDataParser, SBGFrameNameData } from '../../../types'

const highFrequency = new Map<number, SBGDataParser>()

export const getSBGFrameData = (messageID: number, payload: Buffer): SBGFrameNameData => {
  const parser = highFrequency.get(messageID)
  if (parser != null) return parser(payload)
  return {
    name: UNKNOWN_SBG_FRAME_DATA.name,
    data: UNKNOWN_SBG_FRAME_DATA.data
  }
}
