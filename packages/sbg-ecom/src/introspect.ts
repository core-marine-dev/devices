// installed
import type { Result } from '@coremarine/protocol-core'

// coded
import { CLASS_NAMES, PROTOCOL_NAME } from './constants'
import { classesFor, logsFor } from './firmware'
import type { LogDefinition, SBGError, SBGFieldSpec, SBGSentenceDefinition } from './types'
import { logId } from './utils'

/* SELF-DESCRIPTION. These libraries run on remote installations with restricted
   internet access for years, so being able to ask the deployed binary what it
   expects — and to feed it a frame it built itself (src/fake.ts) — settles questions
   that would otherwise need the datasheet. */

const toSpec = (definition: LogDefinition): SBGFieldSpec[] =>
  definition.fields.map((field) => {
    const spec: SBGFieldSpec = { name: field.name, type: field.type }
    if (field.units !== undefined) spec.units = field.units
    if (field.description !== undefined) spec.description = field.description
    if (field.reserved === true) spec.reserved = true
    return spec
  })

const describe = (definition: LogDefinition, messageClass: number, firmware: string): SBGSentenceDefinition => {
  const entry: SBGSentenceDefinition = {
    id: logId(messageClass, definition.message),
    name: definition.name,
    protocol: { name: PROTOCOL_NAME, version: firmware },
    payload: toSpec(definition),
  }
  if (definition.description !== undefined) entry.description = definition.description
  if (definition.opaque === true) entry.opaque = true
  return entry
}

// Every eCom id this firmware knows, as the strings a CMA carries.
export const sentenceIdsFor = (firmware: string): string[] => {
  const ids: string[] = []
  for (const [messageClass, logs] of classesFor(firmware)) {
    for (const message of logs.keys()) ids.push(logId(messageClass, message))
  }
  return ids
}

// `'<class>:<message>'` -> the pair, or undefined if it is not that shape. Both
// halves must be plain non-negative integers: '0:6' yes, '0:6.5' and '0x0:6' no.
const parseId = (id: string): { messageClass: number, message: number } | undefined => {
  const [left, right, ...rest] = id.split(':')
  if (rest.length > 0) return undefined
  if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) return undefined
  return { messageClass: Number(left), message: Number(right) }
}

const unknownLog = (id: string, firmware: string, reason: string): { success: false, error: SBGError[] } =>
  ({ success: false, error: [{ kind: 'unknown-log', message: `${reason} (id ${JSON.stringify(id)}, firmware ${firmware})` }] })

/* What this parser believes a log looks like. Returned as an ARRAY for one reason:
   the shared contract is `Result<SentenceDefinition[], …>` because septentrio returns
   one entry per block revision. sbgECom has no revision concept (§2.1.1 gives no
   such field), so an sbg answer is always exactly one entry — the array is the
   contract's shape, not a hint that there could be more. */
export const describeSentence = (firmware: string, id: string): Result<SBGSentenceDefinition[], SBGError[]> => {
  const parsed = parseId(id)
  if (parsed === undefined) {
    return unknownLog(id, firmware, 'An eCom id is "<class>:<message>", both decimal integers — for example "0:6"')
  }
  const { messageClass, message } = parsed
  const logs = logsFor(firmware, messageClass)
  if (logs === undefined) {
    const known = [...classesFor(firmware).keys()].map((value) => `${value} (${CLASS_NAMES[value] ?? 'undocumented'})`)
    return unknownLog(id, firmware, `No log of message class ${messageClass} is modelled; modelled classes: ${known.join(', ')}`)
  }
  const definition = logs.get(message)
  if (definition === undefined) {
    return unknownLog(id, firmware, `Message ${message} is not modelled in class ${messageClass}`)
  }
  return { success: true, value: [describe(definition, messageClass, firmware)] }
}
