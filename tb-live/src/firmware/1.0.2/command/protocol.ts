import * as v from 'valibot'
import { PROTOCOLS, PROTOCOLS_FRAME_LENGTH, PROTOCOLS_START } from '../../../constants'
import type { CommandProtocolsFrame, Frame } from '../../../types'

export const ProtocolSchema = v.string(
  [
    v.custom(input => !isNaN(Number(input)), 'it is not a number'),
    v.custom(input => Number.isInteger(Number(input)), 'it is not an integer'),
    v.custom(input => input in PROTOCOLS, 'invalid listenning mode protocol')
  ]
)

export const parseProtocols = (text: string): CommandProtocolsFrame | Frame => {
  const name = 'listening protocols'
  // Incomplete Frame
  if (text.length < PROTOCOLS_FRAME_LENGTH) { return { name, raw: text, error: 'frame incomplete' } }
  // Get Protocols
  const raw = text
  const lm = raw.replace(PROTOCOLS_START, '')
  // Incorrect Protocols
  if (isNaN(Number(lm))) { return { name, raw, error: `${lm} is not a number` } }
  const parsed = v.safeParse(ProtocolSchema, lm)
  if (!parsed.success) { return { name, raw, error: parsed.issues[0].message } }
  // Protocols
  const lmProtocol = parsed.output as keyof typeof PROTOCOLS
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
