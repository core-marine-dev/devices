
import type { SBGFrameNameTypeData } from '../../types'
import { getSBGFrameData as getCommand } from './commands'
import { getSBGFrameData as getLog } from './logs'
import { getSBGFrameData as getHighFrequency } from './high-frequency'
import { getSBGFrameData as getNMEAStandard } from './nmea-standard'
import { getSBGFrameData as getNMEAPropietary } from './nmea-propietary'
import { getSBGFrameData as getThirdParty } from './third-party'
import { SBGFrameMessageClasses, SBGFrameTypes, UNKNOWN_SBG_FRAME_DATA } from '../../constants'
/** Message Class:
 * HEX  DEC  Type
 * 0x10  16  Command
 * 0x00   0  Logs
 * 0x01   1  High frequency output
 * 0x02   2  NMEA output logs
 * 0x03   3  Propietary NMEA output logs
 * 0x04   4  3rd party output
 */
export const getSBGFrame = (messageClass: number, messageID: number, payload: Buffer): SBGFrameNameTypeData => {
  switch (messageClass) {
    case SBGFrameMessageClasses.CMD:
      return {
        type: SBGFrameTypes.CMD,
        ...getCommand(messageID, payload)
      }
    case SBGFrameMessageClasses.LOG:
      return {
        type: SBGFrameTypes.LOG,
        ...getLog(messageID, payload)
      }
    case SBGFrameMessageClasses.HIGH_FREQ:
      return {
        type: SBGFrameTypes.HIGH_FREQ,
        ...getHighFrequency(messageID, payload)
      }
    case SBGFrameMessageClasses.NMEA_STANDARD:
      return {
        type: SBGFrameTypes.NMEA_STANDARD,
        ...getNMEAStandard(messageID, payload)
      }
    case SBGFrameMessageClasses.NMEA_PROPIETARY:
      return {
        type: SBGFrameTypes.NMEA_PROPIETARY,
        ...getNMEAPropietary(messageID, payload)
      }
    case SBGFrameMessageClasses.THIRD_PARTY:
      return {
        type: SBGFrameTypes.THIRD_PARTY,
        ...getThirdParty(messageID, payload)
      }
  }
  return UNKNOWN_SBG_FRAME_DATA
}
