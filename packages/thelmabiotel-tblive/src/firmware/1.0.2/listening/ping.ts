import { SerialNumberSchema } from '../../../schemas'
import { PING_END, PING_START } from '../../../constants'
import type { Frame, ListeningPingFrame, SerialNumber } from '../../../types'
import { getParsedSchema } from '../../../utils'

/**
 * PING:
 * Request -> ?
 * Response -> SN=XXXXXXX ><>\r
*/
export const parsePing = (text: string): ListeningPingFrame | Frame => {
  const name = 'ping'
  const raw = text
  const sn = text.slice(PING_START.length, -PING_END.length).trim()
  const { data, error } = getParsedSchema(SerialNumberSchema, sn)
  if (error !== undefined) { return { raw, name, error } }
  const receiver = data as SerialNumber
  return {
    raw: text,
    name,
    data: [receiver],
    fields: [{ name: 'receiver', type: 'string', data: receiver }],
    metadata: { receiver }
  }
}
