import * as v from 'valibot'
import { SerialNumberSchema } from '../../../schemas'
import { PING_END, PING_START } from '../../../constants'
import type { Frame, ListeningPingFrame } from '../../../types'

/**
 * PING:
 * Request -> ?
 * Response -> SN=XXXXXXX ><>\r
*/
export const parsePing = (text: string): ListeningPingFrame | Frame => {
  const name = 'ping'
  const raw = text
  const sn = text.slice(PING_START.length, -PING_END.length).trim()
  const parse = v.safeParse(SerialNumberSchema, sn)
  if (!parse.success) return { raw, name, error: parse.issues[0].message }
  const receiver = parse.output
  return {
    raw: text,
    name,
    data: [receiver],
    fields: [{ name: 'receiver', type: 'string', data: receiver }],
    metadata: { receiver }
  }
}
