import { PROTOCOLS, PROTOCOLS_FRAME_LENGTH, PROTOCOLS_START } from '../../../constants'
import type { CommandProtocolsFrame, Frame } from '../../../types'
import { ProtocolSchema } from '../../../schemas'

export const parseProtocols = (text: string): CommandProtocolsFrame | Frame => {
  const name = 'listening protocols'
  // Incomplete Frame
  if (text.length < PROTOCOLS_FRAME_LENGTH) { return { name, raw: text, error: 'frame incomplete' } }
  // Get Protocols
  const raw = text
  const lm = raw.replace(PROTOCOLS_START, '')
  // Incorrect Protocols
  if (isNaN(Number(lm))) { return { name, raw, error: `${lm} is not a number` } }
  const parsed = ProtocolSchema.safeParse(lm)
  if (!parsed.success) { return { name, raw, error: (parsed.errors as string[])[0] } }
  // Protocols
  const lmProtocol = parsed.data as keyof typeof PROTOCOLS
  const metadata = PROTOCOLS[lmProtocol]
  return {
    name,
    raw,
    data: [lm],
    fields: [{ name: 'protocols', type: 'string', data: lmProtocol, metadata }],
    metadata: {
      lm: lmProtocol,
      channel: metadata.channel,
      protocols: {
        id: [...metadata.id],
        data: [...metadata.data]
      }
    }
  }
}
