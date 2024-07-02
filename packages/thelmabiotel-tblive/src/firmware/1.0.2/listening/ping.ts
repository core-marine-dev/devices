import { SerialNumberSchema } from '../../../schemas'
import { PING_END, PING_START } from '../../../constants'
import type { Frame, ListeningPingFrame, SerialNumber } from '../../../types'

/**
 * PING:
 * Request -> ?
 * Response -> SN=XXXXXXX ><>\r
*/
export const parsePing = (text: string): ListeningPingFrame | Frame => {
  const name = 'ping'
  const raw = text
  const sn = text.slice(PING_START.length, -PING_END.length).trim()
  const parse = SerialNumberSchema.safeParse(sn)
  if (!parse.success) return { raw, name, error: (parse.errors as string[])[0] }
  const receiver = parse.data as SerialNumber
  return {
    raw: text,
    name,
    data: [receiver],
    fields: [{ name: 'receiver', type: 'string', data: receiver }],
    metadata: { receiver }
  }
}
