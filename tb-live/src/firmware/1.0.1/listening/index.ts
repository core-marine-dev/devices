import { CLOCK_ROUND, CLOCK_SET, type FLAGS_LISTENING, PING_END, PING_START, SAMPLE_END, SAMPLE_START } from '../../../constants'
import type { ParsedFrame } from '../../../types'
import { parseClock } from './clock'
import { parsePing } from './ping'
import { parseSample } from './sample'

/** LISTENING MODE
 * 00 - Emitter sample  -> $...,..., ...\r (9 fields) === Acoustic detection
 * 00 - Receiver sample -> $...,..., ...\r (8 fields) === Log
 * 01 - Ping            -> SN=1234567 ><>\r
 * 02 - Round clock     -> ack01\r
 * 03 - Set clock       -> ack02\r
*/

export const sample = (text: string): ParsedFrame => {
  const endIndex = text.indexOf(SAMPLE_END) + SAMPLE_END.length
  if (endIndex === -1) return { frame: null, remainder: text }
  const data = text.slice(0, endIndex)
  if (data.includes(PING_START)) {
    const index = data.indexOf(PING_START)
    const subframe = data.slice(index)
    return { frame: parsePing(subframe), remainder: text.slice(0, index) + text.slice(endIndex) }
  }
  return { frame: parseSample(data), remainder: text.slice(endIndex) }
}

export const ping = (text: string): ParsedFrame => {
  let endIndex = text.indexOf(PING_END)
  if (endIndex === -1) return { frame: null, remainder: text }
  endIndex += PING_END.length
  const data = text.slice(0, endIndex)
  return { frame: parsePing(data), remainder: text.slice(endIndex) }
}

type ClockClosure = (text: string) => ParsedFrame

export const clock = (operation: 'round' | 'set'): ClockClosure => {
  const data = (operation === 'round') ? CLOCK_ROUND : CLOCK_SET

  const parseFrame = (text:string): ParsedFrame => (
    { frame: parseClock(data, operation), remainder: text.slice(data.length) }
  )

  return parseFrame
}

const ops = new Map<typeof FLAGS_LISTENING[number], (txt: string) => ParsedFrame>()
ops.set(SAMPLE_START, sample)
ops.set(PING_START, ping)
ops.set(CLOCK_ROUND, clock('round'))
ops.set(CLOCK_SET, clock('set'))

export const parse = (input: string, flag: typeof FLAGS_LISTENING[number]): ParsedFrame => {
  const parser = ops.get(flag)
  if (parser !== undefined) return parser(input)
  return { frame: null, remainder: input }
}
